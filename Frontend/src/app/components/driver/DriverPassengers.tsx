import React, { useEffect, useMemo, useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { Users, Phone, MapPin, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { driverApi } from '../../services/transportApi';
import type { DriverAssignmentPassenger, DriverAssignmentStop } from '../../types/api';

interface PassengerRow {
  id: string;
  name: string;
  phone: string;
  stopLocation: string;
  stopTime: string;
  stopType: string;
  boarded: boolean;
  stopId: number;
  employeeId: number;
}

export const DriverPassengers: React.FC = () => {
  const [passengers, setPassengers] = useState<PassengerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPassengers = async () => {
      try {
        setLoading(true);
        const data = await driverApi.getTodayAssignment();
        const rows: PassengerRow[] = [];
        for (const route of data.routes ?? []) {
          for (const stop of route.stops ?? []) {
            for (const passenger of stop.passengers ?? []) {
              rows.push({
                id: `${stop.stop_id ?? 0}-${passenger.employee_id ?? 0}`,
                name: passenger.employee_name ?? `Employee ${passenger.employee_id ?? ''}`,
                phone: '—',
                stopLocation: `Stop ${stop.sequence_order ?? 1}`,
                stopTime: stop.arrival_time ?? '—',
                stopType: 'pickup',
                boarded: Boolean(passenger.boarded),
                stopId: stop.stop_id ?? 0,
                employeeId: passenger.employee_id ?? 0,
              });
            }
          }
        }
        setPassengers(rows);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unable to load passengers');
      } finally {
        setLoading(false);
      }
    };

    void loadPassengers();
  }, []);

  const boardedPassengers = useMemo(() => passengers.filter((p) => p.boarded), [passengers]);
  const waitingPassengers = useMemo(() => passengers.filter((p) => !p.boarded), [passengers]);

  const handleBoardPassenger = async (passenger: PassengerRow) => {
    if (!passenger.stopId || !passenger.employeeId) return;
    try {
      await driverApi.boardPassenger(passenger.stopId, passenger.employeeId);
      setPassengers((prev) => prev.map((item) => item.id === passenger.id ? { ...item, boarded: true } : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update boarding status');
    }
  };

  const PassengerCard = ({ passenger }: { passenger: PassengerRow }) => (
    <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-full w-12 h-12 flex items-center justify-center">
              <span className="text-white font-semibold text-lg">{passenger.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{passenger.name}</h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {passenger.phone}
              </p>
            </div>
          </div>
          <Badge className={passenger.boarded ? 'bg-green-500' : 'bg-orange-500'}>
            {passenger.boarded ? 'Boarded' : 'Waiting'}
          </Badge>
        </div>

        <div className="space-y-2 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
            <div>
              <p className="text-xs text-gray-600">Stop</p>
              <p className="text-sm font-medium text-gray-900">{passenger.stopLocation}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-600">Time</p>
              <p className="text-sm font-medium text-gray-900">{passenger.stopTime}</p>
            </div>
          </div>

          <div className="pt-2">
            <Button size="sm" variant={passenger.boarded ? 'secondary' : 'default'} onClick={() => void handleBoardPassenger(passenger)} disabled={passenger.boarded}>
              {passenger.boarded ? 'Boarded' : 'Mark Boarded'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Sidebar role="driver">
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Passengers</h1>
          <p className="text-gray-600 mt-1">View and update passenger boarding state</p>
        </div>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading && <p className="text-sm text-slate-500 mb-4">Loading passenger list…</p>}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Passengers</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{passengers.length}</p>
                </div>
                <div className="bg-blue-100 rounded-full p-3">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Boarded</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">{boardedPassengers.length}</p>
                </div>
                <div className="bg-green-100 rounded-full p-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Waiting</p>
                  <p className="text-3xl font-bold text-orange-600 mt-2">{waitingPassengers.length}</p>
                </div>
                <div className="bg-orange-100 rounded-full p-3">
                  <Clock className="w-6 h-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-gray-100">
            <CardTitle>Passenger List</CardTitle>
            <CardDescription>Filter and view passengers by boarding state</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-3 mb-6">
                <TabsTrigger value="all">All ({passengers.length})</TabsTrigger>
                <TabsTrigger value="boarded">Boarded ({boardedPassengers.length})</TabsTrigger>
                <TabsTrigger value="waiting">Waiting ({waitingPassengers.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {passengers.map((passenger) => (
                    <PassengerCard key={passenger.id} passenger={passenger} />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="boarded" className="space-y-4">
                {boardedPassengers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {boardedPassengers.map((passenger) => (
                      <PassengerCard key={passenger.id} passenger={passenger} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No boarded passengers yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="waiting" className="space-y-4">
                {waitingPassengers.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {waitingPassengers.map((passenger) => (
                      <PassengerCard key={passenger.id} passenger={passenger} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">All passengers have boarded</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Sidebar>
  );
};
