from fastapi import HTTPException
from supabase import Client

class RequestService:
    def __init__(self, db: Client):
        self.db = db

    # ── Pickup Requests ─────────────────────────────────────────

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

    def _get_pickup_or_404(self, pickup_id: int):
        res = (
            self.db.table("pickup_request")
            .select("pickup_id, status")
            .eq("pickup_id", pickup_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Pickup request not found")
        return res.data[0]

    def _get_dropoff_or_404(self, dropoff_id: int):
        res = (
            self.db.table("dropoff_request")
            .select("dropoff_id, status")
            .eq("dropoff_id", dropoff_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Dropoff request not found")
        return res.data[0]

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
