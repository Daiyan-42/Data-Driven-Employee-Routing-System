from fastapi import APIRouter, Depends, Query
from typing import Optional

from app.database import supabase
from app.dependencies import get_current_user, TokenData
from app.models.common import paginate
from app.models.request import (
    AdhocRequestCreate,
    AdhocRequestView,
    DropoffRequestCreate,
    DropoffRequestResponse,
    DropoffRequestsListResponse,
    DropoffRequestUpdate,
    PickupRequestCreate,
    PickupRequestResponse,
    PickupRequestsListResponse,
    PickupRequestUpdate,
    WeeklyRequestCreate,
    WeeklyRequestView,
)
from app.services.request_service import RequestService

router = APIRouter(tags=["Employee Requests"])

def _svc() -> RequestService:
    return RequestService(supabase)

@router.post("/pickup-requests", response_model=PickupRequestResponse, status_code=201)
def create_pickup(
    body: PickupRequestCreate,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.create_pickup(current_user.user_id, body)

@router.get("/pickup-requests/mine", response_model=PickupRequestsListResponse)
def list_my_pickups(
    service_date: Optional[str] = Query(None, description="Filter by date e.g. 2025-01-15"),
    status: Optional[str] = Query(None, description="Filter by status: Pending/Approved/Rejected"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    pickups, pagination = paginate(
        svc.get_my_pickups(current_user.user_id, service_date=service_date, status=status),
        page,
        limit,
    )
    return {"pickup_requests": pickups, "pagination": pagination}

@router.put("/pickup-requests/{pickup_id}", response_model=PickupRequestResponse)
def update_pickup(
    pickup_id: int,
    body: PickupRequestUpdate,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.update_my_pickup(pickup_id, current_user.user_id, body)

@router.delete("/pickup-requests/{pickup_id}")
def delete_pickup(
    pickup_id: int,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.delete_my_pickup(pickup_id, current_user.user_id)

@router.post("/dropoff-requests", response_model=DropoffRequestResponse, status_code=201)
def create_dropoff(
    body: DropoffRequestCreate,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.create_dropoff(current_user.user_id, body)

@router.get("/dropoff-requests/mine", response_model=DropoffRequestsListResponse)
def list_my_dropoffs(
    service_date: Optional[str] = Query(None, description="Filter by date e.g. 2025-01-15"),
    status: Optional[str] = Query(None, description="Filter by status: Pending/Approved/Rejected"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    dropoffs, pagination = paginate(
        svc.get_my_dropoffs(current_user.user_id, service_date=service_date, status=status),
        page,
        limit,
    )
    return {"dropoff_requests": dropoffs, "pagination": pagination}

@router.put("/dropoff-requests/{dropoff_id}", response_model=DropoffRequestResponse)
def update_dropoff(
    dropoff_id: int,
    body: DropoffRequestUpdate,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.update_my_dropoff(dropoff_id, current_user.user_id, body)

@router.delete("/dropoff-requests/{dropoff_id}")
def delete_dropoff(
    dropoff_id: int,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.delete_my_dropoff(dropoff_id, current_user.user_id)

# ── Weekly Fri/Sat requests ─────────────────────────────────────

@router.get("/weekly-requests/current", response_model=WeeklyRequestView)
def current_weekly_request(
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.get_current_weekly_request(current_user.user_id)

@router.post("/weekly-requests", response_model=WeeklyRequestView, status_code=201)
def save_weekly_request(
    body: WeeklyRequestCreate,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.save_weekly_request(current_user.user_id, body)

# ── Ad-hoc requests (same-day, before 7 PM) ────────────────────

@router.get("/adhoc-requests/current", response_model=AdhocRequestView)
def current_adhoc_request(
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.get_current_adhoc(current_user.user_id)

@router.post("/adhoc-requests", response_model=AdhocRequestView, status_code=201)
def save_adhoc_request(
    body: AdhocRequestCreate,
    current_user: TokenData = Depends(get_current_user),
    svc: RequestService = Depends(_svc)
):
    return svc.save_adhoc(current_user.user_id, body)
