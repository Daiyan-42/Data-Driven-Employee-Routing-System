import React, { useEffect, useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Car, Calendar, Users, MapPin, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { driverApi } from '../../services/transportApi';
import type { DriverAssignmentRoute, DriverSelfProfile } from '../../types/api';

export const DriverVehicleInfo: React.FC = () => {
  const [profile, setProfile] = useState<DriverSelfProfile | null>(null);
  const [assignment, setAssignment] = useState<DriverAssignmentRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [profileData, assignmentData] = await Promise.all([driverApi.getMe(), driverApi.getTodayAssignment()]);
        setProfile(profileData);
        setAssignment(assignmentData.routes?.[0] ?? null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load vehicle info');
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, []);

  const vehicle = profile?.vehicle;
  const departureTime = assignment?.assignment?.departure_time ?? '—';
  const assignedRoute = assignment?.zone_name ? `${assignment.zone_name} route` : 'No route assigned';
  const totalStops = assignment?.stops?.length ?? 0;
  const totalPassengers = assignment?.stops?.reduce((acc, stop) => acc + (stop.passengers?.length ?? 0), 0) ?? 0;

  return (
    <Sidebar role="driver">
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Vehicle Information</h1>
          <p className="text-gray-600 mt-1">Details about your assigned vehicle and route</p>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-sm text-slate-500 mb-4">Loading your vehicle and route…</p>}

        {/* Vehicle Card */}
        <Card className="border-0 shadow-xl mb-6">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
            <div className="flex items-center gap-4">
              <div className="bg-blue-600 rounded-2xl p-4">
                <Car className="w-12 h-12 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl">{vehicle?.plate_no ?? '—'}</CardTitle>
                <CardDescription className="text-base">{vehicle?.make ?? 'Vehicle'} {vehicle?.model ?? ''}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-green-100 rounded-lg p-3">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Capacity</p>
                  <p className="text-2xl font-bold text-gray-900">{profile?.vehicle ? 'Assigned' : '—'}</p>
                  <p className="text-xs text-gray-500">Passengers</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-blue-100 rounded-lg p-3">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle Type</p>
                  <p className="text-xl font-bold text-gray-900">{vehicle?.make ?? '—'}</p>
                  <Badge className="mt-1 bg-blue-500">Active</Badge>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="bg-orange-100 rounded-lg p-3">
                  <MapPin className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Vehicle ID</p>
                  <p className="text-xl font-bold text-gray-900">{vehicle?.vehicle_id ?? '—'}</p>
                  <p className="text-xs text-gray-500">System ID</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Assignment Card */}
        <Card className="border-0 shadow-xl mb-6">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>Route Assignment</CardTitle>
            <CardDescription>Your current route assignment details</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="bg-blue-600 rounded-lg p-3">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-blue-700 mb-1">Assigned Route</p>
                  <p className="text-xl font-bold text-blue-900">{assignedRoute}</p>
                  <p className="text-sm text-blue-600 mt-2">
                    {totalStops} stops • {totalPassengers} passengers
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-green-100 rounded-lg p-3">
                    <Clock className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Departure Time</p>
                    <p className="text-2xl font-bold text-gray-900">{departureTime}</p>
                    <p className="text-xs text-gray-500">Today, {new Date().toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="bg-purple-100 rounded-lg p-3">
                    <Calendar className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Route Type</p>
                    <p className="text-2xl font-bold text-gray-900">Daily</p>
                    <p className="text-xs text-gray-500">Recurring Schedule</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Route Stops Summary */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>Route Stops</CardTitle>
            <CardDescription>List of all stops on your assigned route</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {assignment?.stops?.map((stop) => (
                <div
                  key={`${stop.stop_id ?? stop.sequence_order ?? 'stop'}-${stop.sequence_order ?? 0}`}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                    {stop.sequence_order}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900 truncate">Stop {stop.sequence_order}</p>
                      <Badge className="bg-blue-500">
                        Stop
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {stop.arrival_time ?? '—'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {(stop.passengers?.length ?? 0)} passenger{(stop.passengers?.length ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
};
