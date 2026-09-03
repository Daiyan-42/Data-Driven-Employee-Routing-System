"""Solver constants.

Lifted verbatim from `data/routing_unified.ipynb` (which implements
`data/system_data/Algo_refined.md`) so the ported solver reproduces the
notebook's output bit-for-bit. Changing any value here changes the schedule, so
treat them as policy, not tuning knobs.
"""
from dataclasses import dataclass

from app.services.week_service import OFFICE_LOCATION

# The office is the origin for every pickup route's end and every drop-off
# route's start. Single source of truth lives in week_service.
OFFICE = (OFFICE_LOCATION["lat"], OFFICE_LOCATION["lng"])

# BDS: employees walk to a fixed pickup point only if it is within 5 minutes.
WALK_SPEED_KMPH = 4.5
WALK_LIMIT_MIN = 5

# BDS: a vehicle waits at most 5 minutes per stop for boarding/alighting.
BOARDING_BUFFER_MIN = 5

# Hard cap on a single route's on-road time.
MAX_ROUTE_MINUTES = 120

# A pickup must reach the office at least this early before the shift starts.
OFFICE_BUFFER_MIN = 5

# Case D (07:30 drop-off): Mirpur (Zone-1) and Uttara (Zone-2) consolidate onto
# one main-road drop point instead of going door-to-door.
AGARGAON_METRO = (23.775518, 90.388407)
MAIN_ROAD_ZONES = frozenset({"Zone-1", "Zone-2"})

# Every timestamp is anchored to 22:00 on the service date, so the overnight
# timeline stays monotonic across midnight.
NIGHT_ANCHOR_HOUR = 22

# Case A (fixed-route matching) applies to these shifts; later shifts are
# door-to-door (Case B).
FIXED_ROUTE_SHIFTS = frozenset({"22:00:00", "23:00:00"})

# The drop-off event that triggers Case D.
MAIN_ROAD_DROP_TIME = "07:30:00"


@dataclass(frozen=True)
class SolverConfig:
    """Per-run knobs. Defaults reproduce the notebook exactly."""

    office: tuple[float, float] = OFFICE
    walk_speed_kmph: float = WALK_SPEED_KMPH
    walk_limit_min: float = WALK_LIMIT_MIN
    boarding_buffer_min: int = BOARDING_BUFFER_MIN
    max_route_minutes: float = MAX_ROUTE_MINUTES
    office_buffer_min: int = OFFICE_BUFFER_MIN
    agargaon_metro: tuple[float, float] = AGARGAON_METRO
    night_anchor_hour: int = NIGHT_ANCHOR_HOUR

    # BDS says the Agargaon Metro consolidation does not apply on Fridays. The
    # notebook omits this check; the backend knows the real service date, so it
    # can honour the rule. Set False to reproduce the notebook byte-for-byte on
    # a Friday service date.
    apply_friday_exception: bool = True
