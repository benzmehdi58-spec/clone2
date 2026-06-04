import asyncio
import sys
from agent_router import call_llm

async def main():
    try:
        msg = await call_llm([{"role": "user", "content": "Hello, are you working?"}])
        print(msg)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(main())
