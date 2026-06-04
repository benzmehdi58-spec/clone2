import os
import requests
from pathlib import Path

BASE_DIR = Path(__file__).parent

def get_keys():
    keys = {}
    
    # Read from keys.txt in the root directory
    keys_file = BASE_DIR.parent / "keys.txt"
    if keys_file.exists():
        with open(keys_file, "r") as f:
            for line in f:
                if "=" in line:
                    k, v = line.split("=", 1)
                    keys[k.strip()] = v.strip()
                    
    # Anthropic key might be in environment or keys.txt
    if "ANTHROPIC_API_KEY" not in keys and os.environ.get("ANTHROPIC_API_KEY"):
        keys["ANTHROPIC_API_KEY"] = os.environ.get("ANTHROPIC_API_KEY")
        
    return keys

def test_groq(api_key):
    url = "https://api.groq.com/openai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": "llama-3.3-70b-versatile", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5}
    res = requests.post(url, headers=headers, json=payload)
    return res

def test_cerebras(api_key):
    url = "https://api.cerebras.ai/v1/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": "llama-3.3-70b", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5}
    res = requests.post(url, headers=headers, json=payload)
    return res

def test_gemini(api_key):
    # Testing via OpenAI compatibility layer like agent_router.py
    url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
    payload = {"model": "gemini-2.0-flash", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5}
    res = requests.post(url, headers=headers, json=payload)
    return res

def test_anthropic(api_key):
    url = "https://api.anthropic.com/v1/messages"
    headers = {
        "x-api-key": api_key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json"
    }
    payload = {"model": "claude-3-haiku-20240307", "messages": [{"role": "user", "content": "hi"}], "max_tokens": 5}
    res = requests.post(url, headers=headers, json=payload)
    return res

def print_result(name, res):
    if res.status_code == 200:
        print(f"[OK] {name}: WORKING")
    elif res.status_code == 401 or res.status_code == 403:
        print(f"[FAIL] {name}: UNAUTHORIZED (Invalid Key)")
    elif res.status_code == 429:
        print(f"[LIMIT] {name}: RATE LIMITED (Out of credits or too many requests)")
    else:
        print(f"[ERROR] {name}: ERROR {res.status_code} - {res.text}")

if __name__ == "__main__":
    print("Testing API Keys...")
    keys = get_keys()
    
    if "GROQ_API_KEY" in keys:
        print_result("Groq", test_groq(keys["GROQ_API_KEY"]))
    else:
        print("[SKIP] Groq: Key not found")
        
    if "CEREBRAS_API_KEY" in keys:
        print_result("Cerebras", test_cerebras(keys["CEREBRAS_API_KEY"]))
    else:
        print("[SKIP] Cerebras: Key not found")
        
    if "GEMINI_API_KEY" in keys:
        print_result("Gemini", test_gemini(keys["GEMINI_API_KEY"]))
    else:
        print("[SKIP] Gemini: Key not found")
        
    if "ANTHROPIC_API_KEY" in keys:
        print_result("Anthropic", test_anthropic(keys["ANTHROPIC_API_KEY"]))
    else:
        print("[SKIP] Anthropic: Key not found (Not required unless you run RAGAnalyzer)")
