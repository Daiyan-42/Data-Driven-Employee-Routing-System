from fastapi import HTTPException
from supabase import Client
from typing import Any, Dict, List, Optional

from app.models.route import (
    RouteAssignPayload,
    RouteAssignmentResponse,
    RouteDetailResponse,
    RouteResponse,
    ScheduleSummaryResponse,
)


class RouteService:
    def __init__(self, db: Client):
        self.db = db

    def get_schedule_summary(self, service_date: str, shift_time: Optional[str] = None) -> ScheduleSummaryResponse:
        query = (
            self.db.table("route")
            .select(
                "*, zone(zone_name), route_stop(*, stop_passenger(*, employee(employee_id, users(name)))), route_assignment(*)"
            )
            .eq("service_date", service_date)
        )
        if shift_time:
            query = query.eq("shift_time", shift_time)

        res = query.execute()
        routes = [self._flatten_route_detail(row) for row in (res.data or [])]
        return ScheduleSummaryResponse(routes=routes)

    def get_route_by_id(self, route_id: int) -> RouteDetailResponse:
        res = (
            self.db.table("route")
            .select(
                "*, zone(zone_name), route_stop(*, stop_passenger(*, employee(employee_id, users(name)))), route_assignment(*)"
            )
            .eq("route_id", route_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Route not found")
        return self._flatten_route_detail(res.data[0])

    def assign_route(self, route_id: int, payload: RouteAssignPayload) -> RouteAssignmentResponse:
        self._get_route_or_404(route_id)
        payload_data = payload.dict(exclude_none=True)

        existing = (
            self.db.table("route_assignment")
            .select("*")
            .eq("route_id", route_id)
            .limit(1)
            .execute()
        )

        if existing.data:
            assignment_id = existing.data[0]["assignment_id"]
            self.db.table("route_assignment").update(payload_data).eq("assignment_id", assignment_id).execute()
            res = (
                self.db.table("route_assignment")
                .select("*")
                .eq("assignment_id", assignment_id)
                .limit(1)
                .execute()
            )
            row = res.data[0]
        else:
            row = self.db.table("route_assignment").insert({"route_id": route_id, **payload_data}).execute().data[0]

        return self._flatten_assignment(row)

    def _get_route_or_404(self, route_id: int):
        res = (
            self.db.table("route")
            .select("route_id")
            .eq("route_id", route_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            raise HTTPException(status_code=404, detail="Route not found")
        return res.data[0]

    def _flatten_route_detail(self, row: Dict[str, Any]) -> RouteDetailResponse:
        zone = row.get("zone") or {}
        stops = [self._flatten_route_stop(stop) for stop in (row.get("route_stop") or [])]
        assignment = None
        assignment_rows = row.get("route_assignment") or []
        if assignment_rows:
            assignment = self._flatten_assignment(assignment_rows[0])

        return RouteDetailResponse(
            route_id=row["route_id"],
            zone_id=row.get("zone_id"),
            zone_name=zone.get("zone_name"),
            route_type=row.get("route_type"),
            service_date=row.get("service_date"),
            shift_time=row.get("shift_time"),
            total_distance_km=row.get("total_distance_km"),
            total_travel_time_min=row.get("total_travel_time_min"),
            created_at=row.get("created_at"),
            stops=stops,
            assignment=assignment,
        )

    def _flatten_route_stop(self, row: Dict[str, Any]) -> Dict[str, Any]:
        passengers = []
        for stop_passenger in (row.get("stop_passenger") or []):
            employee = stop_passenger.get("employee") or {}
            users = employee.get("users") or {}
            passengers.append({
                "employee_id": employee.get("employee_id"),
                "employee_name": users.get("name"),
                "boarded": stop_passenger.get("boarded", False),
            })

        return {
            "stop_id": row["stop_id"],
            "route_id": row["route_id"],
            "latitude": row["latitude"],
            "longitude": row["longitude"],
            "sequence_order": row["sequence_order"],
            "arrival_time": row.get("arrival_time"),
            "departure_time": row.get("departure_time"),
            "passengers": passengers,
        }

    def _flatten_assignment(self, row: Dict[str, Any]) -> RouteAssignmentResponse:
        return RouteAssignmentResponse(
            assignment_id=row["assignment_id"],
            route_id=row["route_id"],
            vehicle_id=row["vehicle_id"],
            driver_id=row.get("driver_id"),
            departure_time=row.get("departure_time"),
            arrival_time=row.get("arrival_time"),
            status=row.get("status"),
        )
