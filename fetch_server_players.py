import requests

try:
    res = requests.get('http://37.32.36.252/api/admin/players/', timeout=10)
    data = res.json()
    print("Admin count:", data.get('count'))
except Exception as e:
    pass

try:
    res = requests.get('http://37.32.36.252/api/players/', timeout=10)
    data = res.json()
    print("Public count:", data.get('count'))
except Exception as e:
    pass
