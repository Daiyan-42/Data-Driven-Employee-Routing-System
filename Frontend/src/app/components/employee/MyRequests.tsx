import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle, Car, User as UserIcon, Route, Navigation } from 'lucide-react';
import { mockRequests } from '../../data/mockData';
import { InteractiveMap } from '../shared/InteractiveMap';
import { OFFICE_LOCATION } from '../../data/mockData';

export const MyRequests: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'routed' | 'pending' | 'rejected'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = mockRequests.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'routed') return r.status === 'routed' || r.status === 'approved';
    return r.status === activeTab;
  });

  const counts = {
    all: mockRequests.length,
    routed: mockRequests.filter(r => r.status === 'routed' || r.status === 'approved').length,
    pending: mockRequests.filter(r => r.status === 'pending').length,
    rejected: mockRequests.filter(r => r.status === 'rejected').length,
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const map: Record<string, { label: string; cls: string }> = {
      routed: { label: 'Routed', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
      approved: { label: 'Approved', cls: 'bg-sky-500/15 text-sky-400 border-sky-500/20' },
      pending: { label: 'Pending', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
      rejected: { label: 'Rejected', cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
    };
    const m = map[status] || map.pending;
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
          {filtered.length === 0 && (
            <div className="text-center py-16 text-slate-600">
              <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No requests in this category.</p>
            </div>
          )}

          {filtered.map(req => {
            const isExpanded = expandedId === req.id;
            const isRouted = req.status === 'routed' || req.status === 'approved';
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
                          <p className="text-xs text-slate-600 mb-1 uppercase tracking-wider">Pickup Location</p>
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
                                <p className="text-sm text-slate-300">{req.assignedRoute}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Car className="w-4 h-4 text-sky-400" />
                                <p className="text-sm text-slate-300">{req.assignedVehicle}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <UserIcon className="w-4 h-4 text-sky-400" />
                                <p className="text-sm text-slate-300">{req.assignedDriver}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400" />
                                <p className="text-sm text-slate-300">ETA: {req.estimatedTime}</p>
                              </div>
                              {req.stopOrder && (
                                <div className="flex items-center gap-2">
                                  <Navigation className="w-4 h-4 text-purple-400" />
                                  <p className="text-sm text-slate-300">Stop #{req.stopOrder} on route</p>
                                </div>
                              )}
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
