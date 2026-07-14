import React, { useEffect, useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Calendar, MapPin, Clock, AlertCircle, Car, User as UserIcon, Route } from 'lucide-react';
import { InteractiveMap } from '../shared/InteractiveMap';
import { OFFICE_LOCATION } from '../../data/mockData';
import { dropoffRequestApi, pickupRequestApi } from '../../services/transportApi';
import type { DropoffRequest, PickupRequest, RequestStatus } from '../../types/api';

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

export const MyRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<RequestTab>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [requests, setRequests] = useState<CombinedRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [pickups, dropoffs] = await Promise.all([
        pickupRequestApi.mine({ limit: 500 }),
        dropoffRequestApi.mine({ limit: 500 }),
      ]);

      setRequests(
        [
          ...pickups.pickup_requests.map(normalizePickup),
          ...dropoffs.dropoff_requests.map(normalizeDropoff),
        ].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')),
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

  const filtered = requests.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'routed') return r.status === 'Approved';
    if (activeTab === 'pending') return r.status === 'Pending';
    return r.status === 'Rejected';
  });

  const counts = {
    all: requests.length,
    routed: requests.filter(r => r.status === 'Approved').length,
    pending: requests.filter(r => r.status === 'Pending').length,
    rejected: requests.filter(r => r.status === 'Rejected').length,
  };

  const handleCancel = async (request: CombinedRequest) => {
    setCancelingId(request.id);
    setError(null);

    try {
      if (request.type === 'pickup') {
        await pickupRequestApi.remove(request.rawId);
      } else {
        await dropoffRequestApi.remove(request.rawId);
      }
      setRequests(prev => prev.filter(item => item.id !== request.id));
      if (expandedId === request.id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request');
    } finally {
      setCancelingId(null);
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
          <p className="text-slate-500 text-sm">Track all your submitted transport requests.</p>
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

        {/* Request cards */}
        <div className="space-y-3">
          {isLoading && (
            <div className="text-center py-16 text-slate-600">
              <Clock className="w-10 h-10 mx-auto mb-3 opacity-30 animate-pulse" />
              <p>Loading your requests...</p>
            </div>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No requests in this category.</p>
            </div>
          )}

          {filtered.map(req => {
            const isExpanded = expandedId === req.id;
            const isRouted = req.status === 'Approved';
            const canCancel = req.status === 'Pending';
            return (
              <div key={req.id} className="rounded-xl border border-white/8 bg-card overflow-hidden">
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      req.type === 'pickup' ? 'bg-sky-500/15 border border-sky-500/20' :
                      req.type === 'dropoff' ? 'bg-emerald-500/15 border border-emerald-500/20' :
                      'bg-amber-500/15 border border-amber-500/20'
                    }`}>
                      <MapPin className={`w-4 h-4 ${
                        req.type === 'pickup' ? 'text-sky-400' :
                        req.type === 'dropoff' ? 'text-emerald-400' :
                        'text-amber-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-white capitalize">{req.type} Service</p>
                        <span className="text-xs text-slate-600">·</span>
                        <p className="text-xs text-slate-500 capitalize">{req.requestType}</p>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {req.serviceDate}
                        </span>
                        <span className="text-xs text-slate-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {req.shiftTime}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={req.status} />
                    {canCancel && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleCancel(req);
                        }}
                        disabled={cancelingId === req.id}
                        className="px-3 py-1.5 rounded-lg border border-red-500/20 bg-red-500/8 text-xs font-medium text-red-300 hover:bg-red-500/15 transition disabled:opacity-60"
                      >
                        {cancelingId === req.id ? 'Canceling...' : 'Cancel'}
                      </button>
                    )}
                    <div className={`text-slate-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-white/6">
                    <div className="pt-4 grid grid-cols-1 lg:grid-cols-2 gap-5">
                      {/* Info */}
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider">
                            {req.type === 'pickup' ? 'Pickup Location' : 'Dropoff Location'}
                          </p>
                          <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-slate-600 mt-0.5" />
                            <p className="text-sm text-slate-300">{req.location}</p>
                          </div>
                        </div>

                        {isRouted ? (
                          <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/6 p-4 space-y-3">
                            <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Route Assignment</p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Route className="w-4 h-4 text-emerald-400" />
                                <p className="text-sm text-slate-300">Route pending assignment details</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-sky-400" />
                                <p className="text-sm text-slate-300">Vehicle will appear after routing</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-sky-400" />
                                <p className="text-sm text-slate-300">Driver will appear after routing</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <p className="text-sm text-slate-300">Scheduled time: {req.shiftTime}</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-white/6 bg-white/3 p-4">
                            <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider">Route Status</p>
                            <p className="text-sm text-slate-500 italic">Not routed yet — check back after admin processes requests.</p>
                          </div>
                        )}
                      </div>

                      {/* Map */}
                      <div>
                        <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Location Map</p>
                        <InteractiveMap
                          center={[req.latitude, req.longitude]}
                          zoom={14}
                          markers={[
                            { position: [req.latitude, req.longitude], label: 'Your Location', color: '#0EA5E9' },
                            ...(isRouted ? [{ position: [OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude] as [number, number], label: 'Office', color: '#10B981' }] : []),
                          ]}
                          showRoute={isRouted}
                          height="260px"
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
    </Sidebar>
  );
};
