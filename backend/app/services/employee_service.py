from fastapi import HTTPException
from supabase import Client

from app.models.employee import EmployeeProfileUpdate


class EmployeeService:
    def __init__(self, db: Client):
        self.db = db

    def get_all(self) -> list[dict]:
        res = (
            self.db.table("employee")
            .select("employee_id, user_id, home_lat, home_lng, is_active, users(name, email, phone, role, status)")
            .execute()
        )
        return [self._flatten_employee(row) for row in res.data]

    def _get_employee_or_404(self, user_id: int) -> dict:
        res = (
            self.db.table("employee")
            .select("employee_id, user_id, home_lat, home_lng, is_active")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Employee record not found")
        return res.data[0]

    def _flatten_employee(self, row: dict) -> dict:
        user = row.get("users") or {}
        return {
            "user_id": row["user_id"],
            "employee_id": row["employee_id"],
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "home_lat": row.get("home_lat"),
            "home_lng": row.get("home_lng"),
            "role": user.get("role", "Employee"),
            "status": user.get("status", "Active"),
            "is_active": row.get("is_active", True),
        }

    def _null_schedule(self, service_date: str) -> dict:
        return {
            "service_date": service_date,
            "route_id": None,
            "route_type": None,
            "shift_time": None,
            "stop": None,
            "driver": None,
            "vehicle": None,
            "routing_done": False,
        }

    def get_profile(self, user_id: int) -> dict:
        user_res = (
            self.db.table("users")
            .select("user_id, name, email, phone, role, status")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")
        user = user_res.data[0]

        emp = self._get_employee_or_404(user_id)

        return {
            "user_id": user_id,
            "employee_id": emp["employee_id"],
            "name": user["name"],
            "email": user["email"],
            "phone": user.get("phone"),
            "home_lat": emp.get("home_lat"),
            "home_lng": emp.get("home_lng"),
            "role": user["role"],
            "status": user["status"],
            "is_active": emp.get("is_active", True),
        }

    def update_profile(self, user_id: int, data: EmployeeProfileUpdate) -> dict:
        emp = self._get_employee_or_404(user_id)
        employee_id = emp["employee_id"]

        user_payload: dict = {}
        if data.name is not None:
            user_payload["name"] = data.name
        if data.phone is not None:
            user_payload["phone"] = data.phone
        if user_payload:
            self.db.table("users").update(user_payload).eq("user_id", user_id).execute()

        emp_payload: dict = {}
        if data.home_lat is not None:
            emp_payload["home_lat"] = data.home_lat
        if data.home_lng is not None:
            emp_payload["home_lng"] = data.home_lng
        if emp_payload:
            self.db.table("employee").update(emp_payload).eq(
                "employee_id", employee_id
            ).execute()

        return self.get_profile(user_id)

    def get_schedule(self, user_id: int, service_date: str) -> dict:
        emp = self._get_employee_or_404(user_id)
        employee_id = emp["employee_id"]

        # 1. Get stop IDs assigned to this employee
        sp_res = (
            self.db.table("stop_passenger")
            .select("stop_id")
            .eq("employee_id", employee_id)
            .execute()
        )
        if not sp_res.data:
            return self._null_schedule(service_date)

        stop_ids = [r["stop_id"] for r in sp_res.data]

        # 2. Get route_stops for those IDs
        rs_res = (
            self.db.table("route_stop")
            .select(
                "stop_id, route_id, latitude, longitude, sequence_order, arrival_time"
            )
            .in_("stop_id", stop_ids)
            .execute()
        )
        if not rs_res.data:
            return self._null_schedule(service_date)

        route_ids = list({r["route_id"] for r in rs_res.data})

        # 3. Find route matching service_date
        route_res = (
            self.db.table("route")
            .select("route_id, route_type, service_date, shift_time")
            .in_("route_id", route_ids)
            .eq("service_date", service_date)
            .execute()
        )
        if not route_res.data:
            return self._null_schedule(service_date)

        target_route = route_res.data[0]
        route_id = target_route["route_id"]

        # 4. Find the specific stop for this route
        matched_stop = next((r for r in rs_res.data if r["route_id"] == route_id), None)
        if not matched_stop:
            return self._null_schedule(service_date)

        # 5. Get route_assignment for this route
        ra_res = (
            self.db.table("route_assignment")
            .select("assignment_id, driver_id, vehicle_id")
            .eq("route_id", route_id)
            .execute()
        )

        driver = None
        vehicle = None
        if ra_res.data:
            ra = ra_res.data[0]

            d_res = (
                self.db.table("driver")
                .select("driver_id, users(name, phone)")
                .eq("driver_id", ra["driver_id"])
                .execute()
            )
            if d_res.data:
                d = d_res.data[0]
                u = d.get("users") or {}
                driver = {
                    "driver_id": d["driver_id"],
                    "name": u.get("name"),
                    "phone": u.get("phone"),
                }

            v_res = (
                self.db.table("vehicle")
                .select("vehicle_id, plate_no, capacity")
                .eq("vehicle_id", ra["vehicle_id"])
                .execute()
            )
            if v_res.data:
                v = v_res.data[0]
                vehicle = {
                    "vehicle_id": v["vehicle_id"],
                    "plate_no": v.get("plate_no"),
                    "capacity": v.get("capacity"),
                }

        return {
            "service_date": service_date,
            "route_id": route_id,
            "route_type": target_route.get("route_type"),
            "shift_time": target_route.get("shift_time"),
            "stop": {
                "stop_id": matched_stop["stop_id"],
                "sequence_order": matched_stop.get("sequence_order"),
                "latitude": matched_stop.get("latitude"),
                "longitude": matched_stop.get("longitude"),
                "arrival_time": matched_stop.get("arrival_time"),
            },
            "driver": driver,
            "vehicle": vehicle,
            "routing_done": True,
        }
