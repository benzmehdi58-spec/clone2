"""
Run this ONCE before starting the server.
Ingests MITRE ATT&CK + NVD CVEs into the ChromaDB vector store.

Usage: python build_knowledge_base.py
Time: ~10 minutes (NVD API is rate-limited)
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))

from rag_manager import rag_manager, ingest_nvd_cves

if __name__ == "__main__":
    print("=" * 50)
    print("CyberAI — Knowledge Base Builder")
    print("=" * 50)
    print("\n[1/2] MITRE ATT&CK already ingested via rag_manager init")
    print(f"  Chunks in DB: {rag_manager.db._collection.count()}")
    print("\n[2/2] Fetching NVD CVEs (this takes ~5-10 min)...")
    count = ingest_nvd_cves(rag_manager.db)
    print(f"\nDone. Total CVEs added: {count}")
    print(f"Total chunks in DB: {rag_manager.db._collection.count()}")
    print("\nKnowledge base is ready. Start the server normally.")
