import os
import time
import json
import asyncio
from typing import Dict, Any

HONEYPOT_LOG_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "live_honeypot.log")

async def tail_honeypot(app_state: Dict[str, Any]):
    print("[HONEYPOT] Starting honeypot tailer...")
    
    if not os.path.exists(HONEYPOT_LOG_PATH):
        # Create it if it doesn't exist
        os.makedirs(os.path.dirname(HONEYPOT_LOG_PATH), exist_ok=True)
        with open(HONEYPOT_LOG_PATH, "w") as f:
            pass

    # Basic tail -f simulation
    with open(HONEYPOT_LOG_PATH, "r") as f:
        f.seek(0, 2) # go to end
        while True:
            line = f.readline()
            if not line:
                await asyncio.sleep(1)
                continue
            
            line = line.strip()
            if not line:
                continue
                
            print(f"[HONEYPOT] New event: {line}")
            # Try to parse JSON log line
            try:
                data = json.loads(line)
                alert = {
                    "id": f"HP-{int(time.time()*1000)}",
                    "source": "Honeypot",
                    "time": "Real-time",
                    "title": "Honeypot Intrusion Detected",
                    "reason": f"Connection from {data.get('src_ip', 'unknown')} to port {data.get('dst_port', 'unknown')}",
                    "severity": "critical",
                    "confidence": 99.0,
                    "reviewed": False,
                    "timestamp_epoch": time.time(),
                    "raw": line,
                    "attack_type": data.get("attack_type", "bruteforce"),
                    "mitre": {
                        "technique": data.get("mitre_technique", "Valid Accounts"),
                        "technique_id": data.get("mitre_id", "T1078")
                    }
                }
                app_state.setdefault("alert_buffer", []).append(alert)
                
            except json.JSONDecodeError:
                print(f"[HONEYPOT] Failed to parse JSON: {line}")
