from fastapi import HTTPException
from supabase import Client
from app.models.driver import DriverCreate, DriverUpdate

class DriverService:
    def __init__(self, db: Client):
        self.db = db

    def get_all(self):
        """Join driver → users to get full driver info."""
        res = (
            self.db.table("driver")
            .select("driver_id, user_id, license_no, status, users(name, email, phone, status)")
            .execute()
        )
        return [self._flatten(d) for d in res.data]

    def get_by_id(self, driver_id: int):
        res = (
            self.db.table("driver")
            .select("driver_id, user_id, license_no, status, users(name, email, phone, status)")
            .eq("driver_id", driver_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Driver not found")
        return self._flatten(res.data[0])

    def create(self, data: DriverCreate):
        # 1. Check email uniqueness
        existing = (
            self.db.table("users")
            .select("user_id")
            .eq("email", data.email)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Email already in use")

        # 2. Insert into users
        user_res = (
            self.db.table("users")
            .insert({
                "name": data.name,
                "email": data.email,
                "phone": data.phone,
                "password_hash": data.password,   # stored as-is
                "role": "Driver",
                "status": "Active"
            })
            .execute()
        )
        user_id = user_res.data[0]["user_id"]

        # 3. Insert into driver
        driver_res = (
            self.db.table("driver")
            .insert({
                "user_id": user_id,
                "license_no": data.license_no,
                "status": data.status
            })
            .execute()
        )
        return self.get_by_id(driver_res.data[0]["driver_id"])

    def update(self, driver_id: int, data: DriverUpdate):
        # Verify driver exists
        existing = self.get_by_id(driver_id)

        # Update users table if name/phone provided
        user_payload = {}
        if data.name is not None:
            user_payload["name"] = data.name
        if data.phone is not None:
            user_payload["phone"] = data.phone

        if user_payload:
            self.db.table("users").update(user_payload).eq("user_id", existing["user_id"]).execute()

        # Update driver table if license/status provided
        driver_payload = {}
        if data.license_no is not None:
            driver_payload["license_no"] = data.license_no
        if data.status is not None:
            driver_payload["status"] = data.status

        if driver_payload:
            self.db.table("driver").update(driver_payload).eq("driver_id", driver_id).execute()

        return self.get_by_id(driver_id)

    def delete(self, driver_id: int):
        existing = self.get_by_id(driver_id)   # 404 if not found

        # Check if driver is currently assigned to a vehicle
        vehicle_check = (
            self.db.table("vehicle")
            .select("vehicle_id, plate_no")
            .eq("driver_id", driver_id)
            .execute()
        )
        if vehicle_check.data:
            plate = vehicle_check.data[0]["plate_no"]
            raise HTTPException(
                status_code=409,
                detail=f"Driver is assigned to vehicle {plate}. Unassign first."
            )

        self.db.table("driver").delete().eq("driver_id", driver_id).execute()
        self.db.table("users").update({"status": "Inactive"}).eq("user_id", existing["user_id"]).execute()
        return {"message": "Driver deleted and user deactivated"}

    def _flatten(self, row: dict) -> dict:
        """Merge nested users dict into flat response."""
        user = row.get("users", {}) or {}
        return {
            "driver_id": row["driver_id"],
            "user_id": row["user_id"],
            "license_no": row["license_no"],
            "status": row["status"],
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "user_status": user.get("status"),
        }

    # --- Driver self-service methods (used by drivers/me router) ---
    def get_by_user_id(self, user_id: int):
        res = (
            self.db.table("driver")
            .select("driver_id, user_id, license_no, status, users(name, email, phone, status), vehicle(*)")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return None
        return self._flatten_with_vehicle(res.data[0])

    def _flatten_with_vehicle(self, row: dict) -> dict:
        user = row.get("users", {}) or {}
        vehicle = row.get("vehicle") or []
        vehicle = vehicle[0] if vehicle else None
        out = {
            "driver_id": row["driver_id"],
            "user_id": row["user_id"],
            "license_no": row.get("license_no"),
            "status": row.get("status"),
            "name": user.get("name"),
            "email": user.get("email"),
            "phone": user.get("phone"),
            "user_status": user.get("status"),
        }
        if vehicle:
            out["vehicle"] = {
                "vehicle_id": vehicle.get("vehicle_id"),
                "plate_no": vehicle.get("plate_no"),
                "make": vehicle.get("make"),
                "model": vehicle.get("model"),
            }
        else:
            out["vehicle"] = None
        return out

    def update_profile(self, user_id: int, payload: dict):
        # Update users table fields: phone (and optionally name)
        user_payload = {}
        if "phone" in payload:
            user_payload["phone"] = payload["phone"]
        if "name" in payload:
            user_payload["name"] = payload["name"]

        if user_payload:
            self.db.table("users").update(user_payload).eq("user_id", user_id).execute()

        # Update driver-specific fields (license)
        if "license_no" in payload:
            # find driver_id for user
            drv = (
                self.db.table("driver").select("driver_id").eq("user_id", user_id).limit(1).execute()
            )
            if drv.data:
                driver_id = drv.data[0]["driver_id"]
                self.db.table("driver").update({"license_no": payload["license_no"]}).eq("driver_id", driver_id).execute()

        return self.get_by_user_id(user_id)

    def start_assignment_for_driver(self, user_id: int, assignment_id: int):
        # verify assignment belongs to driver
        drv = (
            self.db.table("driver").select("driver_id").eq("user_id", user_id).limit(1).execute()
        )
        if not drv.data:
            raise HTTPException(status_code=404, detail="Driver not found")
        driver_id = drv.data[0]["driver_id"]

        ra = (
            self.db.table("route_assignment").select("*").eq("assignment_id", assignment_id).limit(1).execute()
        )
        if not ra.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        rec = ra.data[0]
        if rec.get("driver_id") != driver_id:
            raise HTTPException(status_code=403, detail="Not authorized for this assignment")

        # set status to InProgress and started_at
        self.db.table("route_assignment").update({"status": "InProgress"}).eq("assignment_id", assignment_id).execute()
        return {"message": "assignment started", "assignment_id": assignment_id}

    def complete_assignment_for_driver(self, user_id: int, assignment_id: int):
        # similar checks
        drv = (
            self.db.table("driver").select("driver_id").eq("user_id", user_id).limit(1).execute()
        )
        if not drv.data:
            raise HTTPException(status_code=404, detail="Driver not found")
        driver_id = drv.data[0]["driver_id"]

        ra = (
            self.db.table("route_assignment").select("*").eq("assignment_id", assignment_id).limit(1).execute()
        )
        if not ra.data:
            raise HTTPException(status_code=404, detail="Assignment not found")
        rec = ra.data[0]
        if rec.get("driver_id") != driver_id:
            raise HTTPException(status_code=403, detail="Not authorized for this assignment")

        self.db.table("route_assignment").update({"status": "Completed"}).eq("assignment_id", assignment_id).execute()
        return {"message": "assignment completed", "assignment_id": assignment_id}

    def board_passenger(self, user_id: int, stop_id: int, employee_id: int):
        # ensure driver owns an active assignment for the route_stop
        drv = (
            self.db.table("driver").select("driver_id").eq("user_id", user_id).limit(1).execute()
        )
        if not drv.data:
            raise HTTPException(status_code=404, detail="Driver not found")
        driver_id = drv.data[0]["driver_id"]

        # find route_stop and route assignment
        rs = (
            self.db.table("route_stop").select("stop_id, route_id").eq("stop_id", stop_id).limit(1).execute()
        )
        if not rs.data:
            raise HTTPException(status_code=404, detail="Stop not found")
        route_stop = rs.data[0]

        ra = (
            self.db.table("route_assignment").select("*").eq("route_id", route_stop.get("route_id")).limit(1).execute()
        )
        if not ra.data or ra.data[0].get("driver_id") != driver_id:
            raise HTTPException(status_code=403, detail="Not authorized for this stop")

        # find stop_passenger record and mark boarded
        sp = (
            self.db.table("stop_passenger").select("stop_passenger_id, boarded").eq("stop_id", stop_id).eq("employee_id", employee_id).limit(1).execute()
        )
        if not sp.data:
            raise HTTPException(status_code=404, detail="Passenger not assigned to this stop")

        self.db.table("stop_passenger").update({"boarded": True}).eq("stop_passenger_id", sp.data[0]["stop_passenger_id"]).execute()
        return {"message": "passenger boarded", "employee_id": employee_id, "stop_id": stop_id}
