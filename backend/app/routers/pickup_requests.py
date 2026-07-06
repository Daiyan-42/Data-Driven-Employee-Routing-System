from fastapi import APIRouter, Depends, Query
from app.database import supabase
from app.models.common import paginate
from app.models.request import PickupRequestResponse, PickupRequestsListResponse
from app.services.request_service import RequestService
from app.dependencies import require_admin, TokenData
from typing import Optional

router = APIRouter(prefix="/pickup-requests", tags=["Admin — Pickup Requests"])

def _svc() -> RequestService:
    return RequestService(supabase)


@router.get("/", response_model=PickupRequestsListResponse)
def list_pickups(
    status: Optional[str] = Query(None, description="Filter by status: Pending/Approved/Rejected"),
    service_date: Optional[str] = Query(None, description="Filter by date e.g. 2025-01-15"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc),
):
    pickups, pagination = paginate(
        svc.get_all_pickups(status=status, service_date=service_date),
        page,
        limit,
    )
    return {"pickup_requests": pickups, "pagination": pagination}

@router.post("/{pickup_id}/approve", response_model=PickupRequestResponse)
def approve_pickup(
    pickup_id: int,
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc)
):
    return svc.approve_pickup(pickup_id)

@router.post("/{pickup_id}/reject", response_model=PickupRequestResponse)
def reject_pickup(
    pickup_id: int,
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc)
):
    return svc.reject_pickup(pickup_id)
