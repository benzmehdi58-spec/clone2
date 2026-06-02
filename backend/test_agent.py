import asyncio
import httpx

async def main():
    payload = {
        "alert_id": "TEST-HDFS-001",
        "source":   "HDFS",
        "alert": {
            "prediction": "Anomaly",
            "confidence": 0.95,
            "block_id":   "blk_-1608999687919862906",
            "n_events":   14,
            "mitre": {
                "tactic":           "Impact",
                "tactic_id":        "TA0040",
                "technique":        "Data Destruction",
                "technique_id":     "T1485",
                "kill_chain_stage": 7,
                "kill_chain_name":  "Actions on Objectives",
                "severity":         "critical",
                "description":      "High-confidence HDFS anomaly — abnormal block replication pattern."
            }
        }
    }
    async with httpx.AsyncClient() as client:
        res = await client.post("http://127.0.0.1:8000/api/agent/analyze", json=payload, timeout=90.0)
        print("Status:", res.status_code)
        import json
        print("Response:", json.dumps(res.json(), indent=2))

if __name__ == "__main__":
    asyncio.run(main())
