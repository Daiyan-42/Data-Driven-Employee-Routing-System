"""
End-to-end test through the nginx proxy (localhost:80).
Tests that the full Docker Compose stack — frontend nginx + backend FastAPI —
is wired correctly.

Run with:
    python3 backend/test_docker_proxy.py
"""
import json
import urllib.request
import urllib.error
from datetime import date

BASE = "http://localhost"
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
SKIP = "\033[93m-\033[0m"


def req(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    r = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


def check(label, ok, detail=""):
    tag = PASS if ok else FAIL
    suffix = f"  [{detail}]" if detail else ""
    print(f"  {tag}  {label}{suffix}")
    return ok


# ── 1. Frontend ───────────────────────────────────────────────────────────────
print("\n── 1. Frontend (nginx serving React SPA) ────────────────────────────────")
r = urllib.request.Request(f"{BASE}/")
with urllib.request.urlopen(r, timeout=10) as resp:
    html = resp.read().decode()
    check("GET / → 200", resp.status == 200, f"HTTP {resp.status}")
    check("Returns HTML", "<!doctype html>" in html.lower() or "<html" in html.lower())

r = urllib.request.Request(f"{BASE}/employee/profile")
with urllib.request.urlopen(r, timeout=10) as resp:
    check("GET /employee/profile → 200 (SPA fallback)", resp.status == 200)

# ── 2. Backend health via /api proxy ─────────────────────────────────────────
print("\n── 2. Backend reachable via /api/* proxy ────────────────────────────────")
status, data = req("GET", "/api/")
check("GET /api/ → 200", status == 200, f"HTTP {status}")
check("{'status': 'ok'}", data.get("status") == "ok")

# ── 3. Login ──────────────────────────────────────────────────────────────────
print("\n── 3. POST /api/auth/login ──────────────────────────────────────────────")

# Pull real creds from Supabase
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))
os.chdir(os.path.dirname(__file__))
from app.database import supabase as sb

users = sb.table("users").select("email,password_hash,role").eq("role","Employee").eq("status","Active").limit(1).execute()
if not users.data:
    print(f"  {FAIL}  No active employee in DB — cannot test login")
    sys.exit(1)

u = users.data[0]
print(f"         Using: {u['email']}")

status, data = req("POST", "/api/auth/login", {"email": u["email"], "password": u["password_hash"]})
check("status 200", status == 200, f"HTTP {status}")
token = data.get("tokens", {}).get("access_token")
check("access_token present", bool(token))
check("role = Employee", data.get("user", {}).get("role") == "Employee")

# ── 4. Part 2 endpoints via proxy ─────────────────────────────────────────────
print("\n── 4. GET /api/employees/me ─────────────────────────────────────────────")
status, profile = req("GET", "/api/employees/me", token=token)
check("status 200", status == 200, f"HTTP {status}")
check("employee_id present", isinstance(profile.get("employee_id"), int))
check("home_lat/lng accessible", "home_lat" in profile)
print(f"         name={profile.get('name')}, home_lat={profile.get('home_lat')}")

print("\n── 5. PUT /api/employees/me ─────────────────────────────────────────────")
orig_lat = profile.get("home_lat")
orig_lng = profile.get("home_lng")
status, updated = req("PUT", "/api/employees/me", {"home_lat": 23.8759, "home_lng": 90.3795}, token=token)
check("status 200", status == 200, f"HTTP {status}")
check("home_lat updated", abs((updated.get("home_lat") or 0) - 23.8759) < 0.001)

# restore
if orig_lat and orig_lng:
    req("PUT", "/api/employees/me", {"home_lat": orig_lat, "home_lng": orig_lng}, token=token)
    print(f"         Restored: {orig_lat}, {orig_lng}")

print("\n── 6. GET /api/employees/me/schedule ────────────────────────────────────")
today = str(date.today())
status, sched = req("GET", f"/api/employees/me/schedule?service_date={today}", token=token)
check("status 200 (not 404)", status == 200, f"HTTP {status}")
check("routing_done field present", "routing_done" in sched)
if sched.get("routing_done"):
    check("stop.latitude present", sched.get("stop", {}).get("latitude") is not None)
    print(f"         routing_done=True, stop={sched.get('stop')}")
else:
    check("null fields graceful (routing not run yet)", sched.get("stop") is None)
    print(f"         routing_done=False — expected before routing runs")

print("\n── 7. Security ──────────────────────────────────────────────────────────")
for path in ["/api/employees/me", "/api/employees/me/schedule"]:
    status, _ = req("GET", path)
    check(f"{path} without token → 401", status == 401, f"HTTP {status}")

print("\n─────────────────────────────────────────────────────────────────────────")
print("All Docker Compose proxy tests complete.\n")
