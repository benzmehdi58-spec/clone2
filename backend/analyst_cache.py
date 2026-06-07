import os
import hashlib
import json
from upstash_redis import Redis

def _get_api_keys():
    """Load API keys from keys.txt if available, else from environment variables."""
    keys = {}
    keys_path = os.path.join(os.path.dirname(__file__), "..", "keys.txt")
    if os.path.exists(keys_path):
        with open(keys_path, "r") as f:
            for line in f:
                if "=" in line:
                    k, v = line.strip().split("=", 1)
                    keys[k.strip()] = v.strip()
    return keys

def get_redis_client():
    keys = _get_api_keys()
    url = keys.get("UPSTASH_REDIS_REST_URL") or os.getenv("UPSTASH_REDIS_REST_URL")
    token = keys.get("UPSTASH_REDIS_REST_TOKEN") or os.getenv("UPSTASH_REDIS_REST_TOKEN")
    
    if not url or not token:
        return None
    return Redis(url=url, token=token)

def cache_key(question: str, top_k: int) -> str:
    raw = f"{top_k}:{question}"
    return "analyst_rag:" + hashlib.sha256(raw.encode()).hexdigest()

def get_cached(question: str, top_k: int) -> list | None:
    try:
        redis = get_redis_client()
        if not redis:
            return None
        
        key = cache_key(question, top_k)
        val = redis.get(key)
        if val:
            if isinstance(val, str):
                return json.loads(val)
            return val # upstash redis returns parsed dict if JSON
    except Exception as e:
        print(f"Redis get error: {e}")
    return None

def set_cached(question: str, top_k: int, chunks: list, ttl: int = 300):
    try:
        redis = get_redis_client()
        if not redis:
            return
            
        key = cache_key(question, top_k)
        redis.setex(key, ttl, json.dumps(chunks))
    except Exception as e:
        print(f"Redis set error: {e}")
