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
from app.services.routing_service import ROUTING_LOCK, RoutingService
from app.services.week_service import deadline_for_target, target_service_week

logger = logging.getLogger("uvicorn.error")

# Shared with RoutingService so an admin-triggered run and a scheduled one cannot
# interleave. It is an RLock, so holding it here and calling run_service_date —
# which takes it again on this thread — is fine.
_routing_lock = ROUTING_LOCK
# Service-week keys (target Sunday ISO date) already routed this process run.
_processed_weeks: set[str] = set()


def run_pending_routing(force: bool = False) -> dict:
    """Route the week whose request window has closed, once.

    Idempotent by replacement: each service date's previous solve is deleted and
    rewritten, so re-runs converge rather than duplicating routes.

    Note this can take minutes per service date — the solver simulates the whole
    night and queries OSRM — so never call it directly from the event loop. Both
    call sites use `asyncio.to_thread`.
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
    three hours before the 10 PM shift) and rebuilds the day. The ad-hoc
    supersedes the weekly request via the newest-wins rule, and because the solve
    replaces the whole date, the superseded weekly route disappears with it.
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


async def start_routing_scheduler() -> None:
    """Periodic background loop, spawned from the FastAPI lifespan."""
    while True:
        try:
            await asyncio.to_thread(run_pending_routing)
            await asyncio.to_thread(run_daily_rerouting)
        except Exception:  # noqa: BLE001 - keep the loop alive
            logger.exception("routing scheduler iteration failed")
        await asyncio.sleep(settings.routing_check_interval_seconds)
