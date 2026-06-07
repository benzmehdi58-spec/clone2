import os
import sys
import types
import importlib.machinery

# Mock onnxruntime to bypass DLL load failure on Windows/older CPUs
# because we use sentence-transformers for embeddings instead of default ONNX.
try:
    import onnxruntime
except BaseException:
    mock_ort = types.ModuleType("onnxruntime")
    mock_ort.InferenceSession = object
    mock_ort.SessionOptions = object
    mock_ort.__spec__ = importlib.machinery.ModuleSpec(name="onnxruntime", loader=None)
    sys.modules["onnxruntime"] = mock_ort

os.environ["TRANSFORMERS_CACHE"] = "/tmp/st_cache"

import io
import asyncio
import hashlib
import sqlite3
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from rank_bm25 import BM25Okapi
import pdfminer.high_level

from database import get_db_connection

from chromadb.utils import embedding_functions

# Initialize embeddings model
embedder = SentenceTransformer("all-MiniLM-L6-v2")
chroma_ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")

# Initialize ChromaDB client
chroma_path = os.path.join(os.path.dirname(__file__), "analyst_chroma_db")
if os.access(os.path.dirname(__file__), os.W_OK):
    os.makedirs(chroma_path, exist_ok=True)
    chroma_client = chromadb.PersistentClient(path=chroma_path)
else:
    chroma_client = chromadb.EphemeralClient()

collection = chroma_client.get_or_create_collection(
    name="analyst_documents",
    embedding_function=chroma_ef,
    metadata={"hnsw:space": "cosine"}
)

# In-memory BM25 index
bm25_index: Optional[BM25Okapi] = None
bm25_corpus: List[Dict[str, Any]] = []

def _rebuild_bm25():
    global bm25_index, bm25_corpus
    results = collection.get(include=["documents", "metadatas"])
    if not results or not results["documents"]:
        bm25_index = None
        bm25_corpus = []
        return

    bm25_corpus = []
    tokenized_corpus = []
    
    for i in range(len(results["documents"])):
        doc_text = results["documents"][i]
        meta = results["metadatas"][i]
        bm25_corpus.append({
            "content": doc_text,
            "metadata": meta
        })
        tokenized_corpus.append(doc_text.lower().split())
        
    if tokenized_corpus:
        bm25_index = BM25Okapi(tokenized_corpus)

# Initial BM25 build
_rebuild_bm25()

def chunk_text(text: str, chunk_size: int = 500, overlap: int = 60) -> List[str]:
    # Very basic sentence-aware chunker
    sentences = [s.strip() + "." for s in text.replace("\n", " ").split(".") if s.strip()]
    chunks = []
    current_chunk = ""
    
    for sentence in sentences:
        if len(current_chunk) + len(sentence) <= chunk_size:
            current_chunk += " " + sentence
        else:
            if len(current_chunk) >= 80:
                chunks.append(current_chunk.strip())
            # Start new chunk with overlap (if possible, just keep the last sentence)
            current_chunk = sentence
            
    if len(current_chunk) >= 80:
        chunks.append(current_chunk.strip())
        
    return chunks

def ingest_document(filename: str, doc_type: str, file_bytes: bytes) -> Dict[str, Any]:
    text = ""
    if filename.lower().endswith(".pdf"):
        text = pdfminer.high_level.extract_text(io.BytesIO(file_bytes))
    else:
        text = file_bytes.decode("utf-8", errors="replace")
        
    chunks = chunk_text(text)
    if not chunks:
        return {"filename": filename, "chunks_inserted": 0}
        
    embeddings = embedder.encode(chunks, batch_size=32).tolist()
    
    ids = [f"{filename}__chunk_{i}" for i in range(len(chunks))]
    metadatas = [{"filename": filename, "doc_type": doc_type, "chunk_index": i, "raw_text": chunks[i]} for i in range(len(chunks))]
    
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        metadatas=metadatas,
        ids=ids
    )
    
    _rebuild_bm25()
    return {"filename": filename, "chunks_inserted": len(chunks)}

async def retrieve_context(question: str, top_k: int = 5) -> Dict[str, Any]:
    global bm25_index, bm25_corpus
    
    # 1. Semantic search
    q_emb = embedder.encode([question]).tolist()[0]
    semantic_results = collection.query(
        query_embeddings=[q_emb],
        n_results=top_k * 2,
        include=["documents", "metadatas", "distances"]
    )
    
    semantic_matches = []
    if semantic_results and semantic_results["documents"] and len(semantic_results["documents"]) > 0:
        docs = semantic_results["documents"][0]
        metas = semantic_results["metadatas"][0]
        dists = semantic_results["distances"][0]
        
        for i in range(len(docs)):
            semantic_matches.append({
                "content": docs[i],
                "metadata": metas[i],
                "score": 1.0 - dists[i] # Convert distance to similarity
            })
            
    # 2. Keyword search
    keyword_matches = []
    if bm25_index and bm25_corpus:
        tokenized_q = question.lower().split()
        bm25_scores = bm25_index.get_scores(tokenized_q)
        # get top_k * 2
        top_indices = sorted(range(len(bm25_scores)), key=lambda i: bm25_scores[i], reverse=True)[:top_k*2]
        
        for idx in top_indices:
            if bm25_scores[idx] > 0:
                keyword_matches.append({
                    "content": bm25_corpus[idx]["content"],
                    "metadata": bm25_corpus[idx]["metadata"],
                    "score": bm25_scores[idx]
                })

    # 3. Reciprocal Rank Fusion
    rrf_scores = {}
    chunk_map = {}
    
    def hash_chunk(content):
        return hashlib.md5(content.encode()).hexdigest()
        
    for rank, match in enumerate(semantic_matches):
        h = hash_chunk(match["content"])
        chunk_map[h] = match
        rrf_scores[h] = rrf_scores.get(h, 0.0) + 1.0 / (60 + rank + 1)
        
    for rank, match in enumerate(keyword_matches):
        h = hash_chunk(match["content"])
        chunk_map[h] = match
        rrf_scores[h] = rrf_scores.get(h, 0.0) + 1.0 / (60 + rank + 1)
        
    # Sort by RRF score
    sorted_chunks = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)[:top_k]
    
    final_results = []
    max_sim = 0.0
    for h, rrf_score in sorted_chunks:
        match = chunk_map[h]
        # if from semantic, use that score, else 0.0 for max_sim checks
        sim_score = match["score"] if match in semantic_matches else 0.5 
        max_sim = max(max_sim, sim_score)
        
        final_results.append({
            "content": match["content"],
            "filename": match["metadata"]["filename"],
            "doc_type": match["metadata"]["doc_type"],
            "chunk_index": match["metadata"]["chunk_index"],
            "snippet": match["content"][:200],
            "similarity": sim_score
        })
        
    return {
        "chunks": final_results,
        "max_similarity": float(max_sim)
    }

def delete_document(filename: str) -> Dict[str, Any]:
    # ChromaDB doesn't easily delete by metadata in all versions natively without a where clause, 
    # but .delete(where={"filename": filename}) is supported in recent versions
    collection.delete(where={"filename": filename})
    _rebuild_bm25()
    return {"deleted": 1}

def list_documents() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analyst_document_registry ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]
