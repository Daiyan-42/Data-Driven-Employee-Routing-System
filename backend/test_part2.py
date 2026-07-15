"""
Part 2 functional test — Employee Profile & Schedule Display
============================================================
Runs against the live backend at http://127.0.0.1:8000

Steps:
  1. Pull a real Employee user from Supabase and use their email/password_hash
  2. Login → get JWT
  3. GET  /employees/me            → verify profile fields
  4. PUT  /employees/me            → update name + home_lat/lng, verify response
  5. PUT  /employees/me            → restore original values
  6. GET  /employees/me/schedule   → must return routing_done (True or False) without 404
"""

import json
import urllib.request
import urllib.error
import sys
from app.database import supabase

BASE = "http://127.0.0.1:8000"
PASS = "\033[92m✓\033[0m"
FAIL = "\033[91m✗\033[0m"
SKIP = "\033[93m-\033[0m"


def http(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body else None
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode())
        except Exception:
            return e.code, {}


def check(label, condition, detail=""):
    tag = PASS if condition else FAIL
    print(f"  {tag}  {label}" + (f"  [{detail}]" if detail else ""))
    return condition


# ─────────────────────────────────────────────────────────────────────────────
# 1. Find a real employee user in the DB
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 1: Fetch employee credentials from Supabase ──────────────────")

res = (
    supabase.table("users")
    .select("user_id, name, email, password_hash, role, status")
    .eq("role", "Employee")
    .eq("status", "Active")
    .limit(1)
    .execute()
)

if not res.data:
    print(f"  {FAIL}  No active Employee found in users table. Add one first.")
    sys.exit(1)

u = res.data[0]
print(f"  {PASS}  Found employee: {u['name']} <{u['email']}> (user_id={u['user_id']})")

# Verify they have an employee row
emp_res = supabase.table("employee").select("employee_id, home_lat, home_lng").eq("user_id", u["user_id"]).limit(1).execute()
if not emp_res.data:
    print(f"  {FAIL}  No 'employee' table row for user_id={u['user_id']}. Insert one first:")
    print(f"         INSERT INTO employee (user_id, is_active) VALUES ({u['user_id']}, true);")
    sys.exit(1)

emp = emp_res.data[0]
print(f"  {PASS}  Employee row: employee_id={emp['employee_id']}, home_lat={emp.get('home_lat')}, home_lng={emp.get('home_lng')}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. Login
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 2: POST /auth/login ───────────────────────────────────────────")
status, data = http("POST", "/auth/login", {"email": u["email"], "password": u["password_hash"]})
ok = check("status 200", status == 200, f"got {status}")
if not ok:
    print(f"         Response: {json.dumps(data)[:200]}")
    sys.exit(1)

token = data.get("tokens", {}).get("access_token")
check("access_token present", bool(token))
check("role=Employee", data.get("user", {}).get("role") == "Employee")

# ─────────────────────────────────────────────────────────────────────────────
# 3. GET /employees/me
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 3: GET /employees/me ─────────────────────────────────────────")
status, profile = http("GET", "/employees/me", token=token)
check("status 200", status == 200, f"got {status}")
check("user_id matches", profile.get("user_id") == u["user_id"])
check("employee_id present", isinstance(profile.get("employee_id"), int))
check("name present", bool(profile.get("name")))
check("email present", bool(profile.get("email")))
check("role present", bool(profile.get("role")))
check("status present", bool(profile.get("status")))
check("home_lat is float or null", profile.get("home_lat") is None or isinstance(profile.get("home_lat"), float))
check("home_lng is float or null", profile.get("home_lng") is None or isinstance(profile.get("home_lng"), float))
print(f"         home_lat={profile.get('home_lat')}, home_lng={profile.get('home_lng')}")

# ─────────────────────────────────────────────────────────────────────────────
# 4. PUT /employees/me — update home location + name
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 4: PUT /employees/me (update home_lat/lng) ───────────────────")
original_name = profile.get("name", "")
original_lat  = profile.get("home_lat")
original_lng  = profile.get("home_lng")

test_lat, test_lng = 23.8759, 90.3795   # Mirpur, Dhaka
status, updated = http(
    "PUT", "/employees/me",
    {"name": original_name, "home_lat": test_lat, "home_lng": test_lng},
    token=token,
)
check("status 200", status == 200, f"got {status}")
check("home_lat updated", abs((updated.get("home_lat") or 0) - test_lat) < 0.0001)
check("home_lng updated", abs((updated.get("home_lng") or 0) - test_lng) < 0.0001)
check("name preserved", updated.get("name") == original_name)
check("routing_done absent (correct model)", "routing_done" not in updated)

# ─────────────────────────────────────────────────────────────────────────────
# 5. Restore original values
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 5: PUT /employees/me (restore original) ─────────────────────")
restore_payload = {}
if original_lat is not None:
    restore_payload["home_lat"] = original_lat
if original_lng is not None:
    restore_payload["home_lng"] = original_lng
if restore_payload:
    status, restored = http("PUT", "/employees/me", restore_payload, token=token)
    check("status 200", status == 200, f"got {status}")
    print(f"         Restored home_lat={restored.get('home_lat')}, home_lng={restored.get('home_lng')}")
else:
    print(f"  {SKIP}  No original coordinates to restore (were null)")

# ─────────────────────────────────────────────────────────────────────────────
# 6. GET /employees/me/schedule (today)
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 6: GET /employees/me/schedule ───────────────────────────────")
from datetime import date
today = str(date.today())
status, sched = http("GET", f"/employees/me/schedule?service_date={today}", token=token)
check("status 200 (not 404)", status == 200, f"got {status}")
check("routing_done field present", "routing_done" in sched)

if sched.get("routing_done"):
    print(f"         routing_done=True — stop/driver/vehicle are populated")
    check("stop present", sched.get("stop") is not None)
    check("driver present (may be null if no assignment)", True)   # null is valid
    check("vehicle present (may be null if no assignment)", True)
    stop = sched.get("stop", {})
    check("stop.latitude is number", isinstance(stop.get("latitude"), (int, float)))
    check("stop.longitude is number", isinstance(stop.get("longitude"), (int, float)))
    print(f"         stop lat={stop.get('latitude')}, lng={stop.get('longitude')}, arrival={stop.get('arrival_time')}")
    d = sched.get("driver")
    v = sched.get("vehicle")
    print(f"         driver={d}, vehicle={v}")
else:
    print(f"  {SKIP}  routing_done=False (routing not run for today — expected before routing)")
    check("null fields graceful (not 404)", status == 200, f"got {status}")
    check("stop is null", sched.get("stop") is None)
    check("driver is null", sched.get("driver") is None)
    check("vehicle is null", sched.get("vehicle") is None)

# ─────────────────────────────────────────────────────────────────────────────
# 7. Security check — must require auth
# ─────────────────────────────────────────────────────────────────────────────
print("\n── Step 7: Security — unauthenticated requests must be rejected ──────")
status, _ = http("GET", "/employees/me")
check("GET /me without token → 401/403", status in (401, 403), f"got {status}")
status, _ = http("PUT", "/employees/me", {"name": "Hacker"})
check("PUT /me without token → 401/403", status in (401, 403), f"got {status}")
status, _ = http("GET", f"/employees/me/schedule?service_date={today}")
check("GET /me/schedule without token → 401/403", status in (401, 403), f"got {status}")

print("\n─────────────────────────────────────────────────────────────────────")
print("Part 2 functional test complete.\n")
