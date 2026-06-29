from fastapi import APIRouter, Depends, Query
from app.database import supabase
from app.models.common import paginate
from app.models.vehicle import VehicleCreate, VehicleUpdate, VehicleResponse, VehiclesListResponse
from app.services.vehicle_service import VehicleService
from app.dependencies import require_admin, TokenData

router = APIRouter(prefix="/vehicles", tags=["Admin — Vehicles"])

def _svc() -> VehicleService:
    return VehicleService(supabase)

@router.get("/", response_model=VehiclesListResponse)
def list_vehicles(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    _: TokenData = Depends(require_admin),
    svc: VehicleService = Depends(_svc)
):
    vehicles, pagination = paginate(svc.get_all(), page, limit)
    return {"vehicles": vehicles, "pagination": pagination}

@router.get("/{vehicle_id}", response_model=VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    _: TokenData = Depends(require_admin),
    svc: VehicleService = Depends(_svc)
):
    return svc.get_by_id(vehicle_id)

@router.post("/", response_model=VehicleResponse, status_code=201)
def create_vehicle(
    body: VehicleCreate,
    _: TokenData = Depends(require_admin),
    svc: VehicleService = Depends(_svc)
):
    return svc.create(body)

@router.put("/{vehicle_id}", response_model=VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    body: VehicleUpdate,
    _: TokenData = Depends(require_admin),
    svc: VehicleService = Depends(_svc)
):
    return svc.update(vehicle_id, body)

@router.delete("/{vehicle_id}")
def delete_vehicle(
    vehicle_id: int,
    _: TokenData = Depends(require_admin),
    svc: VehicleService = Depends(_svc)
):
    return svc.delete(vehicle_id)
