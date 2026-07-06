from fastapi import APIRouter, Depends, Query
from app.database import supabase
from app.dependencies import require_admin, TokenData
from app.models.common import paginate
from app.models.route import (
    DropoffRoutingRunPayload,
    PickupRoutingInputResponse,
    PickupRoutingRunPayload,
    RouteAssignPayload,
    RouteAssignmentResponse,
    RouteDetailResponse,
    RoutingRunResponse,
    ScheduleSummaryResponse,
    ZoneCreate,
    ZoneResponse,
    ZoneUpdate,
    ZonesListResponse,
)
from app.services.route_service import RouteService
from app.services.routing_service import RoutingService
from app.services.zone_service import ZoneService

router = APIRouter()


def _routing_svc() -> RoutingService:
    return RoutingService(supabase)


def _route_svc() -> RouteService:
    return RouteService(supabase)


def _zone_svc() -> ZoneService:
    return ZoneService(supabase)


@router.get("/admin/pickup-routing/input", response_model=PickupRoutingInputResponse)
def pickup_routing_input(
    service_date: str = Query(..., description="Service date in YYYY-MM-DD format"),
    shift_start_time: str | None = Query(None, description="Optional shift start time in HH:MM"),
    _: TokenData = Depends(require_admin),
    svc: RoutingService = Depends(_routing_svc),
):
    return svc.get_pickup_routing_input(service_date, shift_start_time)


@router.post("/admin/pickup-routing/run", response_model=RoutingRunResponse)
def run_pickup_routing(
    payload: PickupRoutingRunPayload,
    _: TokenData = Depends(require_admin),
    svc: RoutingService = Depends(_routing_svc),
):
    return svc.run_pickup_routing(payload)


@router.post("/admin/dropoff-routing/run", response_model=RoutingRunResponse)
def run_dropoff_routing(
    payload: DropoffRoutingRunPayload,
    _: TokenData = Depends(require_admin),
    svc: RoutingService = Depends(_routing_svc),
):
    return svc.run_dropoff_routing(payload)


@router.get("/admin/schedule-summary", response_model=ScheduleSummaryResponse)
def schedule_summary(
    service_date: str = Query(..., description="Service date in YYYY-MM-DD format"),
    shift_time: str | None = Query(None, description="Optional shift time"),
    _: TokenData = Depends(require_admin),
    svc: RouteService = Depends(_route_svc),
):
    return svc.get_schedule_summary(service_date, shift_time)


@router.get("/admin/routes/{route_id}", response_model=RouteDetailResponse)
def get_route_detail(
    route_id: int,
    _: TokenData = Depends(require_admin),
    svc: RouteService = Depends(_route_svc),
):
    return svc.get_route_by_id(route_id)


@router.post("/admin/routes/{route_id}/assign", response_model=RouteAssignmentResponse)
def assign_route(
    route_id: int,
    payload: RouteAssignPayload,
    _: TokenData = Depends(require_admin),
    svc: RouteService = Depends(_route_svc),
):
    return svc.assign_route(route_id, payload)


@router.get("/zones", response_model=ZonesListResponse)
def list_zones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    _: TokenData = Depends(require_admin),
    svc: ZoneService = Depends(_zone_svc),
):
    zones = svc.get_all()
    zones_page, pagination = paginate(zones, page, limit)
    return {"zones": zones_page, "pagination": pagination}


@router.post("/zones", response_model=ZoneResponse, status_code=201)
def create_zone(
    payload: ZoneCreate,
    _: TokenData = Depends(require_admin),
    svc: ZoneService = Depends(_zone_svc),
):
    return svc.create(payload)


@router.get("/zones/{zone_id}", response_model=ZoneResponse)
def get_zone(
    zone_id: int,
    _: TokenData = Depends(require_admin),
    svc: ZoneService = Depends(_zone_svc),
):
    return svc.get_by_id(zone_id)


@router.put("/zones/{zone_id}", response_model=ZoneResponse)
def update_zone(
    zone_id: int,
    payload: ZoneUpdate,
    _: TokenData = Depends(require_admin),
    svc: ZoneService = Depends(_zone_svc),
):
    return svc.update(zone_id, payload)


@router.delete("/zones/{zone_id}")
def delete_zone(
    zone_id: int,
    _: TokenData = Depends(require_admin),
    svc: ZoneService = Depends(_zone_svc),
):
    return svc.delete(zone_id)
