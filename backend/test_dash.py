import requests
try:
    print(requests.get('http://localhost:8000/api/dashboard', timeout=2).json())
except Exception as e:
    print(e)
