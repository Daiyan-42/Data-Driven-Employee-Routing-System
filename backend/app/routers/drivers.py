from fastapi import APIRouter, Depends, Query
from app.database import supabase
from app.models.common import paginate
from app.models.driver import DriverCreate, DriverUpdate, DriverResponse, DriversListResponse
from app.services.driver_service import DriverService
from app.dependencies import require_admin, TokenData

router = APIRouter(prefix="/drivers", tags=["Admin — Drivers"])

def _svc() -> DriverService:
    return DriverService(supabase)

@router.get("/", response_model=DriversListResponse)
def list_drivers(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    _: TokenData = Depends(require_admin),
    svc: DriverService = Depends(_svc)
):
    drivers, pagination = paginate(svc.get_all(), page, limit)
    return {"drivers": drivers, "pagination": pagination}

@router.get("/{driver_id}", response_model=DriverResponse)
def get_driver(
    driver_id: int,
    _: TokenData = Depends(require_admin),
    svc: DriverService = Depends(_svc)
):
    return svc.get_by_id(driver_id)

@router.post("/", response_model=DriverResponse, status_code=201)
def create_driver(
    body: DriverCreate,
    _: TokenData = Depends(require_admin),
    svc: DriverService = Depends(_svc)
):
    return svc.create(body)

@router.put("/{driver_id}", response_model=DriverResponse)
def update_driver(
    driver_id: int,
    body: DriverUpdate,
    _: TokenData = Depends(require_admin),
    svc: DriverService = Depends(_svc)
):
    return svc.update(driver_id, body)

@router.delete("/{driver_id}")
def delete_driver(
    driver_id: int,
    _: TokenData = Depends(require_admin),
    svc: DriverService = Depends(_svc)
):
    return svc.delete(driver_id)
