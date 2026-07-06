from fastapi import HTTPException
from supabase import Client
from datetime import datetime, time, timedelta
from app.models.request import (
    DropoffRequestCreate,
    DropoffRequestUpdate,
    PickupRequestCreate,
    PickupRequestUpdate,
)

DHAKA_MIN_LAT = 23.55
DHAKA_MAX_LAT = 24.05
DHAKA_MIN_LNG = 90.20
DHAKA_MAX_LNG = 90.60

class RequestService:
    def __init__(self, db: Client):
        self.db = db

    # ── Pickup Requests ─────────────────────────────────────────

    def create_pickup(self, user_id: int, data: PickupRequestCreate):
        employee_id = self._get_employee_id_for_user(user_id)
        self._validate_dhaka_bbox(data.pickup_lat, data.pickup_lng)
        self._ensure_no_duplicate_pickup(employee_id, data.service_date, data.shift_start_time)

        payload = {
            "employee_id": employee_id,
            "zone_id": data.zone_id,
            "pickup_lat": data.pickup_lat,
            "pickup_lng": data.pickup_lng,
            "shift_start_time": self._time_to_str(data.shift_start_time),
            "service_date": data.service_date.isoformat(),
            "request_type": self._pickup_request_type(data.service_date),
            "status": "Pending",
        }
        res = self.db.table("pickup_request").insert(payload).execute()
        return self.get_pickup_by_id(res.data[0]["pickup_id"])

    def get_my_pickups(self, user_id: int, service_date: str = None, status: str = None):
        employee_id = self._get_employee_id_for_user(user_id)
        query = (
            self.db.table("pickup_request")
            .select(
                "*, "
                "employee(employee_id, users(name)), "
                "zone(zone_name)"
            )
            .eq("employee_id", employee_id)
        )
        if service_date:
            query = query.eq("service_date", service_date)
        if status:
            query = query.eq("status", status)

        res = query.order("created_at", desc=True).execute()
        return [self._flatten_pickup(r) for r in res.data]

    def update_my_pickup(self, pickup_id: int, user_id: int, data: PickupRequestUpdate):
        employee_id = self._get_employee_id_for_user(user_id)
        req = self._get_pickup_or_404(pickup_id, employee_id=employee_id)
        if req["status"] != "Pending":
            raise HTTPException(status_code=409, detail="Only pending pickup requests can be edited")

        next_service_date = data.service_date or req["service_date"]
        next_shift_start_time = data.shift_start_time or req["shift_start_time"]
        next_pickup_lat = data.pickup_lat if data.pickup_lat is not None else req["pickup_lat"]
        next_pickup_lng = data.pickup_lng if data.pickup_lng is not None else req["pickup_lng"]

        self._validate_dhaka_bbox(next_pickup_lat, next_pickup_lng)
        self._ensure_no_duplicate_pickup(
            employee_id,
            next_service_date,
            next_shift_start_time,
            exclude_pickup_id=pickup_id,
        )

        payload = {}
        if data.zone_id is not None:
            payload["zone_id"] = data.zone_id
        if data.pickup_lat is not None:
            payload["pickup_lat"] = data.pickup_lat
        if data.pickup_lng is not None:
            payload["pickup_lng"] = data.pickup_lng
        if data.shift_start_time is not None:
            payload["shift_start_time"] = self._time_to_str(data.shift_start_time)
        if data.service_date is not None:
            payload["service_date"] = data.service_date.isoformat()
            payload["request_type"] = self._pickup_request_type(data.service_date)

        if payload:
            self.db.table("pickup_request").update(payload).eq("pickup_id", pickup_id).execute()
        return self.get_pickup_by_id(pickup_id)

    def delete_my_pickup(self, pickup_id: int, user_id: int):
        employee_id = self._get_employee_id_for_user(user_id)
        req = self._get_pickup_or_404(pickup_id, employee_id=employee_id)
        if req["status"] != "Pending":
            raise HTTPException(status_code=409, detail="Only pending pickup requests can be cancelled")

        self.db.table("pickup_request").delete().eq("pickup_id", pickup_id).execute()
        return {"message": "Pickup request cancelled"}

    def approve_pickup(self, pickup_id: int):
        req = self._get_pickup_or_404(pickup_id)
        if req["status"] != "Pending":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot approve — request is already '{req['status']}'"
            )
        self.db.table("pickup_request").update({"status": "Approved"}).eq("pickup_id", pickup_id).execute()
        return self.get_pickup_by_id(pickup_id)

    def reject_pickup(self, pickup_id: int):
        req = self._get_pickup_or_404(pickup_id)
        if req["status"] != "Pending":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot reject — request is already '{req['status']}'"
            )
        self.db.table("pickup_request").update({"status": "Rejected"}).eq("pickup_id", pickup_id).execute()
        return self.get_pickup_by_id(pickup_id)

    # ── Dropoff Requests ─────────────────────────────────────────

    def create_dropoff(self, user_id: int, data: DropoffRequestCreate):
        employee_id = self._get_employee_id_for_user(user_id)
        self._validate_dhaka_bbox(data.drop_lat, data.drop_lng)
        self._ensure_shift_has_ended(data.service_date, data.shift_end_time)
        self._ensure_no_duplicate_dropoff(employee_id, data.service_date, data.shift_end_time)

        payload = {
            "employee_id": employee_id,
            "zone_id": data.zone_id,
            "drop_lat": data.drop_lat,
            "drop_lng": data.drop_lng,
            "shift_end_time": self._time_to_str(data.shift_end_time),
            "service_date": data.service_date.isoformat(),
            "status": "Pending",
        }
        res = self.db.table("dropoff_request").insert(payload).execute()
        return self.get_dropoff_by_id(res.data[0]["dropoff_id"])

    def get_my_dropoffs(self, user_id: int, service_date: str = None, status: str = None):
        employee_id = self._get_employee_id_for_user(user_id)
        query = (
            self.db.table("dropoff_request")
            .select(
                "*, "
                "employee(employee_id, users(name)), "
                "zone(zone_name)"
            )
            .eq("employee_id", employee_id)
        )
        if service_date:
            query = query.eq("service_date", service_date)
        if status:
            query = query.eq("status", status)

        res = query.order("created_at", desc=True).execute()
        return [self._flatten_dropoff(r) for r in res.data]

    def update_my_dropoff(self, dropoff_id: int, user_id: int, data: DropoffRequestUpdate):
        employee_id = self._get_employee_id_for_user(user_id)
        req = self._get_dropoff_or_404(dropoff_id, employee_id=employee_id)
        if req["status"] != "Pending":
            raise HTTPException(status_code=409, detail="Only pending dropoff requests can be edited")

        next_service_date = data.service_date or req["service_date"]
        next_shift_end_time = data.shift_end_time or req["shift_end_time"]
        next_drop_lat = data.drop_lat if data.drop_lat is not None else req["drop_lat"]
        next_drop_lng = data.drop_lng if data.drop_lng is not None else req["drop_lng"]

        self._validate_dhaka_bbox(next_drop_lat, next_drop_lng)
        self._ensure_shift_has_ended(next_service_date, next_shift_end_time)
        self._ensure_no_duplicate_dropoff(
            employee_id,
            next_service_date,
            next_shift_end_time,
            exclude_dropoff_id=dropoff_id,
        )

        payload = {}
        if data.zone_id is not None:
            payload["zone_id"] = data.zone_id
        if data.drop_lat is not None:
            payload["drop_lat"] = data.drop_lat
        if data.drop_lng is not None:
            payload["drop_lng"] = data.drop_lng
        if data.shift_end_time is not None:
            payload["shift_end_time"] = self._time_to_str(data.shift_end_time)
        if data.service_date is not None:
            payload["service_date"] = data.service_date.isoformat()

        if payload:
            self.db.table("dropoff_request").update(payload).eq("dropoff_id", dropoff_id).execute()
        return self.get_dropoff_by_id(dropoff_id)

    def delete_my_dropoff(self, dropoff_id: int, user_id: int):
        employee_id = self._get_employee_id_for_user(user_id)
        req = self._get_dropoff_or_404(dropoff_id, employee_id=employee_id)
        if req["status"] != "Pending":
            raise HTTPException(status_code=409, detail="Only pending dropoff requests can be cancelled")

        self.db.table("dropoff_request").delete().eq("dropoff_id", dropoff_id).execute()
        return {"message": "Dropoff request cancelled"}

    def get_all_dropoffs(self, status: str = None, service_date: str = None):
        query = (
            self.db.table("dropoff_request")
            .select(
                "*, "
                "employee(employee_id, users(name)), "
                "zone(zone_name)"
            )
        )
        if status:
            query = query.eq("status", status)
        if service_date:
            query = query.eq("service_date", service_date)

        res = query.order("created_at", desc=True).execute()
        return [self._flatten_dropoff(r) for r in res.data]

    def get_dropoff_by_id(self, dropoff_id: int):
        res = (
            self.db.table("dropoff_request")
            .select(
                "*, "
                "employee(employee_id, users(name)), "
                "zone(zone_name)"
            )
            .eq("dropoff_id", dropoff_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Dropoff request not found")
        return self._flatten_dropoff(res.data[0])

    def approve_dropoff(self, dropoff_id: int):
        req = self._get_dropoff_or_404(dropoff_id)
        if req["status"] != "Pending":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot approve — request is already '{req['status']}'"
            )
        self.db.table("dropoff_request").update({"status": "Approved"}).eq("dropoff_id", dropoff_id).execute()
        return self.get_dropoff_by_id(dropoff_id)

    def reject_dropoff(self, dropoff_id: int):
        req = self._get_dropoff_or_404(dropoff_id)
        if req["status"] != "Pending":
            raise HTTPException(
                status_code=409,
                detail=f"Cannot reject — request is already '{req['status']}'"
            )
        self.db.table("dropoff_request").update({"status": "Rejected"}).eq("dropoff_id", dropoff_id).execute()
        return self.get_dropoff_by_id(dropoff_id)

    # ── Helpers ─────────────────────────────────────────────────

    def get_pickup_by_id(self, pickup_id: int):
        res = (
            self.db.table("pickup_request")
            .select(
                "*, "
                "employee(employee_id, users(name)), "
                "zone(zone_name)"
            )
            .eq("pickup_id", pickup_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Pickup request not found")
        return self._flatten_pickup(res.data[0])

    def _get_pickup_or_404(self, pickup_id: int, employee_id: int = None):
        query = (
            self.db.table("pickup_request")
            .select("pickup_id, employee_id, status, pickup_lat, pickup_lng, shift_start_time, service_date")
            .eq("pickup_id", pickup_id)
        )
        if employee_id is not None:
            query = query.eq("employee_id", employee_id)

        res = query.limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Pickup request not found")
        return res.data[0]

    def _get_dropoff_or_404(self, dropoff_id: int, employee_id: int = None):
        query = (
            self.db.table("dropoff_request")
            .select("dropoff_id, employee_id, status, drop_lat, drop_lng, shift_end_time, service_date")
            .eq("dropoff_id", dropoff_id)
        )
        if employee_id is not None:
            query = query.eq("employee_id", employee_id)

        res = query.limit(1).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Dropoff request not found")
        return res.data[0]

    def _get_employee_id_for_user(self, user_id: int):
        res = (
            self.db.table("employee")
            .select("employee_id")
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=403, detail="Employee account required")
        return res.data[0]["employee_id"]

    def _validate_dhaka_bbox(self, lat: float, lng: float):
        if not (DHAKA_MIN_LAT <= lat <= DHAKA_MAX_LAT and DHAKA_MIN_LNG <= lng <= DHAKA_MAX_LNG):
            raise HTTPException(status_code=422, detail="Location must be inside Dhaka service area")

    def _pickup_request_type(self, service_date):
        service_date = self._normalize_date(service_date)
        if service_date.weekday() >= 5:
            return "Ad-hoc"

        deadline = datetime.combine(service_date - timedelta(days=1), time(18, 0))
        return "Regular" if datetime.now() <= deadline else "Ad-hoc"

    def _ensure_shift_has_ended(self, service_date, shift_end_time):
        service_datetime = datetime.combine(
            self._normalize_date(service_date),
            self._normalize_time(shift_end_time),
        )
        if datetime.now() < service_datetime:
            raise HTTPException(status_code=409, detail="Dropoff request can be submitted only after shift ends")

    def _ensure_no_duplicate_pickup(
        self,
        employee_id: int,
        service_date,
        shift_start_time,
        exclude_pickup_id: int = None,
    ):
        query = (
            self.db.table("pickup_request")
            .select("pickup_id")
            .eq("employee_id", employee_id)
            .eq("service_date", self._date_to_str(service_date))
            .eq("shift_start_time", self._time_to_str(shift_start_time))
            .in_("status", ["Pending", "Approved"])
        )
        if exclude_pickup_id is not None:
            query = query.neq("pickup_id", exclude_pickup_id)

        if query.limit(1).execute().data:
            raise HTTPException(status_code=409, detail="Duplicate pickup request already exists")

    def _ensure_no_duplicate_dropoff(
        self,
        employee_id: int,
        service_date,
        shift_end_time,
        exclude_dropoff_id: int = None,
    ):
        query = (
            self.db.table("dropoff_request")
            .select("dropoff_id")
            .eq("employee_id", employee_id)
            .eq("service_date", self._date_to_str(service_date))
            .eq("shift_end_time", self._time_to_str(shift_end_time))
            .in_("status", ["Pending", "Approved"])
        )
        if exclude_dropoff_id is not None:
            query = query.neq("dropoff_id", exclude_dropoff_id)

        if query.limit(1).execute().data:
            raise HTTPException(status_code=409, detail="Duplicate dropoff request already exists")

    def _normalize_date(self, value):
        if hasattr(value, "isoformat") and not isinstance(value, str):
            return value
        return datetime.strptime(value, "%Y-%m-%d").date()

    def _normalize_time(self, value):
        if hasattr(value, "isoformat") and not isinstance(value, str):
            return value
        return time.fromisoformat(value)

    def _date_to_str(self, value):
        return self._normalize_date(value).isoformat()

    def _time_to_str(self, value):
        return self._normalize_time(value).isoformat()

    def _flatten_dropoff(self, row: dict) -> dict:
        employee = row.get("employee", None) or {}
        users = employee.get("users", None) or {}
        zone = row.get("zone", None) or {}
        return {
            **{k: v for k, v in row.items() if k not in {"employee", "zone"}},
            "employee_name": users.get("name"),
            "zone_name": zone.get("zone_name"),
        }

    def _flatten_pickup(self, row: dict) -> dict:
        employee = row.get("employee", None) or {}
        users = employee.get("users", None) or {}
        zone = row.get("zone", None) or {}
        return {
            **{k: v for k, v in row.items() if k not in {"employee", "zone"}},
            "employee_name": users.get("name"),
            "zone_name": zone.get("zone_name"),
        }
