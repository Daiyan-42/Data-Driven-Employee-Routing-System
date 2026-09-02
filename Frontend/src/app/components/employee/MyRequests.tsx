import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { AddressText } from '../shared/AddressText';
import { Calendar, CalendarDays, MapPin, Clock, AlertCircle, Car, User as UserIcon, Route, Loader2, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { InteractiveMap } from '../shared/InteractiveMap';
import { OFFICE_LOCATION } from '../../data/mockData';
import { dropoffRequestApi, employeeApi, pickupRequestApi } from '../../services/transportApi';
import type { DropoffRequest, PickupRequest, RequestStatus, ScheduleResponse } from '../../types/api';

type RequestTab = 'all' | 'routed' | 'pending' | 'rejected';
type CombinedRequest = {
  id: string;
  rawId: number;
  type: 'pickup' | 'dropoff';
  requestType: string;
  status: RequestStatus;
  serviceDate: string;
  shiftTime: string;
  location: string;
  latitude: number;
  longitude: number;
  createdAt?: string | null;
};

/** One requested day, combining its pickup + dropoff rows. A date that has both
 * a weekly request and an ad-hoc request becomes two day entries (one per type). */
type DayEntry = {
  serviceDate: string;
  requestType: 'Regular' | 'Ad-hoc';
  pickup?: CombinedRequest;
  dropoff?: CombinedRequest;
};

/** All requested days that fall in the same Sunday→Saturday service week. */
type WeekGroup = {
  weekStart: string; // ISO Sunday of the week
  days: DayEntry[];
};

// ── Date helpers ─────────────────────────────────────────────────────────────

const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isoPlusDays = (iso: string, n: number): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toISODate(d);
};

const weekStartOf = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() - d.getDay()); // getDay(): 0 = Sunday
  return toISODate(d);
};

const weekLabel = (weekStart: string): string => {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fmt(weekStart)} – ${fmt(isoPlusDays(weekStart, 6))}`;
};

const dayLabel = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00`);
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })}, ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

// ── Normalizers ──────────────────────────────────────────────────────────────

const coordinateLabel = (lat?: number | null, lng?: number | null) => {
  if (lat == null || lng == null) return 'No location set';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

const normalizePickup = (request: PickupRequest): CombinedRequest => ({
  id: `pickup-${request.pickup_id}`,
  rawId: request.pickup_id,
  type: 'pickup',
  requestType: request.request_type ?? 'Regular',
  status: request.status,
  serviceDate: request.service_date,
  shiftTime: request.shift_start_time ?? '-',
  location: coordinateLabel(request.pickup_lat, request.pickup_lng),
  latitude: request.pickup_lat ?? OFFICE_LOCATION.latitude,
  longitude: request.pickup_lng ?? OFFICE_LOCATION.longitude,
  createdAt: request.created_at,
});

const normalizeDropoff = (request: DropoffRequest): CombinedRequest => ({
  id: `dropoff-${request.dropoff_id}`,
  rawId: request.dropoff_id,
  type: 'dropoff',
  requestType: 'Dropoff',
  status: request.status,
  serviceDate: request.service_date,
  shiftTime: request.shift_end_time ?? '-',
  location: coordinateLabel(request.drop_lat, request.drop_lng),
  latitude: request.drop_lat ?? OFFICE_LOCATION.latitude,
  longitude: request.drop_lng ?? OFFICE_LOCATION.longitude,
  createdAt: request.created_at,
});

/** Group pickup + dropoff rows by service week — one day entry per
 * (serviceDate, requestType), so an ad-hoc request shows as its own entry
 * alongside the day's weekly request. */
const buildGroups = (requests: CombinedRequest[]): WeekGroup[] => {
  const pickups = requests.filter(r => r.type === 'pickup');
  const dropoffs = requests.filter(r => r.type === 'dropoff');

  const byWeek = new Map<string, Map<string, DayEntry>>();
  const entries = new Map<string, DayEntry>();

  const getOrCreate = (serviceDate: string, requestType: 'Regular' | 'Ad-hoc'): DayEntry => {
    const key = `${serviceDate}|${requestType}`;
    let entry = entries.get(key);
    if (!entry) {
      entry = { serviceDate, requestType };
      entries.set(key, entry);
    }
    return entry;
  };

  const createdMs = (iso?: string | null) => (iso ? new Date(iso).getTime() : 0);

  for (const req of pickups) {
    const entry = getOrCreate(req.serviceDate, req.requestType === 'Ad-hoc' ? 'Ad-hoc' : 'Regular');
    // Duplicate rows on the same (date, type) can exist when a week was edited
    // after routing. Always show the NEWEST submission, not whichever row the
    // API happened to return last.
    if (!entry.pickup || createdMs(req.createdAt) > createdMs(entry.pickup.createdAt)) {
      entry.pickup = req;
    }
  }

  // Dropoffs carry no request_type — attach each to the pickup on the same date
  // whose created_at is nearest (weekly rows were written together in the request
  // window; ad-hoc rows together on the day), and inherit its type.
  for (const drop of dropoffs) {
    const sameDate = pickups.filter(p => p.serviceDate === drop.serviceDate);
    const created = (iso: string | null | undefined) => new Date(iso ?? 0).getTime();
    const nearest = sameDate.reduce<CombinedRequest | null>((best, p) => {
      if (best == null) return p;
      return Math.abs(created(p.createdAt) - created(drop.createdAt)) <=
             Math.abs(created(best.createdAt) - created(drop.createdAt)) ? p : best;
    }, null);
    const entry = nearest
      ? getOrCreate(drop.serviceDate, nearest.requestType === 'Ad-hoc' ? 'Ad-hoc' : 'Regular')
      : getOrCreate(drop.serviceDate, 'Regular');
    entry.dropoff = drop;
  }

  for (const [key, entry] of entries) {
    const ws = weekStartOf(entry.serviceDate);
    if (!byWeek.has(ws)) byWeek.set(ws, new Map());
    byWeek.get(ws)!.set(key, entry);
  }

  const groups: WeekGroup[] = [];
  for (const [weekStart, byDate] of byWeek) {
    groups.push({
      weekStart,
      days: [...byDate.values()].sort((a, b) =>
        a.serviceDate.localeCompare(b.serviceDate) ||
        a.requestType.localeCompare(b.requestType),
      ),
    });
  }
  groups.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return groups;
};

const dayStatus = (day: DayEntry): RequestStatus =>
  day.pickup?.status ?? day.dropoff?.status ?? 'Pending';

const groupStatus = (g: WeekGroup): RequestStatus => {
  const statuses = new Set(g.days.map(dayStatus));
  if (statuses.size === 1) return [...statuses][0];
  if (statuses.has('Approved')) return 'Approved';
  if (statuses.has('Pending')) return 'Pending';
  return 'Rejected';
};

const groupTitle = (g: WeekGroup): string => {
  const hasWeekly = g.days.some(d => d.pickup?.requestType === 'Regular');
  const hasAdhoc = g.days.some(d => d.pickup?.requestType === 'Ad-hoc');
  if (hasWeekly && hasAdhoc) return 'Transport Requests';
  return hasWeekly ? 'Weekly Request' : 'Ad-hoc Requests';
};

export const MyRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RequestTab>('all');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [groups, setGroups] = useState<WeekGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingDate, setCancelingDate] = useState<string | null>(null);
  const [scheduleCache, setScheduleCache] = useState<Record<string, ScheduleResponse>>({});
  const [scheduleLoading, setScheduleLoading] = useState<Record<string, boolean>>({});
  // Guards against firing the same date's fetch twice. Lives in a ref so the
  // fetch effect below doesn't re-run when scheduleLoading/scheduleCache
  // change (which used to cancel the in-flight request and leave the spinner
  // stuck on "Loading your route…" forever).
  const inFlightRef = useRef<Record<string, boolean>>({});

  // When an approved day is expanded, fetch the employee's real schedule for
  // that service date (stop + driver + vehicle) and cache it per date.
  useEffect(() => {
    if (!expandedKey) return;
    const [, serviceDate] = expandedKey.split('|');
    const day = groups.flatMap(g => g.days).find(d => d.serviceDate === serviceDate);
    if (!day || dayStatus(day) !== 'Approved') return;
    if (scheduleCache[serviceDate] || inFlightRef.current[serviceDate]) return;

    inFlightRef.current[serviceDate] = true;
    setScheduleLoading(prev => ({ ...prev, [serviceDate]: true }));
    employeeApi
      .getSchedule(serviceDate)
      .then(schedule => {
        setScheduleCache(prev => ({ ...prev, [serviceDate]: schedule }));
      })
      .catch(() => {
        // Leave the cache empty so re-expanding retries.
      })
      .finally(() => {
        inFlightRef.current[serviceDate] = false;
        setScheduleLoading(prev => ({ ...prev, [serviceDate]: false }));
      });
    // Only re-run when a *different* day is expanded or the data reloads —
    // not when the fetch updates scheduleLoading/scheduleCache.
  }, [expandedKey, groups]);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [pickups, dropoffs] = await Promise.all([
        pickupRequestApi.mine({ limit: 500 }),
        dropoffRequestApi.mine({ limit: 500 }),
      ]);

      setGroups(
        buildGroups([
          ...pickups.pickup_requests.map(normalizePickup),
          ...dropoffs.dropoff_requests.map(normalizeDropoff),
        ]),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load requests');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadRequests();
  }, []);

  const filteredGroups = groups
    .map(g => ({
      ...g,
      days: g.days.filter(d => {
        const s = dayStatus(d);
        if (activeTab === 'all') return true;
        if (activeTab === 'routed') return s === 'Approved';
        if (activeTab === 'pending') return s === 'Pending';
        return s === 'Rejected';
      }),
    }))
    .filter(g => g.days.length > 0);

  const allDays = groups.flatMap(g => g.days);
  const counts = {
    all: allDays.length,
    routed: allDays.filter(d => dayStatus(d) === 'Approved').length,
    pending: allDays.filter(d => dayStatus(d) === 'Pending').length,
    rejected: allDays.filter(d => dayStatus(d) === 'Rejected').length,
  };

  const handleCancel = async (day: DayEntry) => {
    setCancelingDate(day.serviceDate);
    setError(null);
    try {
      const ops: Promise<unknown>[] = [];
      if (day.pickup) ops.push(pickupRequestApi.remove(day.pickup.rawId));
      if (day.dropoff) ops.push(dropoffRequestApi.remove(day.dropoff.rawId));
      await Promise.all(ops);
      await loadRequests();
      if (expandedKey?.endsWith(day.serviceDate)) setExpandedKey(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setCancelingDate(null);
    }
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; cls: string }> = {
      Approved: { label: 'Approved', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
      Pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
      Rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
    };
    const m = map[status] || map.Pending;
    return (
      <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${m.cls}`}>
        {m.label}
      </span>
    );
  };

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>My Requests</h1>
          <p className="text-slate-500 text-sm">
            Your requests grouped by service week — edit them any time in the request window.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-5 py-4 mb-6">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-300/90">{error}</p>
          </div>
        )}

        {/* Stat pills */}
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1">
          {([
            ['all', 'All Requests', 'text-slate-400'],
            ['routed', 'Routed', 'text-emerald-400'],
            ['pending', 'Pending', 'text-amber-400'],
            ['rejected', 'Rejected', 'text-red-400'],
          ] as [typeof activeTab, string, string][]).map(([key, label, color]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                activeTab === key
                  ? 'bg-white/8 border-white/15 text-white'
                  : 'border-white/6 bg-white/3 text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
              <span className={`text-xs font-bold ${activeTab === key ? 'text-white' : color}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Week cards */}
        <div className="space-y-4">
          {isLoading && (
            <div className="text-center py-16 text-slate-600">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
              <p>Loading your requests...</p>
            </div>
          )}

          {!isLoading && filteredGroups.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No requests in this category.</p>
            </div>
          )}

          {filteredGroups.map(group => (
            <div key={group.weekStart} className="rounded-xl border border-white/8 bg-card overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                    <CalendarDays className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{groupTitle(group)}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {weekLabel(group.weekStart)} · {group.days.length} day{group.days.length > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <StatusBadge status={groupStatus(group)} />
              </div>

              {/* Day rows */}
              <div className="border-t border-white/6">
                {group.days.map(day => {
                  const key = `${group.weekStart}|${day.serviceDate}|${day.requestType}`;
                  const isExpanded = expandedKey === key;
                  const status = dayStatus(day);
                  const schedule = scheduleCache[day.serviceDate];
                  const stopLat = schedule?.routing_done && schedule.stop ? schedule.stop.latitude : (day.pickup?.latitude ?? OFFICE_LOCATION.latitude);
                  const stopLng = schedule?.routing_done && schedule.stop ? schedule.stop.longitude : (day.pickup?.longitude ?? OFFICE_LOCATION.longitude);

                  return (
                    <div key={key} className="border-t border-white/6 first:border-t-0">
                      <div
                        className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/3 transition"
                        onClick={() => setExpandedKey(isExpanded ? null : key)}
                      >
                        <div>
                          <p className="text-sm font-semibold text-white">{dayLabel(day.serviceDate)}</p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                            {day.pickup && (
                              <span className="flex items-center gap-1.5">
                                <ArrowUpRight className="w-3.5 h-3.5 text-sky-400" />
                                pickup {day.pickup.shiftTime}
                              </span>
                            )}
                            {day.dropoff && (
                              <span className="flex items-center gap-1.5">
                                <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
                                dropoff {day.dropoff.shiftTime}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {day.requestType === 'Ad-hoc' && (
                            <span className="text-xs px-2.5 py-1 rounded-full border font-medium bg-violet-500/15 text-violet-400 border-violet-500/20">
                              Ad-hoc
                            </span>
                          )}
                          <StatusBadge status={status} />
                          {status === 'Pending' && (
                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleCancel(day);
                              }}
                              disabled={cancelingDate === day.serviceDate}
                              className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/8 text-xs font-medium text-red-300 hover:bg-red-500/15 transition disabled:opacity-60"
                            >
                              {cancelingDate === day.serviceDate ? 'Canceling...' : 'Cancel'}
                            </button>
                          )}
                          <ChevronDown className={`w-4 h-4 text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>

                      {/* Expanded day details */}
                      {isExpanded && (
                        <div className="px-5 pb-5">
                          <div className="pt-3 grid grid-cols-1 lg:grid-cols-2 gap-5">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 gap-3">
                                {day.pickup && (
                                  <div className="rounded-xl border border-sky-500/15 bg-sky-500/5 p-3">
                                    <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                                      <ArrowUpRight className="w-3 h-3 text-sky-400" /> Pickup
                                    </p>
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
                                      <div className="text-sm text-slate-300">
                                        <AddressText lat={day.pickup.latitude} lng={day.pickup.longitude} />
                                        <p className="text-xs text-slate-600 mt-0.5 font-mono">{coordinateLabel(day.pickup.latitude, day.pickup.longitude)}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Shift start {day.pickup.shiftTime}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {day.dropoff && (
                                  <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/5 p-3">
                                    <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider flex items-center gap-1.5">
                                      <ArrowDownLeft className="w-3 h-3 text-emerald-400" /> Dropoff
                                    </p>
                                    <div className="flex items-start gap-2">
                                      <MapPin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                      <div className="text-sm text-slate-300">
                                        <AddressText lat={day.dropoff.latitude} lng={day.dropoff.longitude} />
                                        <p className="text-xs text-slate-600 mt-0.5 font-mono">{coordinateLabel(day.dropoff.latitude, day.dropoff.longitude)}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Shift end {day.dropoff.shiftTime}</p>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {status === 'Approved' && (
                                <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/6 p-4 space-y-3">
                                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Route Assignment</p>
                                  {scheduleLoading[day.serviceDate] ? (
                                    <div className="flex items-center gap-2 text-sm text-slate-500">
                                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                                      Loading your route...
                                    </div>
                                  ) : schedule?.routing_done && schedule.stop ? (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Route className="w-4 h-4 text-emerald-400" />
                                        <p className="text-sm text-slate-300 capitalize">
                                          {schedule.route_type === 'pickup' ? 'Pickup stop' : 'Dropoff stop'} · stop {schedule.stop.sequence_order}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-sky-400 flex-shrink-0" />
                                        <div className="text-sm">
                                          <AddressText lat={schedule.stop.latitude} lng={schedule.stop.longitude} />
                                          <p className="text-xs text-slate-600 font-mono">{coordinateLabel(schedule.stop.latitude, schedule.stop.longitude)}</p>
                                        </div>
                                      </div>
                                      {schedule.stop.arrival_time && (
                                        <div className="flex items-center gap-2">
                                          <Clock className="w-4 h-4 text-amber-400" />
                                          <p className="text-sm text-slate-300">
                                            {schedule.route_type === 'pickup' ? 'Pickup at' : 'Dropoff at'}: {schedule.stop.arrival_time}
                                          </p>
                                        </div>
                                      )}
                                      {schedule.driver && (
                                        <div className="flex items-center gap-2">
                                          <UserIcon className="w-4 h-4 text-sky-400" />
                                          <p className="text-sm text-slate-300">
                                            Driver: {schedule.driver.name}{schedule.driver.phone ? ` · ${schedule.driver.phone}` : ''}
                                          </p>
                                        </div>
                                      )}
                                      {schedule.vehicle && (
                                        <div className="flex items-center gap-2">
                                          <Car className="w-4 h-4 text-sky-400" />
                                          <p className="text-sm text-slate-300">Vehicle: {schedule.vehicle.plate_no ?? '—'}</p>
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <Route className="w-4 h-4 text-emerald-400" />
                                        <p className="text-sm text-slate-300">
                                          Route assigned — stop details will appear after routing completes.
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-amber-400" />
                                        <p className="text-sm text-slate-300">Scheduled time: {day.pickup?.shiftTime ?? day.dropoff?.shiftTime}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Map */}
                            <div>
                              <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Location Map</p>
                              <InteractiveMap
                                center={[stopLat, stopLng]}
                                zoom={14}
                                markers={[
                                  { position: [stopLat, stopLng], label: schedule?.routing_done ? 'Your Stop' : 'Your Location', color: '#0EA5E9' },
                                  ...(status === 'Approved'
                                    ? [{ position: [OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude] as [number, number], label: 'Office', color: '#10B981' }]
                                    : []),
                                ]}
                                showRoute={status === 'Approved'}
                                height="240px"
                                lazy
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Sidebar>
  );
};
