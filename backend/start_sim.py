import requests

def test():
    # Start network simulation
    res = requests.post('http://localhost:8000/api/simulate/network/start', json={"scenario": "ddos", "flows_per_second": 2.0})
    print(res.json())

test()
