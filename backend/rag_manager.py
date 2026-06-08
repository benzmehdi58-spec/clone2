import os
import json
from pathlib import Path
from langchain_community.vectorstores import Chroma
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_core.documents import Document

BASE_DIR = Path(__file__).parent
CHROMA_DIR = BASE_DIR / "chroma_db"
MITRE_JSON = BASE_DIR / "enterprise-attack.json"

class RagManager:
    def __init__(self):
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.db = None
        self.initialize_db()

    def initialize_db(self):
        from chromadb.config import Settings
        settings = Settings(anonymized_telemetry=False)
        if CHROMA_DIR.exists():
            self.db = Chroma(persist_directory=str(CHROMA_DIR), embedding_function=self.embeddings, client_settings=settings)
        else:
            self.db = Chroma(persist_directory=str(CHROMA_DIR), embedding_function=self.embeddings, client_settings=settings)
            if MITRE_JSON.exists():
                self.ingest_mitre_data()

    def ingest_mitre_data(self):
        print("[RAG] Ingesting MITRE ATT&CK JSON data into ChromaDB...")
        with open(MITRE_JSON, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        objects = data.get("objects", [])
        
        # Build lookup dicts
        attack_patterns = {}
        courses_of_action = {}
        relationships = []
        
        for obj in objects:
            if obj["type"] == "attack-pattern":
                tid = None
                for ext in obj.get("external_references", []):
                    if ext.get("source_name") == "mitre-attack":
                        tid = ext.get("external_id")
                        break
                attack_patterns[obj["id"]] = {
                    "name": obj.get("name", ""),
                    "description": obj.get("description", ""),
                    "tid": tid
                }
            elif obj["type"] == "course-of-action":
                courses_of_action[obj["id"]] = {
                    "name": obj.get("name", ""),
                    "description": obj.get("description", "")
                }
            elif obj["type"] == "relationship" and obj.get("relationship_type") == "mitigates":
                relationships.append(obj)
                
        # Group mitigations by technique
        technique_mitigations = {}
        for rel in relationships:
            src = rel["source_ref"]
            tgt = rel["target_ref"]
            if src in courses_of_action and tgt in attack_patterns:
                if tgt not in technique_mitigations:
                    technique_mitigations[tgt] = []
                technique_mitigations[tgt].append(courses_of_action[src])
                
        docs = []
        for tgt_id, mitigations in technique_mitigations.items():
            pattern = attack_patterns[tgt_id]
            tid = pattern["tid"]
            name = pattern["name"]
            
            content = f"Technique: {name} ({tid})\n\n"
            content += f"Description: {pattern['description']}\n\n"
            content += "Mitigations:\n"
            for m in mitigations:
                content += f"- {m['name']}: {m['description']}\n"
                
            docs.append(Document(
                page_content=content,
                metadata={"tid": tid if tid else "unknown", "name": name, "type": "mitre_technique"}
            ))
            
        if docs:
            # Add to ChromaDB in batches to prevent memory/timeout issues
            batch_size = 100
            for i in range(0, len(docs), batch_size):
                batch = docs[i:i+batch_size]
                self.db.add_documents(batch)
        print(f"[RAG] Successfully ingested {len(docs)} MITRE ATT&CK techniques with mitigations.")

    def retrieve_context(self, query: str, top_k: int = 3) -> str:
        if not self.db:
            return ""
        results = self.db.similarity_search(query, k=top_k)
        context = ""
        for res in results:
            context += res.page_content + "\n\n---\n\n"
        return context

try:
    rag_manager = RagManager()
except Exception as e:
    print(f"[RAG] Failed to initialize RagManager: {e}")
    rag_manager = None
