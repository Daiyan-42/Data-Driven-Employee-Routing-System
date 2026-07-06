from jose import jwt
import urllib.request, urllib.error, json

# Create an Admin JWT matching require_admin expectations
secret = 'writeSomething'
alg = 'HS256'
payload = {'user_id': 1, 'role': 'Admin', 'name': 'Local Admin'}
token = jwt.encode(payload, secret, algorithm=alg)
print('GENERATED_TOKEN', token)

headers = {'Authorization': f'Bearer {token}'}
for ep in ['http://127.0.0.1:8000/drivers/', 'http://127.0.0.1:8000/vehicles/']:
    try:
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
