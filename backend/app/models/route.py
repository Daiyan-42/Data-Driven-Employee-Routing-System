from datetime import date
from typing import List, Optional

from pydantic import BaseModel

from app.models.common import Pagination


class ZoneCreate(BaseModel):
    zone_name: str
    description: Optional[str] = None


class ZoneUpdate(BaseModel):
    zone_name: Optional[str] = None
    description: Optional[str] = None


class ZoneResponse(BaseModel):
    zone_id: int
    zone_name: str
    description: Optional[str] = None


class ZonesListResponse(BaseModel):
    zones: List[ZoneResponse]
    pagination: Pagination


class PickupRoutingZoneCount(BaseModel):
    zone_id: Optional[int]
    zone_name: Optional[str]
    total_requests: int
    pending: int
    approved: int
    rejected: int


class PickupRoutingInputResponse(BaseModel):
    service_date: str
    shift_start_time: Optional[str] = None
    total_requests: int
    pending: int
    approved: int
    rejected: int
    zones: List[PickupRoutingZoneCount]


class PickupRoutingRunPayload(BaseModel):
    service_date: str
    shift_start_time: Optional[str] = None
    office_lat: float
    office_lng: float
    office_buffer_minutes: Optional[int] = 10
    stop_dwell_minutes: Optional[int] = 5
    average_speed_kmph: Optional[float] = 40.0


class DropoffRoutingRunPayload(BaseModel):
    service_date: str
    shift_end_time: Optional[str] = None
    office_lat: float
    office_lng: float
    office_buffer_minutes: Optional[int] = 10
    stop_dwell_minutes: Optional[int] = 5
    average_speed_kmph: Optional[float] = 40.0


class RoutingRunResponse(BaseModel):
    routes_created: int
    employees_assigned: int
    unassigned_pickup_ids: List[int]
    message: Optional[str] = None


class RouteStopResponse(BaseModel):
    stop_id: int
    route_id: int
    latitude: float
    longitude: float
    sequence_order: int
    arrival_time: Optional[str]
    departure_time: Optional[str]


class RouteAssignmentResponse(BaseModel):
    assignment_id: int
    route_id: int
    vehicle_id: int
    driver_id: Optional[int] = None
    departure_time: Optional[str]
    arrival_time: Optional[str]
    status: str


class RouteResponse(BaseModel):
    route_id: int
    zone_id: Optional[int]
    zone_name: Optional[str] = None
    route_type: str
    service_date: str
    shift_time: Optional[str] = None
    total_distance_km: Optional[float] = None
    total_travel_time_min: Optional[int] = None
    created_at: Optional[str] = None


class ScheduleRouteStop(RouteStopResponse):
    passengers: List[str] = []


class RouteDetailResponse(RouteResponse):
    stops: List[ScheduleRouteStop] = []
    assignment: Optional[RouteAssignmentResponse] = None


class ScheduleSummaryResponse(BaseModel):
    routes: List[RouteDetailResponse]


class RouteAssignPayload(BaseModel):
    vehicle_id: int
    driver_id: int
    departure_time: Optional[str] = None
    arrival_time: Optional[str] = None
    status: Optional[str] = "Scheduled"
