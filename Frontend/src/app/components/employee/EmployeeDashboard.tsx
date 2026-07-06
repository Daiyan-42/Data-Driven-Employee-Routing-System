import React, { useEffect, useState } from "react";
import { Sidebar } from "../shared/Sidebar";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  ArrowRight,
  Car,
  User,
  Loader2,
  Navigation,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useNavigate } from "react-router";
import {
  employeeApi,
  pickupRequestApi,
  dropoffRequestApi,
} from "../../services/transportApi";
import type { ScheduleResponse } from "../../types/api";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

// Reuse the same icon fix (idempotent)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const todayString = () => new Date().toISOString().split("T")[0];

interface RequestCounts {
  pending: number;
  approved: number;
  rejected: number;
}

export const EmployeeDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Schedule state
  const [serviceDate, setServiceDate] = useState(todayString());
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Request counts state
  const [counts, setCounts] = useState<RequestCounts>({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [countsLoading, setCountsLoading] = useState(true);

  // Load schedule
  useEffect(() => {
    setScheduleLoading(true);
    setScheduleError(null);
    employeeApi
      .getSchedule(serviceDate)
      .then(setSchedule)
      .catch(() => setScheduleError("Could not load schedule."))
      .finally(() => setScheduleLoading(false));
  }, [serviceDate]);

  // Load request counts (pickup + dropoff)
  useEffect(() => {
    setCountsLoading(true);
    Promise.all([
      pickupRequestApi.list({ service_date: serviceDate }),
      dropoffRequestApi.list({ service_date: serviceDate }),
    ])
      .then(([pickups, dropoffs]) => {
        const allRequests = [
          ...pickups.pickup_requests.map((r) => r.status),
          ...dropoffs.dropoff_requests.map((r) => r.status as string),
        ];
        setCounts({
          pending: allRequests.filter((s) => s === "Pending").length,
          approved: allRequests.filter((s) => s === "Approved").length,
          rejected: allRequests.filter((s) => s === "Rejected").length,
        });
      })
      .catch(() => {
        /* silently ignore count errors */
      })
      .finally(() => setCountsLoading(false));
  }, [serviceDate]);

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back! Here's your transport overview
            </p>
          </div>

          {/* Date selector */}
          <div className="flex items-center gap-2">
            <Label
              htmlFor="date-picker"
              className="text-sm text-gray-600 whitespace-nowrap"
            >
              Service date:
            </Label>
            <Input
              id="date-picker"
              type="date"
              value={serviceDate}
              onChange={(e) => setServiceDate(e.target.value)}
              className="w-44"
            />
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Pending Requests
                  </p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">
                    {countsLoading ? "—" : counts.pending}
                  </p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <AlertCircle className="w-6 h-6 text-orange-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                Awaiting approval
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Approved Requests
                  </p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {countsLoading ? "—" : counts.approved}
                  </p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <CheckCircle className="w-4 h-4 mr-1" />
                Ready to go
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Rejected Requests
                  </p>
                  <p className="text-3xl font-bold text-red-600 mt-2">
                    {countsLoading ? "—" : counts.rejected}
                  </p>
                </div>
                <div className="bg-red-100 rounded-full p-3">
                  <XCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <XCircle className="w-4 h-4 mr-1" />
                Not approved
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card
            className="border-0 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate("/employee/pickup")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Request Pickup Service
                  </h3>
                  <p className="text-sm text-gray-600">
                    Book a ride to the office
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-0 shadow-md hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer"
            onClick={() => navigate("/employee/dropoff")}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Request Dropoff Service
                  </h3>
                  <p className="text-sm text-gray-600">Book a ride back home</p>
                </div>
                <ArrowRight className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Route / Schedule */}
        <Card className="border-0 shadow-md mb-8">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Navigation className="w-5 h-5 text-blue-600" />
              Assigned Route — {serviceDate}
            </CardTitle>
            <CardDescription>
              Your scheduled pickup/dropoff for the selected date
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {scheduleLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : scheduleError ? (
              <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">
                {scheduleError}
              </div>
            ) : !schedule?.routing_done ? (
              /* Routing not yet run */
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="bg-gray-100 rounded-full p-5 mb-4">
                  <MapPin className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 font-medium text-lg mb-1">
                  Route not assigned yet
                </p>
                <p className="text-sm text-gray-400 max-w-xs">
                  The admin hasn't run routing for {serviceDate}. Check back
                  once routing is complete.
                </p>
              </div>
            ) : (
              /* Routing done — show details */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Details panel */}
                <div className="space-y-4">
                  {/* Route type & shift time */}
                  <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="bg-blue-100 rounded-lg p-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Service</p>
                      <p className="font-semibold text-gray-900 capitalize">
                        {schedule.route_type ?? "Pickup"}
                      </p>
                      {schedule.shift_time && (
                        <p className="text-sm text-blue-700 font-medium mt-0.5">
                          Shift time: {schedule.shift_time}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stop info */}
                  {schedule.stop && (
                    <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                      <div className="bg-green-100 rounded-lg p-2">
                        <MapPin className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Your Stop</p>
                        <p className="font-semibold text-gray-900">
                          Stop #{schedule.stop.sequence_order}
                        </p>
                        <p className="text-sm text-gray-600 font-mono">
                          {schedule.stop.latitude?.toFixed(5)},{" "}
                          {schedule.stop.longitude?.toFixed(5)}
                        </p>
                        {schedule.stop.arrival_time && (
                          <div className="mt-1 flex items-center gap-1 text-green-700 text-sm font-medium">
                            <Clock className="w-3.5 h-3.5" />
                            Arrival: {schedule.stop.arrival_time}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Driver info */}
                  {schedule.driver ? (
                    <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg border border-purple-100">
                      <div className="bg-purple-100 rounded-lg p-2">
                        <User className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Driver</p>
                        <p className="font-semibold text-gray-900">
                          {schedule.driver.name ?? "Assigned"}
                        </p>
                        {schedule.driver.phone && (
                          <p className="text-sm text-gray-600">
                            {schedule.driver.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-gray-100 rounded-lg p-2">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Driver</p>
                        <p className="font-semibold text-gray-400">
                          Not yet assigned
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Vehicle info */}
                  {schedule.vehicle ? (
                    <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-100">
                      <div className="bg-orange-100 rounded-lg p-2">
                        <Car className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vehicle</p>
                        <p className="font-semibold text-gray-900">
                          {schedule.vehicle.plate_no ?? "Assigned"}
                        </p>
                        {schedule.vehicle.capacity && (
                          <p className="text-sm text-gray-600">
                            Capacity: {schedule.vehicle.capacity} seats
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className="bg-gray-100 rounded-lg p-2">
                        <Car className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Vehicle</p>
                        <p className="font-semibold text-gray-400">
                          Not yet assigned
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Map panel */}
                <div>
                  {schedule.stop?.latitude != null &&
                  schedule.stop?.longitude != null ? (
                    <div className="rounded-lg overflow-hidden border border-gray-200 h-80">
                      <MapContainer
                        center={[
                          schedule.stop.latitude,
                          schedule.stop.longitude,
                        ]}
                        zoom={14}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        />
                        <Marker
                          position={[
                            schedule.stop.latitude,
                            schedule.stop.longitude,
                          ]}
                        >
                          <Popup>
                            <div className="text-sm">
                              <p className="font-semibold">Your Pickup Stop</p>
                              {schedule.stop.arrival_time && (
                                <p className="text-gray-600">
                                  Arrival: {schedule.stop.arrival_time}
                                </p>
                              )}
                              {schedule.driver?.name && (
                                <p className="text-gray-600">
                                  Driver: {schedule.driver.name}
                                </p>
                              )}
                              {schedule.vehicle?.plate_no && (
                                <p className="text-gray-600">
                                  Vehicle: {schedule.vehicle.plate_no}
                                </p>
                              )}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  ) : (
                    <div className="h-80 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">
                          Stop coordinates not available
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick link to all requests */}
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => navigate("/employee/requests")}
          >
            View All My Requests
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </Sidebar>
  );
};
