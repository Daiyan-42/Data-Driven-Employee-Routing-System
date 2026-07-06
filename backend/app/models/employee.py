from typing import Optional

from pydantic import BaseModel
from app.models.common import Pagination


class EmployeeProfileResponse(BaseModel):
    user_id: int
    employee_id: int
    name: str
    email: str
    phone: Optional[str] = None
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None
    role: str
    status: str
    is_active: bool


class EmployeesListResponse(BaseModel):
    employees: list[EmployeeProfileResponse]
    pagination: Pagination


class EmployeeProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    home_lat: Optional[float] = None
    home_lng: Optional[float] = None


class StopInfo(BaseModel):
    stop_id: int
    sequence_order: Optional[int] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    arrival_time: Optional[str] = None


class DriverInfo(BaseModel):
    driver_id: int
    name: Optional[str] = None
    phone: Optional[str] = None


class VehicleInfo(BaseModel):
    vehicle_id: int
    plate_no: Optional[str] = None
    capacity: Optional[int] = None


class ScheduleResponse(BaseModel):
    service_date: str
    route_id: Optional[int] = None
    route_type: Optional[str] = None
    shift_time: Optional[str] = None
    stop: Optional[StopInfo] = None
    driver: Optional[DriverInfo] = None
    vehicle: Optional[VehicleInfo] = None
    routing_done: bool  # True only if routing has been run and stop is assigned
