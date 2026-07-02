import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import {
  Map, Users, Clock, MapPin, CheckCircle, Navigation,
  ChevronDown, ChevronUp, Car, Coffee, Home, Play, Flag,
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { InteractiveMap } from '../shared/InteractiveMap';
import { mockRoutePlans, mockVehicles, mockDrivers } from '../../data/mockData';
import { useAuth } from '../../context/AuthContext';

export const DriverTodaysTrips: React.FC = () => {
  const { user } = useAuth();
  const [routes, setRoutes] = useState(mockRoutePlans);
  const [expanded, setExpanded] = useState<string[]>([mockRoutePlans[0]?.id]);

  const driver = mockDrivers.find(d => d.userId === user?.id);
  const vehicle = mockVehicles.find(v => v.id === driver?.vehicleId);

  const myRoutes = routes; // in real app filter by driverId

  const toggleExpand = (id: string) => {
    setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const togglePassenger = (routeId: string, stopId: string, passId: string) => {
    setRoutes(prev =>
      prev.map(r =>
        r.id !== routeId ? r : {
          ...r,
          stops: r.stops.map(s =>
            s.id !== stopId ? s : {
              ...s,
              passengers: s.passengers.map(p =>
                p.id !== passId ? p : { ...p, isBoarded: !p.isBoarded }
              ),
            }
          ),
        }
      )
    );
  };

  const changeStatus = (routeId: string, status: 'not-started' | 'in-progress' | 'completed') => {
    setRoutes(prev => prev.map(r => r.id === routeId ? { ...r, status } : r));
  };

  const completedCount = myRoutes.filter(r => r.status === 'completed').length;
  const inProgressRoute = myRoutes.find(r => r.status === 'in-progress');
  const allDone = myRoutes.length > 0 && completedCount === myRoutes.length;

  const statusStyle: Record<string, string> = {
    'not-started': 'bg-slate-500/15 text-slate-400 border-slate-500/20',
    'in-progress': 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    'completed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
  };
  const statusLabel: Record<string, string> = {
    'not-started': 'Not Started',
    'in-progress': 'In Progress',
    'completed': 'Completed',
  };

  return (
    <Sidebar role="driver">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            {"Today's Trips"}
          </h1>
          <p className="text-slate-500 text-sm">
            {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        {/* Status message */}
        {allDone && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-5 py-4 mb-6">
            <Home className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">All trips completed!</p>
              <p className="text-xs text-slate-500 mt-0.5">Return to your parking location — Khilgaon Depot. Have a safe drive!</p>
            </div>
          </div>
        )}

        {!allDone && !inProgressRoute && myRoutes.some(r => r.status === 'not-started') && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/15 bg-amber-500/6 px-5 py-4 mb-6">
            <Coffee className="w-5 h-5 text-amber-400" />
            <div>
              <p className="text-sm font-semibold text-amber-300">Standby at Office</p>
              <p className="text-xs text-slate-500 mt-0.5">Wait at the office departure bay until the next trip starts.</p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-white/8 bg-card px-5 py-4">
            <p className="text-sm text-slate-500 mb-1">Total Trips</p>
            <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{myRoutes.length}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-card px-5 py-4">
            <p className="text-sm text-slate-500 mb-1">Completed</p>
            <p className="text-2xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{completedCount}</p>
          </div>
          <div className="rounded-xl border border-white/8 bg-card px-5 py-4">
            <p className="text-sm text-slate-500 mb-1">In Progress</p>
            <p className="text-2xl font-bold text-sky-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {myRoutes.filter(r => r.status === 'in-progress').length}
            </p>
          </div>
          <div className="rounded-xl border border-white/8 bg-card px-5 py-4">
            <p className="text-sm text-slate-500 mb-1">Passengers Today</p>
            <p className="text-2xl font-bold text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {myRoutes.reduce((a, r) => a + r.stops.reduce((b, s) => b + s.passengers.length, 0), 0)}
            </p>
          </div>
        </div>

        {/* Trips */}
        <div className="space-y-4">
          {myRoutes.map(route => {
            const isOpen = expanded.includes(route.id);
            const totalPax = route.stops.reduce((a, s) => a + s.passengers.length, 0);
            const boardedPax = route.stops.reduce((a, s) => a + s.passengers.filter(p => p.isBoarded).length, 0);

            return (
              <div key={route.id} className="rounded-xl border border-white/8 bg-card overflow-hidden">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/3 transition"
                  onClick={() => toggleExpand(route.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
                      <Navigation className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold text-white">{route.name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle[route.status]}`}>
                          {statusLabel[route.status]}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{route.timeSlot}</span>
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{route.stops.length} stops</span>
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{boardedPax}/{totalPax} boarded</span>
                        <span className="flex items-center gap-1"><Car className="w-3 h-3" />{route.totalDistance}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {route.status === 'not-started' && (
                      <button
                        onClick={e => { e.stopPropagation(); changeStatus(route.id, 'in-progress'); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold transition"
                      >
                        <Play className="w-3 h-3" />
                        Start
                      </button>
                    )}
                    {route.status === 'in-progress' && (
                      <button
                        onClick={e => { e.stopPropagation(); changeStatus(route.id, 'completed'); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-semibold transition"
                      >
                        <Flag className="w-3 h-3" />
                        Complete
                      </button>
                    )}
                    {isOpen ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div className="border-t border-white/6 p-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Map */}
                      <div>
                        <p className="text-xs text-slate-600 mb-3 uppercase tracking-wider">Route Map</p>
                        <InteractiveMap
                          center={[route.stops[0].latitude, route.stops[0].longitude]}
                          markers={route.stops.map(s => ({
                            position: [s.latitude, s.longitude] as [number, number],
                            label: `Stop ${s.order}: ${s.location}`,
                            color: s.type === 'pickup' ? '#0EA5E9' : '#10B981',
                          }))}
                          showRoute
                          height="380px"
                        />
                        <div className="grid grid-cols-3 gap-2 mt-3">
                          <div className="rounded-lg border border-white/6 bg-white/3 p-3 text-center">
                            <p className="text-xs text-slate-600">Distance</p>
                            <p className="text-base font-bold text-white mt-0.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{route.totalDistance}</p>
                          </div>
                          <div className="rounded-lg border border-white/6 bg-white/3 p-3 text-center">
                            <p className="text-xs text-slate-600">Duration</p>
                            <p className="text-base font-bold text-white mt-0.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{route.totalDuration}</p>
                          </div>
                          <div className="rounded-lg border border-white/6 bg-white/3 p-3 text-center">
                            <p className="text-xs text-slate-600">Stops</p>
                            <p className="text-base font-bold text-white mt-0.5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{route.stops.length}</p>
                          </div>
                        </div>
                      </div>

                      {/* Stops */}
                      <div>
                        <p className="text-xs text-slate-600 mb-3 uppercase tracking-wider">Stops & Passengers</p>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                          {route.stops.map((stop, idx) => (
                            <div key={stop.id}>
                              {stop.travelFromPrev && stop.travelFromPrev !== 'Start' && (
                                <div className="flex items-center gap-2 pl-8 py-1 text-xs text-slate-700">
                                  <div className="w-0.5 h-4 bg-white/6 ml-3.5" />
                                  <span>{stop.travelFromPrev}</span>
                                </div>
                              )}
                              <div className="rounded-xl border border-white/6 bg-white/3 p-4">
                                <div className="flex items-start gap-3">
                                  <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                                    stop.type === 'pickup' ? 'bg-sky-500' : 'bg-emerald-500'
                                  }`}>
                                    {stop.order}
                                  </div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-sm font-medium text-white">{stop.location}</p>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-600 font-mono">{stop.estimatedTime}</span>
                                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${stop.type === 'pickup' ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                          {stop.type}
                                        </span>
                                      </div>
                                    </div>

                                    {stop.passengers.length > 0 && (
                                      <div className="space-y-1.5 mt-2">
                                        {stop.passengers.map(pax => (
                                          <div key={pax.id} className="flex items-center justify-between bg-white/3 rounded-lg px-3 py-2 border border-white/5">
                                            <div className="flex items-center gap-2">
                                              <div className={`w-1.5 h-1.5 rounded-full ${pax.isBoarded ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                              <span className="text-xs text-slate-300 font-medium">{pax.name}</span>
                                              <span className="text-xs text-slate-600">{pax.phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                              <span className="text-xs text-slate-600">{pax.isBoarded ? 'Boarded' : 'Waiting'}</span>
                                              <Switch
                                                checked={pax.isBoarded}
                                                onCheckedChange={() => togglePassenger(route.id, stop.id, pax.id)}
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {stop.passengers.length === 0 && (
                                      <p className="text-xs text-slate-700 mt-1 italic">Destination stop — no boardings</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
