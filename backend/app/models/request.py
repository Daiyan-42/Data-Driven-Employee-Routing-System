from pydantic import BaseModel
from typing import Optional
from datetime import date, time
from app.models.common import Pagination

class PickupRequestCreate(BaseModel):
    zone_id: Optional[int] = None
    pickup_lat: float
    pickup_lng: float
    shift_start_time: time
    service_date: date

class PickupRequestUpdate(BaseModel):
    zone_id: Optional[int] = None
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    shift_start_time: Optional[time] = None
    service_date: Optional[date] = None

class PickupRequestResponse(BaseModel):
    pickup_id: int
    employee_id: int
    employee_name: Optional[str]
    zone_id: Optional[int]
    zone_name: Optional[str]
    pickup_lat: Optional[float]
    pickup_lng: Optional[float]
    shift_start_time: Optional[str]
    service_date: date
    request_type: Optional[str]
    status: str
    pickup_time: Optional[str]
    created_at: Optional[str]

class PickupRequestsListResponse(BaseModel):
    pickup_requests: list[PickupRequestResponse]
    pagination: Pagination

class DropoffRequestCreate(BaseModel):
    zone_id: Optional[int] = None
    drop_lat: float
    drop_lng: float
    shift_end_time: time
    service_date: date

class DropoffRequestUpdate(BaseModel):
    zone_id: Optional[int] = None
    drop_lat: Optional[float] = None
    drop_lng: Optional[float] = None
    shift_end_time: Optional[time] = None
    service_date: Optional[date] = None

class DropoffRequestResponse(BaseModel):
    dropoff_id: int
    employee_id: int
    employee_name: Optional[str]
    zone_id: Optional[int]
    zone_name: Optional[str]
    drop_lat: Optional[float]
    drop_lng: Optional[float]
    shift_end_time: Optional[str]
    service_date: date
    status: str
    drop_time: Optional[str]
    created_at: Optional[str]

class DropoffRequestsListResponse(BaseModel):
    dropoff_requests: list[DropoffRequestResponse]
    pagination: Pagination

class ApprovalRequest(BaseModel):
    reason: Optional[str] = None    # optional rejection reason

# ── Weekly requests (Fri/Sat window → next week Sun–Sat) ────────

class WeeklyDayRequest(BaseModel):
    """One day's pickup + dropoff request in the weekly flow."""
    shift_start_time: time
    shift_end_time: time
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float

class WeeklyRequestCreate(BaseModel):
    """Payload saved by the weekly form. Any day key ('sun'..'sat') may be
    omitted to un-request it (its rows are then deleted)."""
    sun: Optional[WeeklyDayRequest] = None
    mon: Optional[WeeklyDayRequest] = None
    tue: Optional[WeeklyDayRequest] = None
    wed: Optional[WeeklyDayRequest] = None
    thu: Optional[WeeklyDayRequest] = None
    fri: Optional[WeeklyDayRequest] = None
    sat: Optional[WeeklyDayRequest] = None

class WeeklyDayView(BaseModel):
    """Existing Pending/Approved rows for one target service date."""
    date: date
    pickup: Optional[dict] = None
    dropoff: Optional[dict] = None

class WeeklyWindowView(BaseModel):
    open: bool
    opens: str                     # ISO datetime
    closes: str                    # ISO datetime
    next_open: str                 # ISO datetime
    closed_reason: Optional[str] = None

class WeeklyRequestView(BaseModel):
    open: bool
    window: WeeklyWindowView
    service_start: date            # next Sunday
    service_end: date              # next Saturday
    week: dict[str, Optional[WeeklyDayView]]

# ── Ad-hoc requests (same-day, before 7 PM) ────────────────────

class AdhocRequestCreate(BaseModel):
    """Ad-hoc payload: one day (today), overnight shift + pickup/dropoff."""
    shift_start_time: time
    shift_end_time: time
    pickup_lat: float
    pickup_lng: float
    drop_lat: float
    drop_lng: float

class AdhocRequestView(BaseModel):
    open: bool
    service_date: date
    cutoff: str                     # ISO datetime (today 7:00 PM)
    reason: Optional[str] = None
    existing: dict = {}             # {"pickup": {...} | None, "dropoff": {...} | None}
