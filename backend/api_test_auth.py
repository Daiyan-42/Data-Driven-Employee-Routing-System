import json, urllib.request, urllib.error

login_url = 'http://127.0.0.1:8000/auth/login'
endpoints = ['http://127.0.0.1:8000/drivers/', 'http://127.0.0.1:8000/vehicles/']
creds = {'email': 'test@example.com', 'password': 'hashed123'}

try:
    data = json.dumps(creds).encode('utf-8')
    req = urllib.request.Request(login_url, data=data, headers={'Content-Type': 'application/json'}, method='POST')
    with urllib.request.urlopen(req, timeout=15) as r:
        print('LOGIN STATUS', r.status)
        body = r.read().decode('utf-8')
        print('LOGIN BODY', body)
        info = json.loads(body)
        token = info.get('tokens', {}).get('access_token')
except urllib.error.HTTPError as e:
    print('LOGIN HTTP', e.code)
    try:
        print(e.read().decode('utf-8'))
    except:
        pass
    token = None
except Exception as e:
    print('LOGIN ERROR', type(e).__name__, e)
    token = None

for ep in endpoints:
    try:
        headers = {}
        if token:
            headers['Authorization'] = f'Bearer {token}'
        req = urllib.request.Request(ep, headers=headers, method='GET')
        with urllib.request.urlopen(req, timeout=15) as r:
            print(ep, 'STATUS', r.status)
            print(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        print(ep, 'HTTP', e.code)
        try:
            print(e.read().decode('utf-8'))
        except:
            pass
    except Exception as e:
        print(ep, 'ERROR', type(e).__name__, e)
