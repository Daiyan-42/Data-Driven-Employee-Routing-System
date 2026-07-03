import json, urllib.request, urllib.error
urls = ['http://127.0.0.1:8000/', 'http://127.0.0.1:8000/drivers/', 'http://127.0.0.1:8000/vehicles/']
for u in urls:
    try:
        r = urllib.request.urlopen(u, timeout=10)
        print(u, r.status)
        print(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(u, 'HTTP', e.code)
        print(e.read().decode('utf-8'))
    except Exception as e:
        print(u, 'ERROR', type(e).__name__, e)

try:
    login_data = json.dumps({'email': 'admin@example.com', 'password': 'your-password'}).encode('utf-8')
    req = urllib.request.Request('http://127.0.0.1:8000/auth/login', data=login_data, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=15) as r:
        print('LOGIN', r.status)
        print(r.read().decode('utf-8'))
except urllib.error.HTTPError as e:
    print('LOGIN HTTP', e.code)
    print(e.read().decode('utf-8'))
except Exception as e:
    print('LOGIN ERROR', type(e).__name__, e)
