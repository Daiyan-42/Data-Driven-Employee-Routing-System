from fastapi import APIRouter, Depends, Query
from app.database import supabase
from app.models.common import paginate
from app.models.request import DropoffRequestResponse, DropoffRequestsListResponse
from app.services.request_service import RequestService
from app.dependencies import require_admin, TokenData
from typing import Optional

router = APIRouter(prefix="/dropoff-requests", tags=["Admin — Dropoff Requests"])

def _svc() -> RequestService:
    return RequestService(supabase)

@router.get("/", response_model=DropoffRequestsListResponse)
def list_dropoffs(
    status: Optional[str] = Query(None, description="Filter by status: Pending/Approved/Rejected"),
    service_date: Optional[str] = Query(None, description="Filter by date e.g. 2025-01-15"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc)
):
    dropoffs, pagination = paginate(
        svc.get_all_dropoffs(status=status, service_date=service_date),
        page,
        limit,
    )
    return {"dropoff_requests": dropoffs, "pagination": pagination}

@router.get("/{dropoff_id}", response_model=DropoffRequestResponse)
def get_dropoff(
    dropoff_id: int,
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc)
):
    return svc.get_dropoff_by_id(dropoff_id)

@router.post("/{dropoff_id}/approve", response_model=DropoffRequestResponse)
def approve_dropoff(
    dropoff_id: int,
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc)
):
    return svc.approve_dropoff(dropoff_id)

@router.post("/{dropoff_id}/reject", response_model=DropoffRequestResponse)
def reject_dropoff(
    dropoff_id: int,
    _: TokenData = Depends(require_admin),
    svc: RequestService = Depends(_svc)
):
    return svc.reject_dropoff(dropoff_id)
