import asyncio
import httpx
import json

async def analyze_alert(payload):
    print(f"\\n--- Testing {payload['source']} ---")
    async with httpx.AsyncClient() as client:
        try:
            res = await client.post("http://127.0.0.1:8000/api/agent/analyze", json=payload, timeout=120.0)
            print("Status:", res.status_code)
            if res.status_code == 200:
                print("Incident Report generated!")
                print(json.dumps(res.json(), indent=2))
            else:
                print("Error:", res.text)
        except Exception as e:
            print("Exception:", e)

async def main():
    ssh_payload = {
        "alert_id": "AUTH-103.207.39.154",
        "source":   "auth_log",
        "alert": {
            "prediction": "Anomaly",
            "verdict": "ATTACK",
            "attack_type": "bruteforce",
            "confidence": 84.87,
            "src_ip": "103.207.39.154",
            "mitre": {
                "tactic": "Credential Access",
                "tactic_id": "TA0006",
                "technique": "Brute Force",
                "technique_id": "T1110",
                "kill_chain_stage": 4,
                "kill_chain_name": "Exploitation"
            }
        }
    }
    
    ueba_payload = {
        "alert_id": "UEBA-DIB0285",
        "source":   "insider_threat",
        "alert": {
            "prediction": "Insider Threat",
            "verdict": "ATTACK",
            "attack_type": "insider_threat",
            "confidence": 94.21,
            "user_id": "DIB0285",
            "mitre": {
                "tactic": "Exfiltration",
                "tactic_id": "TA0010",
                "technique": "Exfiltration Over Alternative Protocol",
                "technique_id": "T1048",
                "kill_chain_stage": 7,
                "kill_chain_name": "Actions on Objectives"
            }
        }
    }

    # Test SSH first
    await analyze_alert(ssh_payload)
    
    # Test UEBA
    await analyze_alert(ueba_payload)

if __name__ == "__main__":
    asyncio.run(main())
