from datetime import datetime, timedelta
from math import asin, cos, radians, sin, sqrt
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from app.models.route import (
    DropoffRoutingRunPayload,
    PickupRoutingInputResponse,
    PickupRoutingRunPayload,
    RoutingRunResponse,
)
from app.services.week_service import OFFICE_LOCATION


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
        """Run real pickup routing for a service date (and optional shift)."""
        requests = self._get_routing_requests(
            "pickup_request",
            "service_date",
            payload.service_date,
            "shift_start_time",
            payload.shift_start_time,
            "Pending",
        )
        result = self._create_routes_for_requests(
            requests=requests,
            vehicles=self._get_active_vehicles(),
            route_type="pickup",
            shift_time=payload.shift_start_time,
            office_lat=payload.office_lat,
            office_lng=payload.office_lng,
            stop_dwell=payload.stop_dwell_minutes,
            speed_kmph=payload.average_speed_kmph,
        )
        return RoutingRunResponse(
            routes_created=len(result["routes"]),
            employees_assigned=result["assigned_count"],
            unassigned_pickup_ids=result["unassigned_ids"],
            message=f"Pickup routing complete for {payload.service_date}.",
        )

    def run_dropoff_routing(self, payload: DropoffRoutingRunPayload) -> RoutingRunResponse:
        """Run real dropoff routing for a service date (and optional shift)."""
        requests = self._get_routing_requests(
            "dropoff_request",
            "service_date",
            payload.service_date,
            "shift_end_time",
            payload.shift_end_time,
            "Pending",
        )
        result = self._create_routes_for_requests(
            requests=requests,
            vehicles=self._get_active_vehicles(),
            route_type="dropoff",
            shift_time=payload.shift_end_time,
            office_lat=payload.office_lat,
            office_lng=payload.office_lng,
            stop_dwell=payload.stop_dwell_minutes,
            speed_kmph=payload.average_speed_kmph,
        )
        return RoutingRunResponse(
            routes_created=len(result["routes"]),
            employees_assigned=result["assigned_count"],
            unassigned_pickup_ids=result["unassigned_ids"],
            message=f"Dropoff routing complete for {payload.service_date}.",
        )

    # ── Auto-run driver (used by the scheduler + admin override) ──

    def pending_counts(self, service_date: str) -> dict:
        """How many un-routed pickup/dropoff requests exist for a service date."""
        def _count(table: str) -> int:
            res = (
                self.db.table(table)
                .select("*")
                .eq("service_date", service_date)
                .eq("status", "Pending")
                .is_("route_id", None)
                .execute()
            )
            return len(res.data or [])
        return {
            "pickup": _count("pickup_request"),
            "dropoff": _count("dropoff_request"),
        }

    def run_service_date(
        self,
        service_date: str,
        office_lat: float = OFFICE_LOCATION["lat"],
        office_lng: float = OFFICE_LOCATION["lng"],
    ) -> dict:
        """Route every pending pickup + dropoff request for one service date.

        Idempotent: requests already carrying a route_id are skipped by
        ``_pending_requests``, and runs with nothing left to do create no routes.

        The per-employee dedupe runs ONCE for the whole day. When an ad-hoc
        request changes an employee's shift time, the weekly request for the old
        shift must not be routed separately — only the ad-hoc counts.
        """
        office_lat = office_lat or OFFICE_LOCATION["lat"]
        office_lng = office_lng or OFFICE_LOCATION["lng"]
        summary = {"service_date": service_date, "pickup": None, "dropoff": None}

        pickup_candidates = self._dedupe_latest_per_employee(
            self._pending_requests("pickup_request", service_date)
        )
        summary["pickup"] = self._route_by_shift(
            route_type="pickup",
            time_field="shift_start_time",
            candidates=pickup_candidates,
            office_lat=office_lat,
            office_lng=office_lng,
            message=f"Pickup routing complete for {service_date}.",
        )

        dropoff_candidates = self._dedupe_latest_per_employee(
            self._pending_requests("dropoff_request", service_date)
        )
        summary["dropoff"] = self._route_by_shift(
            route_type="dropoff",
            time_field="shift_end_time",
            candidates=dropoff_candidates,
            office_lat=office_lat,
            office_lng=office_lng,
            message=f"Dropoff routing complete for {service_date}.",
        )

        return summary

    def _pending_requests(self, table_name: str, service_date: str) -> List[Dict[str, Any]]:
        res = (
            self.db.table(table_name)
            .select("*, employee(employee_id, users(name)), zone(zone_name)")
            .eq("service_date", service_date)
            .eq("status", "Pending")
            .is_("route_id", None)
            .execute()
        )
        return res.data or []

    def _route_by_shift(
        self,
        route_type: str,
        time_field: str,
        candidates: List[Dict[str, Any]],
        office_lat: float,
        office_lng: float,
        message: str,
    ) -> Optional[RoutingRunResponse]:
        """Route the already-deduped candidates, grouped by their shift time.

        Each distinct shift becomes its own route (a pickup route per start
        time, a dropoff route per end time), so an employee whose ad-hoc moved
        their shift is routed only for the new shift.
        """
        if not candidates:
            return None
        shifts = sorted({(row.get(time_field) or "")[:5] for row in candidates})
        summary = None
        for shift in shifts:
            group = [row for row in candidates if (row.get(time_field) or "")[:5] == shift]
            result = self._create_routes_for_requests(
                requests=group,
                vehicles=self._get_active_vehicles(),
                route_type=route_type,
                shift_time=shift,
                office_lat=office_lat,
                office_lng=office_lng,
                stop_dwell=None,
                speed_kmph=None,
            )
            summary = self._merge_summary(
                summary,
                RoutingRunResponse(
                    routes_created=len(result["routes"]),
                    employees_assigned=result["assigned_count"],
                    unassigned_pickup_ids=result["unassigned_ids"],
                    message=message,
                ),
            )
        return summary

    @staticmethod
    def _merge_summary(acc: Optional[RoutingRunResponse], result: RoutingRunResponse) -> RoutingRunResponse:
        if acc is None:
            return result
        acc.routes_created += result.routes_created
        acc.employees_assigned += result.employees_assigned
        acc.unassigned_pickup_ids.extend(result.unassigned_pickup_ids)
        return acc

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
        res = query.execute()
        rows = res.data or []
        # Ad-hoc supersedes the weekly request for routing: only the newest
        # request per employee per day is routed, so the ad-hoc (always created
        # after the weekly rows) wins while the weekly row is skipped but kept —
        # it becomes the fallback if the ad-hoc is later rejected. Dropoffs
        # carry no request_type, so "newest" is the same rule there.
        rows = self._dedupe_latest_per_employee(rows)
        if time_value is not None:
            # Stored shift times are "HH:MM:SS" (time.isoformat()); match on the
            # first five chars so both "09:00" and "09:00:00" queries work.
            needle = str(time_value)[:5]
            rows = [r for r in rows if (r.get(time_field) or "")[:5] == needle]
        return rows

    @staticmethod
    def _dedupe_latest_per_employee(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Keep only the most recently created request per (employee, date)."""
        latest: Dict[Any, Dict[str, Any]] = {}
        for r in rows:
            key = (r.get("employee_id"), r.get("service_date"))
            cur = latest.get(key)
            if cur is None or (r.get("created_at") or "") > (cur.get("created_at") or ""):
                latest[key] = r
        return list(latest.values())

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
        assigned_count = 0
        routes: List[int] = []

        for request in requests:
            lat = request.get("pickup_lat") or request.get("drop_lat") or 0.0
            lng = request.get("pickup_lng") or request.get("drop_lng") or 0.0
            request["distance_from_office"] = self._haversine_km(office_lat, office_lng, lat, lng)
        requests.sort(key=lambda item: item["distance_from_office"], reverse=True)

        vehicle_index = 0
        remaining = list(requests)

        while remaining and vehicle_index < len(vehicles):
            vehicle = vehicles[vehicle_index]
            capacity = vehicle.get("capacity") or 1
            assigned_batch = remaining[:capacity]
            remaining = remaining[capacity:]

            assigned_batch = self._order_stops_nearest_neighbor(
                assigned_batch, vehicle.get("parking_lat", office_lat), vehicle.get("parking_lng", office_lng)
            )

            route = self._create_route(
                route_type=route_type,
                zone_id=assigned_batch[0].get("zone_id") if assigned_batch else None,
                service_date=assigned_batch[0].get("service_date") if assigned_batch else None,
                shift_time=shift_time,
                office_lat=office_lat,
                office_lng=office_lng,
                vehicle=vehicle,
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

    def _order_stops_nearest_neighbor(
        self,
        requests: List[Dict[str, Any]],
        start_lat: float,
        start_lng: float,
    ) -> List[Dict[str, Any]]:
        if len(requests) <= 1:
            return requests
        ordered: List[Dict[str, Any]] = []
        unvisited = list(requests)
        current_lat, current_lng = start_lat, start_lng
        while unvisited:
            nearest_idx = 0
            nearest_dist = float("inf")
            for i, req in enumerate(unvisited):
                r_lat = req.get("pickup_lat") or req.get("drop_lat") or 0.0
                r_lng = req.get("pickup_lng") or req.get("drop_lng") or 0.0
                dist = self._haversine_km(current_lat, current_lng, r_lat, r_lng)
                if dist < nearest_dist:
                    nearest_dist = dist
                    nearest_idx = i
            ordered.append(unvisited.pop(nearest_idx))
            current_lat = ordered[-1].get("pickup_lat") or ordered[-1].get("drop_lat") or 0.0
            current_lng = ordered[-1].get("pickup_lng") or ordered[-1].get("drop_lng") or 0.0
        return ordered

    def _create_route(
        self,
        route_type: str,
        zone_id: Optional[int],
        service_date: str,
        shift_time: Optional[str],
        office_lat: float,
        office_lng: float,
        vehicle: Dict[str, Any],
        requests: List[Dict[str, Any]],
        stop_dwell: int,
        speed_kmph: float,
    ) -> Dict[str, Any]:
        vehicle_id = vehicle.get("vehicle_id")
        driver_id = None
        driver_data = vehicle.get("driver")
        if isinstance(driver_data, dict):
            driver_id = driver_data.get("driver_id")

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
            route_type=route_type,
            office_lat=office_lat,
            office_lng=office_lng,
            vehicle=vehicle,
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
                "arrival_time": stop.get("arrival_time"),
                "departure_time": stop.get("departure_time"),
            }
            stop_res = self.db.table("route_stop").insert(stop_payload).execute()
            stop_id = stop_res.data[0]["stop_id"]

            employee_id = stop.get("employee_id")
            if employee_id:
                self.db.table("stop_passenger").insert({
                    "stop_id": stop_id,
                    "employee_id": employee_id,
                }).execute()

            total_distance += stop.get("distance_from_prev", 0.0)
            total_time += stop.get("travel_time_min", 0) + stop.get("stop_dwell_min", 0)

        assignment_payload = {
            "route_id": route_id,
            "vehicle_id": vehicle_id,
            "driver_id": driver_id,
            "status": "Scheduled",
        }
        self.db.table("route_assignment").insert(assignment_payload).execute()

        update_payload = {
            "total_distance_km": round(total_distance, 2),
            "total_travel_time_min": total_time,
        }
        self.db.table("route").update(update_payload).eq("route_id", route_id).execute()

        for request in requests:
            update_payload = {"route_id": route_id, "status": "Approved"}
            id_field = "pickup_id" if route_type == "pickup" else "dropoff_id"
            id_value = request.get("pickup_id") or request.get("dropoff_id")
            self.db.table("pickup_request" if route_type == "pickup" else "dropoff_request").update(update_payload).eq(
                id_field, id_value,
            ).execute()

        return {"route_id": route_id}

    def _build_route_stops(
        self,
        route_type: str,
        office_lat: float,
        office_lng: float,
        vehicle: Dict[str, Any],
        requests: List[Dict[str, Any]],
        shift_time: Optional[str],
        stop_dwell: int,
        speed_kmph: float,
    ) -> List[Dict[str, Any]]:
        stops: List[Dict[str, Any]] = []
        if not shift_time:
            shift_time = "08:00"
        current_time = datetime.strptime(str(shift_time)[:5], "%H:%M")

        if route_type == "pickup":
            prev_lat = vehicle.get("parking_lat") or office_lat
            prev_lng = vehicle.get("parking_lng") or office_lng
        else:
            prev_lat, prev_lng = office_lat, office_lng

        for request in requests:
            latitude = request.get("pickup_lat") or request.get("drop_lat") or 0.0
            longitude = request.get("pickup_lng") or request.get("drop_lng") or 0.0
            distance = self._haversine_km(prev_lat, prev_lng, latitude, longitude)
            travel_time_min = int((distance / speed_kmph) * 60) if speed_kmph > 0 else 0
            arrival_time = current_time + timedelta(minutes=travel_time_min)
            departure_time = arrival_time + timedelta(minutes=stop_dwell)
            employee_id = request.get("employee_id")
            stops.append({
                "latitude": latitude,
                "longitude": longitude,
                "arrival_time": arrival_time.strftime("%H:%M"),
                "departure_time": departure_time.strftime("%H:%M"),
                "distance_from_prev": distance,
                "travel_time_min": travel_time_min,
                "stop_dwell_min": stop_dwell,
                "employee_id": employee_id,
            })
            current_time = departure_time
            prev_lat, prev_lng = latitude, longitude

        if route_type == "pickup":
            distance_to_office = self._haversine_km(prev_lat, prev_lng, office_lat, office_lng)
            travel_time_to_office = int((distance_to_office / speed_kmph) * 60) if speed_kmph > 0 else 0
            arrival_at_office = current_time + timedelta(minutes=travel_time_to_office)
            stops.append({
                "latitude": office_lat,
                "longitude": office_lng,
                "arrival_time": arrival_at_office.strftime("%H:%M"),
                "departure_time": arrival_at_office.strftime("%H:%M"),
                "distance_from_prev": distance_to_office,
                "travel_time_min": travel_time_to_office,
                "stop_dwell_min": 0,
                "employee_id": None,
            })

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
