import httpx
import asyncio

async def test():
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post('http://localhost:8000/api/agent/analyze', json={'alert_id': 'AUTH-82.207.46.234', 'source': 'SSH'})
            print(resp.status_code)
            print(resp.text)
    except Exception as e:
        print(e)

asyncio.run(test())
