import sqlite3
import json
from pathlib import Path
from typing import List, Dict, Any, Optional

DB_PATH = Path(__file__).parent / "cyberai.db"

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create Alerts table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            source TEXT,
            title TEXT,
            reason TEXT,
            severity TEXT,
            confidence REAL,
            reviewed BOOLEAN,
            mitre_technique TEXT,
            mitre_id TEXT,
            timestamp TEXT,
            raw_payload TEXT
        )
    """)
    
    # Create Incidents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS incidents (
            id TEXT PRIMARY KEY,
            title TEXT,
            severity TEXT,
            status TEXT,
            summary TEXT,
            report_markdown TEXT,
            created_at TEXT,
            mitre TEXT,
            raw_payload TEXT
        )
    """)
    
    # Create Analyst tables
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyst_chat_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT,
            question TEXT,
            answer TEXT,
            sources TEXT,
            grounded BOOLEAN,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS analyst_document_registry (
            filename TEXT PRIMARY KEY,
            doc_type TEXT,
            chunks INTEGER,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

def save_alert(alert_dict: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Convert booleans and complex types
    reviewed = 1 if alert_dict.get("reviewed") else 0
    raw_payload = json.dumps(alert_dict.get("raw_payload", alert_dict))
    
    # Ensure mitre is extracted properly if it exists
    mitre_tech = alert_dict.get("mitre_technique", alert_dict.get("mitre", {}).get("technique"))
    mitre_id = alert_dict.get("mitre_id", alert_dict.get("mitre", {}).get("technique_id"))
    
    cursor.execute("""
        INSERT OR REPLACE INTO alerts 
        (id, source, title, reason, severity, confidence, reviewed, mitre_technique, mitre_id, timestamp, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        alert_dict.get("id", alert_dict.get("block_id", "UNKNOWN")),
        alert_dict.get("source", "UNKNOWN"),
        alert_dict.get("title", ""),
        alert_dict.get("reason", alert_dict.get("preview", "")),
        alert_dict.get("severity", "warning"),
        float(alert_dict.get("confidence", 0.0)),
        reviewed,
        mitre_tech,
        mitre_id,
        alert_dict.get("time", alert_dict.get("timestamp", "")),
        raw_payload
    ))
    
    conn.commit()
    conn.close()

def get_alerts(filter_str: Optional[str] = None) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM alerts ORDER BY timestamp DESC"
    cursor.execute(query)
    rows = cursor.fetchall()
    conn.close()
    
    alerts = []
    for row in rows:
        a = dict(row)
        a["time"] = a["timestamp"]
        a["reviewed"] = bool(a["reviewed"])
        if a["raw_payload"]:
            try:
                a["raw_payload"] = json.loads(a["raw_payload"])
            except:
                pass
        
        # Apply filtering
        if filter_str and filter_str != "All":
            if filter_str == "Critical" and a.get("severity") != "critical":
                continue
            elif filter_str == "Network" and a.get("source") != "Network":
                continue
            elif filter_str == "System" and a.get("source") not in ("auth_log", "insider_threat"):
                continue
            elif filter_str == "SSH Auth" and a.get("source") != "auth_log":
                continue
            elif filter_str == "UEBA Insider" and a.get("source") != "insider_threat":
                continue
            elif filter_str == "Honeypot" and a.get("source") != "Honeypot":
                continue
            elif filter_str == "Unreviewed" and a.get("reviewed"):
                continue
                
        alerts.append(a)
        
    return alerts

def get_alert_by_id(alert_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM alerts WHERE id = ?", (alert_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    a = dict(row)
    a["reviewed"] = bool(a["reviewed"])
    if a["raw_payload"]:
        try:
            a["raw_payload"] = json.loads(a["raw_payload"])
        except:
            pass
    return a

def clear_alerts():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM alerts")
    conn.commit()
    conn.close()

def save_incident(incident_dict: Dict[str, Any]):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    raw_payload = json.dumps(incident_dict.get("raw_payload", {}))
    mitre_data = json.dumps(incident_dict.get("mitre", {}))
    
    cursor.execute("""
        INSERT OR REPLACE INTO incidents 
        (id, title, severity, status, summary, report_markdown, created_at, mitre, raw_payload)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        incident_dict.get("id"),
        incident_dict.get("title", ""),
        incident_dict.get("severity", ""),
        incident_dict.get("status", "open"),
        incident_dict.get("summary", ""),
        incident_dict.get("report_markdown", ""),
        incident_dict.get("created_at", incident_dict.get("timestamp", "")),
        mitre_data,
        raw_payload
    ))
    
    conn.commit()
    conn.close()

def get_incidents() -> Dict[str, Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    
    incidents = {}
    for row in rows:
        inc = dict(row)
        try:
            inc["mitre"] = json.loads(inc["mitre"]) if inc["mitre"] else {}
        except:
            inc["mitre"] = {}
            
        try:
            inc["raw_payload"] = json.loads(inc["raw_payload"]) if inc["raw_payload"] else {}
        except:
            inc["raw_payload"] = {}
            
        incidents[inc["id"]] = inc
        
    return incidents

def get_incident_by_id(incident_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incidents WHERE id = ?", (incident_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        return None
        
    inc = dict(row)
    try:
        inc["mitre"] = json.loads(inc["mitre"]) if inc["mitre"] else {}
    except:
        inc["mitre"] = {}
        
    try:
        inc["raw_payload"] = json.loads(inc["raw_payload"]) if inc["raw_payload"] else {}
    except:
        inc["raw_payload"] = {}
        
    return inc
