import os
import json
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Request
from fastapi.responses import StreamingResponse, JSONResponse
import urllib.parse

from analyst_store import ingest_document, retrieve_context, delete_document, list_documents
from analyst_cache import get_cached, set_cached
from analyst_chat import classify_and_rewrite, stream_answer
from database import get_db_connection

router = APIRouter(prefix="/api/analyst", tags=["analyst-chatbot"])

def _get_history(session_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT question, answer FROM analyst_chat_history WHERE session_id = ? ORDER BY timestamp ASC LIMIT 6", (session_id,))
    rows = cursor.fetchall()
    conn.close()
    
    history = []
    for r in rows:
        history.append({"is_user": True, "content": r["question"]})
        history.append({"is_user": False, "content": r["answer"]})
    return history

def _save_history(session_id: str, question: str, answer: str, sources: list, grounded: bool):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO analyst_chat_history (session_id, question, answer, sources, grounded)
        VALUES (?, ?, ?, ?, ?)
    """, (session_id, question, answer, json.dumps(sources), grounded))
    conn.commit()
    conn.close()

@router.post("/upload")
async def upload_document(file: UploadFile = File(...), doc_type: str = Form("general")):
    filename = file.filename
    ext = filename.lower().split(".")[-1] if "." in filename else ""
    if ext not in ["pdf", "txt", "md"]:
        raise HTTPException(status_code=400, detail="Only .pdf, .txt, and .md files are supported.")
        
    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File size exceeds 10 MB limit.")
        
    result = ingest_document(filename, doc_type, file_bytes)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO analyst_document_registry (filename, doc_type, chunks)
        VALUES (?, ?, ?)
    """, (filename, doc_type, result["chunks_inserted"]))
    conn.commit()
    conn.close()
    
    return {"success": True, "filename": filename, "chunks_inserted": result["chunks_inserted"]}

@router.get("/documents")
async def get_documents():
    return list_documents()

@router.delete("/documents/{filename:path}")
async def remove_document(filename: str):
    filename = urllib.parse.unquote(filename)
    result = delete_document(filename)
    
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM analyst_document_registry WHERE filename = ?", (filename,))
    conn.commit()
    conn.close()
    
    return {"success": True, "deleted_chunks": result["deleted"]}

@router.get("/history")
async def get_all_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM analyst_chat_history ORDER BY timestamp DESC LIMIT 50")
    rows = cursor.fetchall()
    conn.close()
    
    ret = []
    for r in rows:
        item = dict(r)
        item["grounded"] = bool(item["grounded"])
        try:
            item["sources"] = json.loads(item["sources"]) if item["sources"] else []
        except:
            item["sources"] = []
        ret.append(item)
    return ret

@router.post("/chat/stream")
@router.get("/chat/stream") # Support GET for simple EventSource, POST for Vercel fallback
async def chat_stream(request: Request, question: str = None, top_k: int = 5, session_id: str = "default"):
    # If POST, question might be in body
    if request.method == "POST":
        try:
            body = await request.json()
            question = body.get("question", question)
            top_k = body.get("top_k", top_k)
            session_id = body.get("session_id", session_id)
        except:
            pass

    if not question or len(question) > 1000:
        raise HTTPException(status_code=400, detail="Question is required and must be under 1000 characters.")
        
    is_vercel = os.environ.get("VERCEL") is not None
    
    # Intent + Rewrite
    intel = await classify_and_rewrite(question)
    intent = intel["intent"]
    rewritten_query = intel["rewritten_query"]
    follow_ups = intel["follow_up_questions"]
    
    history = _get_history(session_id)
    
    async def event_generator():
        if intent == "greeting":
            ans = "Hello! I am the CyberAI Security Analyst Assistant. How can I help you analyze your documents today?"
            yield f'data: {{"type": "token", "content": "{ans}"}}\n\n'
            yield f'data: {{"type": "sources", "sources": [], "follow_up_questions": []}}\n\n'
            yield 'data: {"type": "done"}\n\n'
            _save_history(session_id, question, ans, [], True)
            return
            
        if intent == "other":
            ans = "I am a security analyst assistant focused strictly on answering questions from the uploaded knowledge base documents. I cannot answer general knowledge questions."
            yield f'data: {{"type": "token", "content": "{ans}"}}\n\n'
            yield f'data: {{"type": "sources", "sources": [], "follow_up_questions": []}}\n\n'
            yield 'data: {"type": "done"}\n\n'
            _save_history(session_id, question, ans, [], False)
            return
            
        # RAG intent
        chunks = get_cached(rewritten_query, top_k)
        max_sim = 1.0
        
        if chunks is None:
            retrieval = await retrieve_context(rewritten_query, top_k)
            chunks = retrieval["chunks"]
            max_sim = retrieval["max_similarity"]
            set_cached(rewritten_query, top_k, chunks)
            
        if max_sim < 0.35 or len(chunks) == 0:
            ans = "I could not find relevant information in the uploaded documents to answer this question. Please upload relevant documents or rephrase your question."
            yield f'data: {{"type": "token", "content": "{ans}"}}\n\n'
            yield f'data: {{"type": "sources", "sources": [], "follow_up_questions": []}}\n\n'
            yield 'data: {"type": "done"}\n\n'
            _save_history(session_id, question, ans, [], False)
            return
            
        sources = [{
            "filename": c["filename"],
            "doc_type": c["doc_type"],
            "similarity": c["similarity"],
            "snippet": c["snippet"]
        } for c in chunks]
        
        full_answer = ""
        async for token in stream_answer(question, chunks, history):
            full_answer += token
            escaped = json.dumps(token)
            yield f'data: {{"type": "token", "content": {escaped}}}\n\n'
            
        yield f'data: {{"type": "sources", "sources": {json.dumps(sources)}, "follow_up_questions": {json.dumps(follow_ups)}}}\n\n'
        yield 'data: {"type": "done"}\n\n'
        _save_history(session_id, question, full_answer, sources, True)

    if is_vercel:
        # Vercel Serverless environment: we cannot stream indefinitely using SSE.
        # We will collect the response and return JSON.
        if intent == "greeting":
            ans = "Hello! I am the CyberAI Security Analyst Assistant. How can I help you analyze your documents today?"
            _save_history(session_id, question, ans, [], True)
            return JSONResponse({"answer": ans, "sources": [], "follow_up_questions": [], "grounded": True})
            
        if intent == "other":
            ans = "I am a security analyst assistant focused strictly on answering questions from the uploaded knowledge base documents. I cannot answer general knowledge questions."
            _save_history(session_id, question, ans, [], False)
            return JSONResponse({"answer": ans, "sources": [], "follow_up_questions": [], "grounded": False})
            
        chunks = get_cached(rewritten_query, top_k)
        max_sim = 1.0
        
        if chunks is None:
            retrieval = await retrieve_context(rewritten_query, top_k)
            chunks = retrieval["chunks"]
            max_sim = retrieval["max_similarity"]
            set_cached(rewritten_query, top_k, chunks)
            
        if max_sim < 0.35 or len(chunks) == 0:
            ans = "I could not find relevant information in the uploaded documents to answer this question. Please upload relevant documents or rephrase your question."
            _save_history(session_id, question, ans, [], False)
            return JSONResponse({"answer": ans, "sources": [], "follow_up_questions": [], "grounded": False})
            
        sources = [{
            "filename": c["filename"],
            "doc_type": c["doc_type"],
            "similarity": c["similarity"],
            "snippet": c["snippet"]
        } for c in chunks]
        
        full_answer = ""
        async for token in stream_answer(question, chunks, history):
            full_answer += token
            
        _save_history(session_id, question, full_answer, sources, True)
        return JSONResponse({"answer": full_answer, "sources": sources, "follow_up_questions": follow_ups, "grounded": True})
        
    return StreamingResponse(event_generator(), media_type="text/event-stream")
