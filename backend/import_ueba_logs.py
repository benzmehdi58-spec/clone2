import json
import sqlite3
import pandas as pd
from pathlib import Path
import os
from tqdm import tqdm

DB_PATH = Path("cyberai.db")
CSVS_PATH = Path("../inference for inseder threat detector/")
RESULTS_PATH = Path("data/ueba_inference_results.json")

def init_ueba_tables(cursor):
    # Unified table for all UEBA logs to make it easy for LLM
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ueba_logs (
            id TEXT PRIMARY KEY,
            date TEXT,
            user TEXT,
            pc TEXT,
            log_type TEXT,
            activity TEXT,
            filename TEXT,
            url TEXT,
            email_to TEXT,
            email_from TEXT,
            content TEXT
        )
    """)
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ueba_user ON ueba_logs(user)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_ueba_date ON ueba_logs(date)")

def main():
    if not RESULTS_PATH.exists():
        print(f"Error: {RESULTS_PATH} not found.")
        return

    with open(RESULTS_PATH, "r") as f:
        results = json.load(f)
    
    # Extract ALL unique users from the results
    target_users = set(d["user_id"] for d in results)
    print(f"Loaded {len(target_users)} target users from inference results.")

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    init_ueba_tables(cursor)
    conn.commit()

    files_to_process = {
        "device_inference_raw.csv": "device",
        "email_inference_raw.csv": "email",
        "file_inference_raw.csv": "file",
        "http_inference_raw.csv": "http",
        "logon_inference_raw.csv": "logon"
    }

    for filename, log_type in files_to_process.items():
        file_path = CSVS_PATH / filename
        if not file_path.exists():
            print(f"Warning: {file_path} not found.")
            continue
            
        print(f"Processing {filename}...")
        
        chunk_size = 100000
        total_inserted = 0
        
        try:
            for chunk in pd.read_csv(file_path, chunksize=chunk_size):
                # Filter chunk for target users
                filtered = chunk[chunk['user'].isin(target_users)]
                if filtered.empty:
                    continue
                    
                # Standardize columns based on log_type
                records = []
                for _, row in filtered.iterrows():
                    r = {
                        "id": row.get("id"),
                        "date": row.get("date"),
                        "user": row.get("user"),
                        "pc": row.get("pc"),
                        "log_type": log_type,
                        "activity": row.get("activity") if pd.notna(row.get("activity")) else None,
                        "filename": row.get("filename") if pd.notna(row.get("filename")) else None,
                        "url": row.get("url") if pd.notna(row.get("url")) else None,
                        "email_to": row.get("to") if pd.notna(row.get("to")) else None,
                        "email_from": row.get("from") if pd.notna(row.get("from")) else None,
                        "content": row.get("content") if pd.notna(row.get("content")) else None
                    }
                    # Truncate content if too large (some HTTP contents are huge)
                    if r["content"] and len(str(r["content"])) > 500:
                        r["content"] = str(r["content"])[:500] + "..."
                        
                    records.append((
                        r["id"], r["date"], r["user"], r["pc"], r["log_type"], 
                        r["activity"], r["filename"], r["url"], r["email_to"], 
                        r["email_from"], r["content"]
                    ))
                
                cursor.executemany("""
                    INSERT OR IGNORE INTO ueba_logs 
                    (id, date, user, pc, log_type, activity, filename, url, email_to, email_from, content)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, records)
                
                total_inserted += len(records)
                conn.commit()
                
            print(f"  -> Inserted {total_inserted} records for {log_type}.")
        except Exception as e:
            print(f"Error processing {filename}: {e}")

    conn.close()
    print("Done!")

if __name__ == "__main__":
    main()
