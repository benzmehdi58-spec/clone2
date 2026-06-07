import sys
import os
sys.path.append('backend')
from analyst_store import delete_document
import sqlite3

try:
    print("Deleting from chroma...")
    delete_document('rapport_final_v14.pdf')
except Exception as e:
    print(e)
    
print("Deleting from SQLite...")
conn = sqlite3.connect('backend/cyberai.db')
conn.execute("DELETE FROM analyst_document_registry WHERE filename = 'rapport_final_v14.pdf'")
conn.commit()
conn.close()
print("Done!")
