import React, { useEffect, useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Map, Users, Clock, MapPin, CheckCircle, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { InteractiveMap } from '../shared/InteractiveMap';
import { driverApi } from '../../services/transportApi';
import type { DriverAssignmentStop } from '../../types/api';

interface Route {
  id: string;
  name: string;
  timeSlot: string;
  status: 'not-started' | 'in-progress' | 'completed';
  assignmentId: number | null;
  stops: DriverAssignmentStop[];
}

const normalizeStatus = (value?: string | null): Route['status'] => {
  const status = (value ?? '').toLowerCase();
  if (status === 'inprogress' || status === 'in-progress') return 'in-progress';
  if (status === 'completed') return 'completed';
  return 'not-started';
};

export const DriverRoute: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [expandedRoutes, setExpandedRoutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        setLoading(true);
        const data = await driverApi.getTodayAssignment();
        const mappedRoutes = (data.routes ?? []).map((route, index) => ({
          id: String(route.route_id ?? index + 1),
          name: route.zone_name ? `${route.zone_name} route` : `Route ${index + 1}`,
          timeSlot: route.shift_time ?? 'Today',
          status: normalizeStatus(route.assignment?.status),
          assignmentId: route.assignment?.assignment_id ?? null,
          stops: route.stops ?? [],
        }));
        setRoutes(mappedRoutes);
        if (mappedRoutes.length > 0) {
          setExpandedRoutes([mappedRoutes[0].id]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load assignments');
      } finally {
        setLoading(false);
      }
    };

    void loadAssignments();
  }, []);

  const toggleRouteExpansion = (routeId: string) => {
    setExpandedRoutes(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId],
    );
  };

  const handlePassengerToggle = async (routeId: string, stopId: number, employeeId: number) => {
    if (!stopId || !employeeId) return;

    try {
      await driverApi.boardPassenger(stopId, employeeId);
      setRoutes(prev =>
        prev.map(item =>
          item.id === routeId
            ? {
                ...item,
                stops: item.stops.map(routeStop =>
                  routeStop.stop_id === stopId
                    ? {
                        ...routeStop,
                        passengers: routeStop.passengers.map(passenger =>
                          passenger.employee_id === employeeId
                            ? { ...passenger, boarded: true }
                            : passenger,
                        ),
                      }
                    : routeStop,
                ),
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update boarding status');
    }
  };

  const handleRouteStatusChange = async (routeId: string, newStatus: Route['status']) => {
    const route = routes.find(item => item.id === routeId);
    if (!route?.assignmentId) return;

    try {
      if (newStatus === 'in-progress') {
        await driverApi.startAssignment(route.assignmentId);
      } else {
        await driverApi.completeAssignment(route.assignmentId);
      }
      setRoutes(prev => prev.map(item => (item.id === routeId ? { ...item, status: newStatus } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update route status');
    }
  };

  const getStatusColor = (status: Route['status']) => {
    switch (status) {
      case 'not-started':
        return 'bg-gray-100 text-gray-700';
      case 'in-progress':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
    }
  };

  const getStatusLabel = (status: Route['status']) => {
    switch (status) {
      case 'not-started':
        return 'Not Started';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
    }
  };

  return (
    <Sidebar role="driver">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Today's Routes</h1>
          <p className="text-gray-600 mt-1">Manage your route and passenger boarding status for today</p>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-sm text-slate-500 mb-4">Loading today's assignments…</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Routes</p>
                  <p className="text-2xl font-bold text-gray-900">{routes.length}</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-3">
                  <Map className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-blue-600">{routes.filter(r => r.status === 'in-progress').length}</p>
                </div>
                <div className="bg-blue-100 rounded-lg p-3">
                  <Navigation className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{routes.filter(r => r.status === 'completed').length}</p>
                </div>
                <div className="bg-green-100 rounded-lg p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Passengers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {routes.reduce((acc, route) => acc + route.stops.reduce((stopAcc, stop) => stopAcc + (stop.passengers?.length ?? 0), 0), 0)}
                  </p>
                </div>
                <div className="bg-orange-100 rounded-lg p-3">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {routes.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-gray-700 p-8 text-center text-gray-500">
            No route assignments were returned for today.
          </div>
        )}

        <div className="space-y-6">
          {routes.map((route) => {
            const isExpanded = expandedRoutes.includes(route.id);
            const totalPassengers = route.stops.reduce((acc, stop) => acc + (stop.passengers?.length ?? 0), 0);
            const boardedPassengers = route.stops.reduce((acc, stop) => acc + (stop.passengers?.filter(p => p.boarded).length ?? 0), 0);

            return (
              <Card key={route.id} className="border-0 shadow-lg">
                <CardHeader
                  className="border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleRouteExpansion(route.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <CardTitle>{route.name}</CardTitle>
                        <Badge className={getStatusColor(route.status)}>{getStatusLabel(route.status)}</Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {route.timeSlot}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {route.stops.length} stops
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {boardedPassengers}/{totalPassengers} boarded
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-2">
                        {route.status === 'not-started' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRouteStatusChange(route.id, 'in-progress');
                            }}
                          >
                            Start Route
                          </Button>
                        )}
                        {route.status === 'in-progress' && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleRouteStatusChange(route.id, 'completed');
                            }}
                          >
                            Complete Route
                          </Button>
                        )}
                      </div>
                      {isExpanded ? <ChevronUp className="w-6 h-6 text-gray-400" /> : <ChevronDown className="w-6 h-6 text-gray-400" />}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Route Map</h3>
                        <InteractiveMap
                          center={route.stops[0]?.latitude && route.stops[0]?.longitude ? [route.stops[0].latitude, route.stops[0].longitude] : [23.8103, 90.4125]}
                          markers={route.stops.map((stop) => ({
                            position: [stop.latitude ?? 23.8103, stop.longitude ?? 90.4125] as [number, number],
                            label: `Stop ${stop.sequence_order ?? 1}`,
                            color: '#2563EB',
                          }))}
                          showRoute={route.stops.length > 1}
                          height="400px"
                        />

                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-blue-600 font-medium">Distance</p>
                            <p className="text-lg font-bold text-blue-900 mt-1">{(route.stops.length * 3.2).toFixed(1)} km</p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-green-600 font-medium">Duration</p>
                            <p className="text-lg font-bold text-green-900 mt-1">{route.stops.length * 12} mins</p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-orange-600 font-medium">Stops</p>
                            <p className="text-lg font-bold text-orange-900 mt-1">{route.stops.length}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Route Stops & Passengers</h3>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                          {route.stops.map((stop, index) => {
                            const nextStop = route.stops[index + 1];
                            return (
                              <div key={`${stop.stop_id ?? 'stop'}-${index}`}>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm bg-blue-500">
                                        {stop.sequence_order}
                                      </div>
                                      {nextStop && <div className="w-0.5 h-full bg-gray-300 mt-2"></div>}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold text-sm text-gray-900">Stop {stop.sequence_order}</p>
                                          <p className="text-xs text-gray-500">{stop.arrival_time ?? '—'}</p>
                                        </div>
                                        <Badge className="bg-blue-100 text-blue-700">Stop</Badge>
                                      </div>

                                      {(stop.passengers?.length ?? 0) > 0 && (
                                        <div className="mt-3 space-y-2">
                                          {stop.passengers?.map((passenger, passengerIndex) => (
                                            <div key={`${passenger.employee_id ?? 'employee'}-${passengerIndex}`} className="flex items-center justify-between bg-white rounded p-2 border border-gray-200">
                                              <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${passenger.boarded ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                <span className="text-sm font-medium text-gray-900">
                                                  {passenger.employee_name ?? `Employee ${passenger.employee_id ?? ''}`}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Label htmlFor={`passenger-${passenger.employee_id ?? passengerIndex}`} className="text-xs text-gray-600">
                                                  {passenger.boarded ? 'Boarded' : 'Waiting'}
                                                </Label>
                                                <Switch
                                                  id={`passenger-${passenger.employee_id ?? passengerIndex}`}
                                                  checked={passenger.boarded}
                                                  onCheckedChange={() => void handlePassengerToggle(route.id, stop.stop_id ?? 0, passenger.employee_id ?? 0)}
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {nextStop && <div className="ml-4 pl-8 py-1"><p className="text-xs text-gray-500">↓ 3.2 km • 12 mins</p></div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </Sidebar>
  );
};
