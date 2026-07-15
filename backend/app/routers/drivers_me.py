from fastapi import APIRouter, Depends, HTTPException, status
from datetime import date
from typing import Any, Dict

from app.dependencies import get_current_user, TokenData
from app.services.driver_service import DriverService
from app.services.route_service import RouteService
from app.database import supabase

router = APIRouter(prefix="/drivers/me", tags=["Driver — Self"])


def _svc() -> DriverService:
    return DriverService(supabase)


def _route_svc() -> RouteService:
    return RouteService(supabase)


@router.get("", response_model=Any)
def get_my_profile(token: TokenData = Depends(get_current_user), svc: DriverService = Depends(_svc)):
    """Return driver profile and linked user info."""
    driver = svc.get_by_user_id(token.user_id)
    if not driver:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Driver profile not found")
    return driver


@router.put("", response_model=Any)
def update_my_profile(payload: Dict[str, Any], token: TokenData = Depends(get_current_user), svc: DriverService = Depends(_svc)):
    """Update phone/license for the signed-in driver (writes users + driver rows)."""
    return svc.update_profile(token.user_id, payload)


@router.get("/assignments/today", response_model=Any)
def my_assignment_today(token: TokenData = Depends(get_current_user), svc: RouteService = Depends(_route_svc)):
    """Return today's assignment (route + ordered stops + passengers) or an empty list."""
    today = date.today().isoformat()
    summary = svc.get_schedule_summary(service_date=today)

    driver = _svc().get_by_user_id(token.user_id)
    if not driver:
        return {"routes": []}

    driver_id = driver.get("driver_id")
    filtered_routes = [route for route in summary.routes if (route.assignment or {}).get("driver_id") == driver_id]
    return {"routes": filtered_routes}


@router.post("/route-assignments/{assignment_id}/start")
def start_assignment(assignment_id: int, token: TokenData = Depends(get_current_user), svc: DriverService = Depends(_svc)):
    """Mark the driver assignment as Started (permission check)."""
    return svc.start_assignment_for_driver(token.user_id, assignment_id)


@router.post("/route-assignments/{assignment_id}/complete")
def complete_assignment(assignment_id: int, token: TokenData = Depends(get_current_user), svc: DriverService = Depends(_svc)):
    """Mark the driver assignment as Completed (permission check)."""
    return svc.complete_assignment_for_driver(token.user_id, assignment_id)


@router.post("/stops/{stop_id}/passengers/{employee_id}/board")
def board_passenger(stop_id: int, employee_id: int, token: TokenData = Depends(get_current_user), svc: DriverService = Depends(_svc)):
    """Mark a passenger as boarded for a stop (driver must own the active assignment)."""
    return svc.board_passenger(token.user_id, stop_id, employee_id)
