import requests

def test():
    # 1. Fetch alerts
    res = requests.get('http://localhost:8000/api/alerts')
    alerts = res.json()
    print(f"Total alerts: {len(alerts)}")
    
    if not alerts:
        print("No alerts found.")
        return
        
    for a in alerts[:5]:
        print(f"Alert ID: {a['id']}, Source: {a['source']}, Title: {a['title']}")
        
test()
