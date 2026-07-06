from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException
from supabase import Client

from app.models.route import (
    DropoffRoutingRunPayload,
    PickupRoutingInputResponse,
    PickupRoutingRunPayload,
    RoutingRunResponse,
)


class RoutingService:
    def __init__(self, db: Client):
        self.db = db

    def get_pickup_routing_input(self, service_date: str, shift_start_time: Optional[str] = None) -> PickupRoutingInputResponse:
        query = self.db.table("pickup_request").select("*, employee(employee_id, users(name)), zone(zone_name)")
        query = query.eq("service_date", service_date)
        if shift_start_time:
            query = query.eq("shift_start_time", shift_start_time)
        res = query.execute()
        rows = res.data or []

        total = len(rows)
        pending = sum(1 for row in rows if row.get("status") == "Pending")
        approved = sum(1 for row in rows if row.get("status") == "Approved")
        rejected = sum(1 for row in rows if row.get("status") == "Rejected")

        zone_counts: Dict[Optional[int], Dict[str, Any]] = {}
        for row in rows:
            zone = row.get("zone") or {}
            zid = row.get("zone_id")
            if zid not in zone_counts:
                zone_counts[zid] = {
                    "zone_id": zid,
                    "zone_name": zone.get("zone_name"),
                    "total_requests": 0,
                    "pending": 0,
                    "approved": 0,
                    "rejected": 0,
                }
            zone_counts[zid]["total_requests"] += 1
            status = row.get("status")
            if status == "Pending":
                zone_counts[zid]["pending"] += 1
            elif status == "Approved":
                zone_counts[zid]["approved"] += 1
            elif status == "Rejected":
                zone_counts[zid]["rejected"] += 1

        return PickupRoutingInputResponse(
            service_date=service_date,
            shift_start_time=shift_start_time,
            total_requests=total,
            pending=pending,
            approved=approved,
            rejected=rejected,
            zones=list(zone_counts.values()),
        )

    def run_pickup_routing(self, payload: PickupRoutingRunPayload) -> RoutingRunResponse:
        requests = self._get_routing_requests(
            table_name="pickup_request",
            date_field="service_date",
            date_value=payload.service_date,
            time_field="shift_start_time",
            time_value=payload.shift_start_time,
            status="Approved",
        )
        if not requests:
            return RoutingRunResponse(routes_created=0, employees_assigned=0, unassigned_pickup_ids=[])

        vehicles = self._get_active_vehicles()
        if not vehicles:
            return RoutingRunResponse(
                routes_created=0,
                employees_assigned=0,
                unassigned_pickup_ids=[r["pickup_id"] for r in requests],
                message="No active vehicles available for routing",
            )

        route_results = self._create_routes_for_requests(
            requests=requests,
            vehicles=vehicles,
            route_type="pickup",
            shift_time=payload.shift_start_time,
            office_lat=payload.office_lat,
            office_lng=payload.office_lng,
            stop_dwell=payload.stop_dwell_minutes,
            speed_kmph=payload.average_speed_kmph,
        )

        return RoutingRunResponse(
            routes_created=len(route_results["routes"]),
            employees_assigned=route_results["assigned_count"],
            unassigned_pickup_ids=route_results["unassigned_ids"],
        )

    def run_dropoff_routing(self, payload: DropoffRoutingRunPayload) -> RoutingRunResponse:
        requests = self._get_routing_requests(
            table_name="dropoff_request",
            date_field="service_date",
            date_value=payload.service_date,
            time_field="shift_end_time",
            time_value=payload.shift_end_time,
            status="Approved",
        )
        if not requests:
            return RoutingRunResponse(routes_created=0, employees_assigned=0, unassigned_pickup_ids=[])

        vehicles = self._get_active_vehicles()
        if not vehicles:
            return RoutingRunResponse(
                routes_created=0,
                employees_assigned=0,
                unassigned_pickup_ids=[r["dropoff_id"] for r in requests],
                message="No active vehicles available for routing",
            )

        route_results = self._create_routes_for_requests(
            requests=requests,
            vehicles=vehicles,
            route_type="dropoff",
            shift_time=payload.shift_end_time,
            office_lat=payload.office_lat,
            office_lng=payload.office_lng,
            stop_dwell=payload.stop_dwell_minutes,
            speed_kmph=payload.average_speed_kmph,
        )

        return RoutingRunResponse(
            routes_created=len(route_results["routes"]),
            employees_assigned=route_results["assigned_count"],
            unassigned_pickup_ids=route_results["unassigned_ids"],
        )

    def _get_routing_requests(
        self,
        table_name: str,
        date_field: str,
        date_value: str,
        time_field: str,
        time_value: Optional[str],
        status: str,
    ) -> List[Dict[str, Any]]:
        query = self.db.table(table_name).select("*, employee(employee_id, users(name)), zone(zone_name)")
        query = query.eq(date_field, date_value).eq("status", status).is_("route_id", None)
        if time_value is not None:
            query = query.eq(time_field, time_value)
        res = query.execute()
        return res.data or []

    def _get_active_vehicles(self) -> List[Dict[str, Any]]:
        res = self.db.table("vehicle").select("*, driver(driver_id, user_id, users(name), license_no)").eq("status", "Active").execute()
        return res.data or []

    def _create_routes_for_requests(
        self,
        requests: List[Dict[str, Any]],
        vehicles: List[Dict[str, Any]],
        route_type: str,
        shift_time: Optional[str],
        office_lat: float,
        office_lng: float,
        stop_dwell: Optional[int],
        speed_kmph: Optional[float],
    ) -> Dict[str, Any]:
        stop_dwell = stop_dwell or 5
        speed_kmph = speed_kmph or 40.0
        unassigned_ids: List[int] = []
        assigned_count = 0
        routes: List[int] = []

        # sort requests by farthest from office first
        for request in requests:
            request["distance_from_office"] = self._haversine_km(
                office_lat,
                office_lng,
                request.get("pickup_lat") or request.get("drop_lat") or 0.0,
                request.get("pickup_lng") or request.get("drop_lng") or 0.0,
            )
        requests.sort(key=lambda item: item["distance_from_office"], reverse=True)

        vehicle_index = 0
        remaining = list(requests)

        while remaining and vehicle_index < len(vehicles):
            vehicle = vehicles[vehicle_index]
            capacity = vehicle.get("capacity") or 1
            assigned_batch = remaining[:capacity]
            remaining = remaining[capacity:]

            route = self._create_route(
                route_type=route_type,
                zone_id=assigned_batch[0].get("zone_id") if assigned_batch else None,
                service_date=assigned_batch[0].get("service_date") if assigned_batch else None,
                shift_time=shift_time,
                office_lat=office_lat,
                office_lng=office_lng,
                requests=assigned_batch,
                stop_dwell=stop_dwell,
                speed_kmph=speed_kmph,
            )
            routes.append(route["route_id"])
            assigned_count += len(assigned_batch)
            vehicle_index += 1

        unassigned_ids = [req.get("pickup_id") or req.get("dropoff_id") for req in remaining]

        return {
            "routes": routes,
            "assigned_count": assigned_count,
            "unassigned_ids": unassigned_ids,
        }

    def _create_route(
        self,
        route_type: str,
        zone_id: Optional[int],
        service_date: str,
        shift_time: Optional[str],
        office_lat: float,
        office_lng: float,
        requests: List[Dict[str, Any]],
        stop_dwell: int,
        speed_kmph: float,
    ) -> Dict[str, Any]:
        route_payload = {
            "zone_id": zone_id,
            "route_type": route_type,
            "service_date": service_date,
            "shift_time": shift_time,
            "total_distance_km": 0.0,
            "total_travel_time_min": 0,
        }
        route_res = self.db.table("route").insert(route_payload).execute()
        route_id = route_res.data[0]["route_id"]

        stops = self._build_route_stops(
            office_lat=office_lat,
            office_lng=office_lng,
            requests=requests,
            shift_time=shift_time,
            stop_dwell=stop_dwell,
            speed_kmph=speed_kmph,
        )

        total_distance = 0.0
        total_time = 0
        for i, stop in enumerate(stops, start=1):
            stop_payload = {
                "route_id": route_id,
                "latitude": stop["latitude"],
                "longitude": stop["longitude"],
                "sequence_order": i,
                "arrival_time": stop["arrival_time"],
                "departure_time": stop["departure_time"],
            }
            self.db.table("route_stop").insert(stop_payload).execute()
            total_distance += stop["distance_from_prev"]
            total_time += stop["travel_time_min"] + stop["stop_dwell_min"]

        assignment_payload = {
            "route_id": route_id,
            "vehicle_id": requests[0].get("vehicle_id") if requests and requests[0].get("vehicle_id") else None,
            "status": "Scheduled",
        }
        self.db.table("route_assignment").insert(assignment_payload).execute()

        update_payload = {
            "total_distance_km": round(total_distance, 2),
            "total_travel_time_min": total_time,
        }
        self.db.table("route").update(update_payload).eq("route_id", route_id).execute()

        for request in requests:
            update_payload = {"route_id": route_id}
            if route_type == "pickup":
                update_payload["status"] = "Approved"
            else:
                update_payload["status"] = "Approved"
            self.db.table("pickup_request" if route_type == "pickup" else "dropoff_request").update(update_payload).eq(
                "pickup_id" if route_type == "pickup" else "dropoff_id",
                request.get("pickup_id") or request.get("dropoff_id"),
            ).execute()

        return {"route_id": route_id}

    def _build_route_stops(
        self,
        office_lat: float,
        office_lng: float,
        requests: List[Dict[str, Any]],
        shift_time: Optional[str],
        stop_dwell: int,
        speed_kmph: float,
    ) -> List[Dict[str, Any]]:
        stops: List[Dict[str, Any]] = []
        if not shift_time:
            shift_time = "08:00"
        current_time = datetime.strptime(shift_time, "%H:%M")
        prev_lat, prev_lng = office_lat, office_lng

        for request in requests:
            latitude = request.get("pickup_lat") or request.get("drop_lat") or 0.0
            longitude = request.get("pickup_lng") or request.get("drop_lng") or 0.0
            distance = self._haversine_km(prev_lat, prev_lng, latitude, longitude)
            travel_time_min = int((distance / speed_kmph) * 60) if speed_kmph > 0 else 0
            arrival_time = (current_time + timedelta(minutes=travel_time_min)).strftime("%H:%M")
            departure_time = (datetime.strptime(arrival_time, "%H:%M") + timedelta(minutes=stop_dwell)).strftime("%H:%M")
            stops.append({
                "latitude": latitude,
                "longitude": longitude,
                "arrival_time": arrival_time,
                "departure_time": departure_time,
                "distance_from_prev": distance,
                "travel_time_min": travel_time_min,
                "stop_dwell_min": stop_dwell,
            })
            current_time = datetime.strptime(departure_time, "%H:%M")
            prev_lat, prev_lng = latitude, longitude

        return stops

    @staticmethod
    def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        if lat1 == lat2 and lng1 == lng2:
            return 0.0
        lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
        c = 2 * asin(sqrt(a))
        return 6371.0 * c
