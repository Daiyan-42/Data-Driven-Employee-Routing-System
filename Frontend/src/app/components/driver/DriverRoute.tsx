import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Map, Users, Clock, MapPin, CheckCircle, Navigation, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { InteractiveMap } from '../shared/InteractiveMap';

interface Passenger {
  id: string;
  name: string;
  location: string;
  boarded: boolean;
}

interface RouteStop {
  id: string;
  order: number;
  type: 'pickup' | 'dropoff';
  location: string;
  latitude: number;
  longitude: number;
  estimatedTime: string;
  passengers: Passenger[];
}

interface Route {
  id: string;
  name: string;
  timeSlot: string;
  status: 'not-started' | 'in-progress' | 'completed';
  stops: RouteStop[];
}

const mockRoutes: Route[] = [
  {
    id: 'route-1',
    name: 'Morning Shift - Route A',
    timeSlot: '07:00 AM - 09:00 AM',
    status: 'in-progress',
    stops: [
      {
        id: '1',
        order: 1,
        type: 'pickup',
        location: '123 Park Avenue, Brooklyn',
        latitude: 40.7128,
        longitude: -74.0060,
        estimatedTime: '07:15 AM',
        passengers: [
          { id: 'p1', name: 'John Doe', location: '123 Park Avenue', boarded: true },
          { id: 'p2', name: 'Jane Smith', location: '123 Park Avenue', boarded: true },
        ],
      },
      {
        id: '2',
        order: 2,
        type: 'pickup',
        location: '456 Maple Street, Queens',
        latitude: 40.7282,
        longitude: -73.7949,
        estimatedTime: '07:30 AM',
        passengers: [
          { id: 'p3', name: 'Mike Johnson', location: '456 Maple Street', boarded: false },
        ],
      },
      {
        id: '3',
        order: 3,
        type: 'pickup',
        location: '789 Oak Road, Manhattan',
        latitude: 40.7589,
        longitude: -73.9851,
        estimatedTime: '07:45 AM',
        passengers: [
          { id: 'p4', name: 'Sarah Williams', location: '789 Oak Road', boarded: false },
          { id: 'p5', name: 'David Brown', location: '789 Oak Road', boarded: false },
        ],
      },
      {
        id: '4',
        order: 4,
        type: 'dropoff',
        location: 'Office Complex, 789 Business Park',
        latitude: 40.7489,
        longitude: -73.9680,
        estimatedTime: '08:15 AM',
        passengers: [],
      },
    ],
  },
  {
    id: 'route-2',
    name: 'Mid-Morning Shift - Route B',
    timeSlot: '10:00 AM - 12:00 PM',
    status: 'not-started',
    stops: [
      {
        id: '5',
        order: 1,
        type: 'pickup',
        location: '321 West End Ave, Manhattan',
        latitude: 40.7794,
        longitude: -73.9865,
        estimatedTime: '10:15 AM',
        passengers: [
          { id: 'p6', name: 'Emily Davis', location: '321 West End Ave', boarded: false },
          { id: 'p7', name: 'Robert Wilson', location: '321 West End Ave', boarded: false },
        ],
      },
      {
        id: '6',
        order: 2,
        type: 'pickup',
        location: '555 Broadway, Brooklyn',
        latitude: 40.7128,
        longitude: -73.9820,
        estimatedTime: '10:30 AM',
        passengers: [
          { id: 'p8', name: 'Lisa Anderson', location: '555 Broadway', boarded: false },
        ],
      },
      {
        id: '7',
        order: 3,
        type: 'dropoff',
        location: 'Office Complex, 789 Business Park',
        latitude: 40.7489,
        longitude: -73.9680,
        estimatedTime: '11:00 AM',
        passengers: [],
      },
    ],
  },
  {
    id: 'route-3',
    name: 'Evening Shift - Route C',
    timeSlot: '07:00 PM - 09:00 PM',
    status: 'not-started',
    stops: [
      {
        id: '8',
        order: 1,
        type: 'pickup',
        location: 'Office Complex, 789 Business Park',
        latitude: 40.7489,
        longitude: -73.9680,
        estimatedTime: '07:00 PM',
        passengers: [
          { id: 'p9', name: 'Tom Martinez', location: 'Office', boarded: false },
          { id: 'p10', name: 'Anna Taylor', location: 'Office', boarded: false },
        ],
      },
      {
        id: '9',
        order: 2,
        type: 'dropoff',
        location: '890 Fifth Avenue, Manhattan',
        latitude: 40.7794,
        longitude: -73.9632,
        estimatedTime: '07:30 PM',
        passengers: [],
      },
      {
        id: '10',
        order: 3,
        type: 'dropoff',
        location: '234 Atlantic Ave, Brooklyn',
        latitude: 40.6843,
        longitude: -73.9855,
        estimatedTime: '08:00 PM',
        passengers: [],
      },
    ],
  },
  {
    id: 'route-4',
    name: 'Late Night Shift - Route D',
    timeSlot: '10:00 PM - 11:30 PM',
    status: 'not-started',
    stops: [
      {
        id: '11',
        order: 1,
        type: 'pickup',
        location: 'Office Complex, 789 Business Park',
        latitude: 40.7489,
        longitude: -73.9680,
        estimatedTime: '10:00 PM',
        passengers: [
          { id: 'p11', name: 'Chris Lee', location: 'Office', boarded: false },
        ],
      },
      {
        id: '12',
        order: 2,
        type: 'dropoff',
        location: '678 Queens Blvd, Queens',
        latitude: 40.7392,
        longitude: -73.8755,
        estimatedTime: '10:45 PM',
        passengers: [],
      },
    ],
  },
];

export const DriverRoute: React.FC = () => {
  const [routes, setRoutes] = useState<Route[]>(mockRoutes);
  const [expandedRoutes, setExpandedRoutes] = useState<string[]>(['route-1']);

  const toggleRouteExpansion = (routeId: string) => {
    setExpandedRoutes(prev =>
      prev.includes(routeId)
        ? prev.filter(id => id !== routeId)
        : [...prev, routeId]
    );
  };

  const handlePassengerToggle = (routeId: string, stopId: string, passengerId: string) => {
    setRoutes(prev =>
      prev.map(route =>
        route.id === routeId
          ? {
              ...route,
              stops: route.stops.map(stop =>
                stop.id === stopId
                  ? {
                      ...stop,
                      passengers: stop.passengers.map(passenger =>
                        passenger.id === passengerId
                          ? { ...passenger, boarded: !passenger.boarded }
                          : passenger
                      ),
                    }
                  : stop
              ),
            }
          : route
      )
    );
  };

  const handleRouteStatusChange = (routeId: string, newStatus: Route['status']) => {
    setRoutes(prev =>
      prev.map(route =>
        route.id === routeId ? { ...route, status: newStatus } : route
      )
    );
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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Today's Routes</h1>
          <p className="text-gray-600 mt-1">Manage all your routes and passengers for today</p>
        </div>

        {/* Summary Cards */}
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
                  <p className="text-2xl font-bold text-blue-600">
                    {routes.filter(r => r.status === 'in-progress').length}
                  </p>
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
                  <p className="text-2xl font-bold text-green-600">
                    {routes.filter(r => r.status === 'completed').length}
                  </p>
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
                    {routes.reduce((acc, route) => 
                      acc + route.stops.reduce((stopAcc, stop) => stopAcc + stop.passengers.length, 0), 0
                    )}
                  </p>
                </div>
                <div className="bg-orange-100 rounded-lg p-3">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Routes List */}
        <div className="space-y-6">
          {routes.map((route) => {
            const isExpanded = expandedRoutes.includes(route.id);
            const totalPassengers = route.stops.reduce((acc, stop) => acc + stop.passengers.length, 0);
            const boardedPassengers = route.stops.reduce(
              (acc, stop) => acc + stop.passengers.filter(p => p.boarded).length,
              0
            );

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
                        <Badge className={getStatusColor(route.status)}>
                          {getStatusLabel(route.status)}
                        </Badge>
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
                      {/* Route Status Controls */}
                      <div className="flex gap-2">
                        {route.status === 'not-started' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRouteStatusChange(route.id, 'in-progress');
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
                              handleRouteStatusChange(route.id, 'completed');
                            }}
                          >
                            Complete Route
                          </Button>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Route Map */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Route Map</h3>
                        <InteractiveMap
                          center={[route.stops[0].latitude, route.stops[0].longitude]}
                          markers={route.stops.map((stop, idx) => ({
                            position: [stop.latitude, stop.longitude] as [number, number],
                            label: `Stop ${stop.order}: ${stop.location}`,
                            color: stop.type === 'pickup' ? '#2563EB' : '#16A34A',
                          }))}
                          showRoute={true}
                          height="400px"
                        />

                        {/* Route Statistics */}
                        <div className="mt-4 grid grid-cols-3 gap-3">
                          <div className="bg-blue-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-blue-600 font-medium">Distance</p>
                            <p className="text-lg font-bold text-blue-900 mt-1">
                              {(route.stops.length * 3.2).toFixed(1)} km
                            </p>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-green-600 font-medium">Duration</p>
                            <p className="text-lg font-bold text-green-900 mt-1">
                              {route.stops.length * 12} mins
                            </p>
                          </div>
                          <div className="bg-orange-50 rounded-lg p-3 text-center">
                            <p className="text-xs text-orange-600 font-medium">Stops</p>
                            <p className="text-lg font-bold text-orange-900 mt-1">
                              {route.stops.length}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Stops List */}
                      <div>
                        <h3 className="font-semibold text-gray-900 mb-4">Route Stops & Passengers</h3>
                        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                          {route.stops.map((stop, index) => {
                            const nextStop = route.stops[index + 1];
                            return (
                              <div key={stop.id}>
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <div className="flex items-start gap-3">
                                    <div className="flex flex-col items-center">
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                                          stop.type === 'pickup' ? 'bg-blue-500' : 'bg-green-500'
                                        }`}
                                      >
                                        {stop.order}
                                      </div>
                                      {nextStop && <div className="w-0.5 h-full bg-gray-300 mt-2"></div>}
                                    </div>
                                    <div className="flex-1">
                                      <div className="flex items-center justify-between mb-2">
                                        <div>
                                          <p className="font-semibold text-sm text-gray-900">{stop.location}</p>
                                          <p className="text-xs text-gray-500">{stop.estimatedTime}</p>
                                        </div>
                                        <Badge
                                          className={
                                            stop.type === 'pickup'
                                              ? 'bg-blue-100 text-blue-700'
                                              : 'bg-green-100 text-green-700'
                                          }
                                        >
                                          {stop.type}
                                        </Badge>
                                      </div>

                                      {/* Passengers */}
                                      {stop.passengers.length > 0 && (
                                        <div className="mt-3 space-y-2">
                                          {stop.passengers.map((passenger) => (
                                            <div
                                              key={passenger.id}
                                              className="flex items-center justify-between bg-white rounded p-2 border border-gray-200"
                                            >
                                              <div className="flex items-center gap-2">
                                                <div
                                                  className={`w-2 h-2 rounded-full ${
                                                    passenger.boarded ? 'bg-green-500' : 'bg-orange-500'
                                                  }`}
                                                />
                                                <span className="text-sm font-medium text-gray-900">
                                                  {passenger.name}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <Label
                                                  htmlFor={`passenger-${passenger.id}`}
                                                  className="text-xs text-gray-600"
                                                >
                                                  {passenger.boarded ? 'Boarded' : 'Waiting'}
                                                </Label>
                                                <Switch
                                                  id={`passenger-${passenger.id}`}
                                                  checked={passenger.boarded}
                                                  onCheckedChange={() =>
                                                    handlePassengerToggle(route.id, stop.id, passenger.id)
                                                  }
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {nextStop && (
                                  <div className="ml-4 pl-8 py-1">
                                    <p className="text-xs text-gray-500">↓ 3.2 km • 12 mins</p>
                                  </div>
                                )}
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
