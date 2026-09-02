"""Automatic routing scheduler.

After the Friday/Saturday request window closes (Saturday 11:59 PM), this
module routes every pending request for the just-requested week with no admin
involvement. A background loop started from the FastAPI lifespan checks
periodically; an admin override endpoint can trigger a run on demand.
"""
import asyncio
import logging
import threading
from datetime import datetime, time

from app.config import settings
from app.database import supabase
from app.services.routing_service import RoutingService
from app.services.week_service import deadline_for_target, target_service_week

logger = logging.getLogger("uvicorn.error")

_routing_lock = threading.Lock()
# Service-week keys (target Sunday ISO date) already routed this process run.
_processed_weeks: set[str] = set()


def run_pending_routing(force: bool = False) -> dict:
    """Route the week whose request window has closed, once.

    Idempotent: requests already carrying a route_id are skipped, so re-runs
    after a successful pass create no duplicate routes. Returns a summary dict.
    """
    with _routing_lock:
        now = datetime.now()
        # The request window runs Friday → Saturday 11:59 PM of the CURRENT
        # week and targets NEXT week's seven days (Sunday → Saturday). Once the
        # current week's Saturday 23:59:59 passes, route what was just requested.
        deadline = deadline_for_target(now.date())
        if not force and now < deadline:
            return {"ran": False, "reason": "request window still open (closes Saturday 11:59 PM)"}

        service_days = target_service_week(now.date())
        week_key = service_days[0].isoformat()

        svc = RoutingService(supabase)
        summary = {"ran": False, "weeks": []}

        for service_date in service_days:
            iso = service_date.isoformat()
            counts = svc.pending_counts(iso)
            if counts["pickup"] == 0 and counts["dropoff"] == 0:
                continue
            summary["ran"] = True
            summary["weeks"].append(
                {
                    "service_date": iso,
                    "counts": counts,
                    "result": svc.run_service_date(iso),
                }
            )

        _processed_weeks.add(week_key)
        return summary


def run_daily_rerouting(force: bool = False) -> dict:
    """Re-route today after 10 PM so the day's ad-hoc requests get a route.

    The weekly pass at Saturday 11:59 PM routes the whole week in advance; the
    nightly pass then picks up the same-day ad-hoc rows (submitted before 7 PM,
    three hours before the 10 PM shift) and rebuilds those employees' routes.
    Idempotent: routing only touches Pending requests without a route_id, and
    ad-hoc supersedes the weekly request via the newest-wins rule.
    """
    with _routing_lock:
        now = datetime.now()
        if not force and now.time() < time(22, 0):
            return {"ran": False, "reason": "nightly re-routing runs after 10 PM"}

        today = now.date().isoformat()
        svc = RoutingService(supabase)
        counts = svc.pending_counts(today)
        if counts["pickup"] == 0 and counts["dropoff"] == 0:
            return {"ran": False, "reason": "nothing pending for today", "service_date": today}

        return {
            "ran": True,
            "service_date": today,
            "counts": counts,
            "result": svc.run_service_date(today),
        }


def run_all_pending(force: bool = True) -> dict:
    """Route every currently-pending request, across all service dates.

    Finds each service date that still has a Pending pickup or dropoff request
    with no route_id and runs that whole day (pickup + dropoff, newest request
    per employee wins). Date-agnostic — unlike the weekly/nightly passes it also
    picks up stragglers on other dates, which is what backs the admin "Run All"
    button after manual edits. Idempotent.
    """
    with _routing_lock:
        svc = RoutingService(supabase)
        dates: set[str] = set()
        for table_name in ("pickup_request", "dropoff_request"):
            res = (
                supabase.table(table_name)
                .select("service_date")
                .eq("status", "Pending")
                .is_("route_id", None)
                .execute()
            )
            for row in res.data or []:
                if row.get("service_date"):
                    dates.add(row["service_date"])

        if not dates:
            return {"ran": False, "reason": "no pending requests to route", "dates": []}

        def _totals(result: dict) -> tuple:
            created = assigned = unassigned = 0
            for leg in (result.get("pickup"), result.get("dropoff")):
                if leg is not None:
                    created += leg.routes_created
                    assigned += leg.employees_assigned
                    unassigned += len(leg.unassigned_pickup_ids)
            return created, assigned, unassigned

        summary = {"ran": True, "dates": []}
        for iso in sorted(dates):
            created, assigned, unassigned = _totals(svc.run_service_date(iso))
            summary["dates"].append(
                {
                    "service_date": iso,
                    "routes_created": created,
                    "employees_assigned": assigned,
                    "unassigned": unassigned,
                }
            )
        return summary


async def start_routing_scheduler() -> None:
    """Periodic background loop, spawned from the FastAPI lifespan."""
    while True:
        try:
            await asyncio.to_thread(run_pending_routing)
            await asyncio.to_thread(run_daily_rerouting)
        except Exception:  # noqa: BLE001 - keep the loop alive
            logger.exception("routing scheduler iteration failed")
        await asyncio.sleep(settings.routing_check_interval_seconds)
