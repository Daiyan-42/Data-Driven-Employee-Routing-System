"""Weekly service-cycle helpers.

Business model (confirmed with stakeholders):

- A "week" runs Sunday → Saturday.
- The REQUEST WINDOW is the last two days of the current week: Friday 00:00 →
  Saturday 23:59:59. No requests can be submitted on the other five days.
- What employees request during that window is the whole FOLLOWING week:
  next Sunday → next Saturday (all seven days), with pickup & dropoff details
  for each day they'll come to the office.
- Once Saturday 23:59:59 passes, the routing algorithm runs automatically for
  the just-requested week.

Example: on Friday 2026-09-04 you request for 2026-09-06 (Sun) →
2026-09-12 (Sat); the deadline is 2026-09-05 23:59:59.
"""
from datetime import date, datetime, time, timedelta
from typing import List

from app.config import settings

# Matches the frontend OFFICE_LOCATION constant.
OFFICE_LOCATION = {"lat": 23.7298, "lng": 90.4182}

# Canonical key for each day of the service week, in order.
WEEK_DAY_KEYS = ("sun", "mon", "tue", "wed", "thu", "fri", "sat")

# Overnight shifts: 10 PM → 6 AM, one hour apart. A shift start/end may wrap
# past midnight (e.g. 23:00 → 00:00), so the only invalid pair is end == start.
NIGHT_SHIFT_HOURS = [
    "22:00", "23:00", "00:00", "01:00", "02:00", "03:00", "04:00", "05:00", "06:00",
]

# Ad-hoc requests close 3 hours before the 10 PM overnight shift: 7 PM local.
ADHOC_CUTOFF_TIME = time(19, 0)


def current_week_start(d: date) -> date:
    """The Sunday that starts the week containing `d`."""
    return d - timedelta(days=(d.weekday() + 1) % 7)


def day_key(d: date) -> str:
    """'sun'..'sat' for a date (Python weekday(): Monday=0, Sunday=6).

    WEEK_DAY_KEYS is Sunday-first, so weekday() 0 (Monday) maps to index 1,
    ..., weekday() 5 (Saturday) → 6, and weekday() 6 (Sunday) → 0.
    """
    return WEEK_DAY_KEYS[(d.weekday() + 1) % 7]


def most_recent_past_saturday(d: date) -> date:
    """The most recent Saturday at or before `d`."""
    return d - timedelta(days=(d.weekday() - 5) % 7)


def request_window_open(d: date) -> date:
    """Friday 00:00 of the week containing `d`."""
    return current_week_start(d) + timedelta(days=5)


def request_window_close(d: date) -> date:
    """Saturday of the week containing `d` (deadline day)."""
    return current_week_start(d) + timedelta(days=6)


def deadline_for_target(d: date) -> datetime:
    """Saturday 23:59:59 of the week containing `d` — the submission deadline."""
    return datetime.combine(request_window_close(d), time(23, 59, 59))


def target_service_week(d: date) -> List[date]:
    """The next week's seven days (Sunday → Saturday) that get requested now."""
    next_week_start = current_week_start(d) + timedelta(days=7)
    return [next_week_start + timedelta(days=i) for i in range(7)]


def next_window_open(now: datetime | None = None) -> datetime:
    """The next Friday 00:00 after `now` (used for countdowns when closed)."""
    now = now or datetime.now()
    friday = request_window_open(now.date())
    if now.date() < friday:
        return datetime.combine(friday, time(0, 0))
    return datetime.combine(friday + timedelta(days=7), time(0, 0))


def is_within_request_window(now: datetime | None = None) -> bool:
    """True only on Friday & Saturday, before Saturday 23:59:59 (dev override exempts)."""
    now = now or datetime.now()
    if settings.request_window_override:
        return True
    opens = datetime.combine(request_window_open(now.date()), time(0, 0))
    closes = deadline_for_target(now.date())
    return opens <= now <= closes


def adhoc_window_status(now: datetime | None = None) -> dict:
    """Whether an ad-hoc request may be submitted right now.

    Ad-hoc is available ONLY on the service day itself, before 7:00 PM (three
    hours before the 10 PM overnight shift). The weekly deadline is inherently
    past — today is a live service day (its week was requested during the
    previous Fri/Sat window and is locked), so the only real constraint is the
    same-day 7 PM cutoff. Returns the open flag, the service date the request
    would target, the cutoff, and a human reason when closed.
    """
    now = now or datetime.now()
    cutoff = datetime.combine(now.date(), ADHOC_CUTOFF_TIME)
    base = {
        "service_date": now.date().isoformat(),
        "cutoff": cutoff.isoformat(),
    }
    if settings.request_window_override:  # dev/test bypass
        return {**base, "open": True, "reason": None}
    if now >= cutoff:
        return {
            **base,
            "open": False,
            "reason": "Ad-hoc is closed for today at 7:00 PM (3 hours before the 10 PM shift). It opens again tomorrow.",
        }
    return {**base, "open": True, "reason": None}
