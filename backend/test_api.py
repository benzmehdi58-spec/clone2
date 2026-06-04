import asyncio
import httpx
import json

async def main():
    async with httpx.AsyncClient() as client:
        # Get alerts
        res = await client.get('http://localhost:8000/api/alerts')
        alerts = res.json()
        if not alerts:
            print("No alerts")
            return
            
        print(f"Triggering analyze for alert {alerts[0]['id']}")
        payload = {
            "alert_id": alerts[0]['id'],
            "source": alerts[0]['source']
        }
        res2 = await client.post('http://localhost:8000/api/agent/analyze', json=payload, timeout=120)
        print("STATUS:", res2.status_code)
        print("RESPONSE:", json.dumps(res2.json(), indent=2))

asyncio.run(main())
