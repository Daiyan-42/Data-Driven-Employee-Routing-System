from datetime import date

from fastapi import APIRouter, Depends, Query

from app.database import supabase
from app.dependencies import TokenData, get_current_user, require_admin
from app.models.common import paginate
from app.models.employee import (
    EmployeesListResponse,
    EmployeeProfileResponse,
    EmployeeProfileUpdate,
    ScheduleResponse,
)
from app.services.employee_service import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])


def _svc() -> EmployeeService:
    return EmployeeService(supabase)


@router.get("/", response_model=EmployeesListResponse)
def list_employees(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    _: TokenData = Depends(require_admin),
    svc: EmployeeService = Depends(_svc),
):
    employees, pagination = paginate(svc.get_all(), page, limit)
    return {"employees": employees, "pagination": pagination}


@router.get("/me", response_model=EmployeeProfileResponse)
def get_my_profile(
    current_user: TokenData = Depends(get_current_user),
    svc: EmployeeService = Depends(_svc),
):
    return svc.get_profile(current_user.user_id)


@router.put("/me", response_model=EmployeeProfileResponse)
def update_my_profile(
    body: EmployeeProfileUpdate,
    current_user: TokenData = Depends(get_current_user),
    svc: EmployeeService = Depends(_svc),
):
    return svc.update_profile(current_user.user_id, body)


@router.get("/me/schedule", response_model=ScheduleResponse)
def get_my_schedule(
    service_date: str = Query(default=str(date.today())),
    current_user: TokenData = Depends(get_current_user),
    svc: EmployeeService = Depends(_svc),
):
    return svc.get_schedule(current_user.user_id, service_date)
