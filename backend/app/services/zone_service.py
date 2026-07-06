from fastapi import HTTPException
from supabase import Client

from app.models.route import ZoneCreate, ZoneUpdate


class ZoneService:
    def __init__(self, db: Client):
        self.db = db

    def get_all(self):
        res = self.db.table("zone").select("*").order("zone_id").execute()
        return res.data or []

    def get_by_id(self, zone_id: int):
        res = (
            self.db.table("zone")
            .select("*")
            .eq("zone_id", zone_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Zone not found")
        return res.data[0]

    def create(self, data: ZoneCreate):
        res = self.db.table("zone").insert(data.dict()).execute()
        return self.get_by_id(res.data[0]["zone_id"])

    def update(self, zone_id: int, data: ZoneUpdate):
        existing = self.get_by_id(zone_id)
        payload = data.dict(exclude_none=True)
        if payload:
            self.db.table("zone").update(payload).eq("zone_id", zone_id).execute()
        return self.get_by_id(zone_id)

    def delete(self, zone_id: int):
        self.get_by_id(zone_id)
        self.db.table("zone").delete().eq("zone_id", zone_id).execute()
        return {"message": "Zone deleted"}
