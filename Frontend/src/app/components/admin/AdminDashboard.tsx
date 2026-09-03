import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Users, Car, Truck, ClipboardList, Route, LogOut,
  Plus, Trash2, Key, Eye, Search, Filter, ChevronDown,
  Bus, MapPin, Clock, AlertCircle,
  X, Edit, Phone, Mail, Hash, UserCog,
  BarChart3, Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { adminApi, driverApi, dropoffRequestApi, employeeApi, pickupRequestApi, vehicleApi } from '../../services/transportApi';
import type { Driver, DropoffRequest, PickupRequest, Vehicle, PickupRoutingInputResponse, ScheduleSummaryResponse, RouteDetailResponse } from '../../types/api';
import { InteractiveMap } from '../shared/InteractiveMap';
import { OFFICE_LOCATION } from '../../data/mockData';

type AdminView = 'overview' | 'employees' | 'drivers' | 'vehicles' | 'requests' | 'routing';

interface AdminEmployee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  latitude?: number | null;
  longitude?: number | null;
  employeeId: string;
  status?: string;
}

const SIDEBAR_ITEMS = [
  { id: 'overview' as AdminView, label: 'Overview', icon: BarChart3 },
  { id: 'employees' as AdminView, label: 'Employees', icon: Users },
  { id: 'drivers' as AdminView, label: 'Drivers', icon: Truck },
  { id: 'vehicles' as AdminView, label: 'Vehicles', icon: Car },
  { id: 'requests' as AdminView, label: 'Requests', icon: ClipboardList },
  { id: 'routing' as AdminView, label: 'Routing', icon: Route },
];

export const AdminDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [view, setView] = useState<AdminView>('overview');
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [searchQ, setSearchQ] = useState('');

  // Modals
  const [addEmpOpen, setAddEmpOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<AdminEmployee | null>(null);
  const [resetPwdNew, setResetPwdNew] = useState('');
  const [resetPwdError, setResetPwdError] = useState('');
  const [resetSaving, setResetSaving] = useState(false);
  const [deleteUser, setDeleteUser] = useState<AdminEmployee | null>(null);
  const [actionSaving, setActionSaving] = useState(false);
  const [viewEmpDetail, setViewEmpDetail] = useState<AdminEmployee | null>(null);
  const [routingResult, setRoutingResult] = useState<ScheduleSummaryResponse | null>(null);
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState('all');
  const [routingShift, setRoutingShift] = useState('22:00');
  const [routingDate, setRoutingDate] = useState(new Date().toISOString().split('T')[0]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pickupRequests, setPickupRequests] = useState<PickupRequest[]>([]);
  const [dropoffRequests, setDropoffRequests] = useState<DropoffRequest[]>([]);
  const [pickupPreview, setPickupPreview] = useState<PickupRoutingInputResponse | null>(null);
  const [dropoffPreview, setDropoffPreview] = useState<PickupRoutingInputResponse | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [requestActionLoading, setRequestActionLoading] = useState(false);

  const loadAdminApiData = async () => {
    setApiLoading(true);
    setApiError(null);
    try {
      const [employeeRes, driverRes, vehicleRes, pickupRes, dropoffRes] = await Promise.all([
        employeeApi.list({ page: 1, limit: 100 }),
        driverApi.list({ page: 1, limit: 100 }),
        vehicleApi.list({ page: 1, limit: 100 }),
        pickupRequestApi.list({ page: 1, limit: 100 }),
        dropoffRequestApi.list({ page: 1, limit: 100 }),
      ]);
      setEmployees(employeeRes.employees.map(emp => ({
        id: String(emp.user_id),
        name: emp.name,
        email: emp.email,
        phone: emp.phone ?? '',
        role: 'employee',
        latitude: emp.home_lat ?? undefined,
        longitude: emp.home_lng ?? undefined,
        employeeId: String(emp.employee_id),
        status: emp.status,
      })));
      setDrivers(driverRes.drivers);
      setVehicles(vehicleRes.vehicles);
      setPickupRequests(pickupRes.pickup_requests);
      setDropoffRequests(dropoffRes.dropoff_requests);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not load backend data.');
    } finally {
      setApiLoading(false);
    }
  };

  useEffect(() => {
    loadAdminApiData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login/admin');
  };

  const totalEmployees = employees.length;
  const totalDrivers = drivers.length;
  const totalVehicles = vehicles.length;
  const allRequests = [
    ...pickupRequests.map(r => ({ kind: 'pickup' as const, id: r.pickup_id, employeeName: r.employee_name, employeeId: r.employee_id, serviceDate: r.service_date, shiftTime: r.shift_start_time, status: r.status, lat: r.pickup_lat, lng: r.pickup_lng, zoneName: r.zone_name })),
    ...dropoffRequests.map(r => ({ kind: 'dropoff' as const, id: r.dropoff_id, employeeName: r.employee_name, employeeId: r.employee_id, serviceDate: r.service_date, shiftTime: r.shift_end_time, status: r.status, lat: r.drop_lat, lng: r.drop_lng, zoneName: r.zone_name })),
  ];
  const pendingRequests = allRequests.filter(r => r.status === 'Pending').length;
  const routedRequests = allRequests.filter(r => r.status === 'Approved').length;
  const filteredRequests = allRequests.filter(r => {
    const matchShift = selectedShiftFilter === 'all' || r.shiftTime === selectedShiftFilter;
    const matchDate = selectedDateFilter === 'all' || r.serviceDate === selectedDateFilter;
    return matchShift && matchDate;
  });

  const uniqueShifts = [...new Set(allRequests.map(r => r.shiftTime).filter(Boolean))];
  const uniqueDates = [...new Set(allRequests.map(r => r.serviceDate))];

  const approveDropoff = async (dropoffId: number) => {
    setRequestActionLoading(true);
    setApiError(null);
    try {
      await dropoffRequestApi.approve(dropoffId);
      await loadAdminApiData();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not approve dropoff request.');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const rejectDropoff = async (dropoffId: number) => {
    setRequestActionLoading(true);
    setApiError(null);
    try {
      await dropoffRequestApi.reject(dropoffId);
      await loadAdminApiData();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not reject dropoff request.');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const approvePickup = async (pickupId: number) => {
    setRequestActionLoading(true);
    setApiError(null);
    try {
      await pickupRequestApi.approve(pickupId);
      await loadAdminApiData();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not approve pickup request.');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const rejectPickup = async (pickupId: number) => {
    setRequestActionLoading(true);
    setApiError(null);
    try {
      await pickupRequestApi.reject(pickupId);
      await loadAdminApiData();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not reject pickup request.');
    } finally {
      setRequestActionLoading(false);
    }
  };

  const loadPreview = async (type: 'pickup' | 'dropoff') => {
    setApiLoading(true);
    setApiError(null);
    try {
      if (type === 'pickup') {
        const data = await adminApi.getPickupRoutingInput(routingDate, routingShift);
        setPickupPreview(data);
      } else {
        const data = await adminApi.getPickupRoutingInput(routingDate, routingShift);
        setDropoffPreview(data);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not load preview.');
    } finally {
      setApiLoading(false);
    }
  };

  const loadScheduleSummary = async () => {
    try {
      const summary = await adminApi.getScheduleSummary(routingDate, routingShift);
      setRoutingResult(summary);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not load schedule summary.');
    }
  };

  // Add employee
  const [newEmp, setNewEmp] = useState({ name: '', email: '', phone: '', password: '' });
  const [addSaving, setAddSaving] = useState(false);

  const handleAddEmployee = async () => {
    if (!newEmp.name.trim() || !newEmp.email.trim() || !newEmp.password) return;
    if (newEmp.password.length < 6) {
      setApiError('Password must be at least 6 characters.');
      return;
    }
    setAddSaving(true);
    setApiError(null);
    try {
      await employeeApi.add({
        name: newEmp.name.trim(),
        email: newEmp.email.trim(),
        phone: newEmp.phone.trim() || undefined,
        password: newEmp.password,
      });
      setNewEmp({ name: '', email: '', phone: '', password: '' });
      setAddEmpOpen(false);
      await loadAdminApiData();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not add employee.');
    } finally {
      setAddSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!deleteUser) return;
    setActionSaving(true);
    setApiError(null);
    try {
      await adminApi.deleteEmployee(Number(deleteUser.id));
      setDeleteUser(null);
      await loadAdminApiData();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not deactivate employee.');
    } finally {
      setActionSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwdUser) return;
    if (resetPwdNew.length < 6) {
      setResetPwdError('Password must be at least 6 characters.');
      return;
    }
    setResetPwdError('');
    setResetSaving(true);
    setApiError(null);
    try {
      await adminApi.resetEmployeePassword(Number(resetPwdUser.id), resetPwdNew);
      setResetPwdNew('');
      setResetPwdUser(null);
    } catch (err) {
      setResetPwdError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setResetSaving(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    e.name.toLowerCase().includes(searchQ.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQ.toLowerCase())
  );

  const StatCard = ({ label, value, icon: Icon, color, sub }: any) => (
    <div className="rounded-xl border border-white/8 bg-card p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
        {sub && <p className="text-xs text-slate-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-white/6" style={{ background: '#080D16' }}>
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                TranspoRT
              </p>
              <p className="text-xs text-slate-600">Admin Panel</p>
            </div>
          </div>
        </div>

        {/* Admin user */}
        <div className="px-4 py-4 border-b border-white/6">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/4">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xs font-bold text-amber-400">
              {user?.name[0]}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
              <p className="text-xs text-slate-600">Administrator</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left ${
                  active
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500 hover:text-red-400 hover:bg-red-500/8 transition"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-20 px-8 py-4 border-b border-white/6 bg-background/95 backdrop-blur flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {SIDEBAR_ITEMS.find(i => i.id === view)?.label}
            </h1>
            <p className="text-xs text-slate-600 mt-0.5">Transport Route Management System</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>

        <div className="p-8">
          {apiError && (
            <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {apiError}
            </div>
          )}
          {apiLoading && (
            <div className="mb-4 rounded-lg border border-sky-500/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-300">
              Loading backend data...
            </div>
          )}

          {/* ─── OVERVIEW ─── */}
          {view === 'overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Employees" value={totalEmployees} icon={Users} color="bg-sky-500/15 text-sky-400" />
                <StatCard label="Active Drivers" value={totalDrivers} icon={Truck} color="bg-emerald-500/15 text-emerald-400" />
                <StatCard label="Fleet Vehicles" value={totalVehicles} icon={Car} color="bg-amber-500/15 text-amber-400" />
                <StatCard label="Pending Requests" value={pendingRequests} icon={ClipboardList} color="bg-purple-500/15 text-purple-400" sub={`${routedRequests} routed`} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent requests */}
                <div className="rounded-xl border border-white/8 bg-card p-6">
                  <h3 className="text-base font-semibold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Recent Requests</h3>
                  <div className="space-y-3">
                    {allRequests.slice(0, 5).map(r => (
                      <div key={`${r.kind}-${r.id}`} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${r.status === 'Approved' ? 'bg-emerald-500' : r.status === 'Pending' ? 'bg-amber-500' : 'bg-red-500'}`} />
                          <div>
                            <p className="text-sm text-white font-medium">{r.employeeName}</p>
                            <p className="text-xs text-slate-600">{r.serviceDate} · {r.shiftTime} · {r.kind}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400'
                          : r.status === 'Pending' ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-red-500/15 text-red-400'
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fleet status */}
                <div className="rounded-xl border border-white/8 bg-card p-6">
                  <h3 className="text-base font-semibold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Fleet Status</h3>
                  <div className="space-y-3">
                    {vehicles.map(v => (
                      <div key={v.vehicle_id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                        <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
                          <Bus className="w-4 h-4 text-sky-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white font-medium">{v.plate_no}</p>
                          <p className="text-xs text-slate-600">{v.capacity} seats</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-400">{v.driver_name || '—'}</p>
                          <div className={`text-xs px-2 py-0.5 rounded-full mt-1 ${v.driver_name ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>
                            {v.driver_name ? 'Assigned' : 'Unassigned'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── EMPLOYEES ─── */}
          {view === 'employees' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Search employees..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
                <button
                  onClick={() => setAddEmpOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Employee
                </button>
              </div>

              <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="text-right px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEmployees.map((emp, i) => (
                      <tr key={emp.id} className={`border-b border-white/4 hover:bg-white/3 transition ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-xs font-bold text-sky-400">
                              {emp.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div>
                              <span className="text-sm font-medium text-white">{emp.name}</span>
                              {emp.status === 'Inactive' && (
                                <span className="ml-2 inline-block text-[10px] px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/20 text-slate-400 uppercase tracking-wide">
                                  Inactive
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 font-mono">{emp.employeeId || '—'}</td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-400">{emp.email}</p>
                          <p className="text-xs text-slate-600">{emp.phone}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setViewEmpDetail(emp)}
                              className="p-1.5 rounded-lg hover:bg-white/8 text-slate-500 hover:text-slate-300 transition"
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setResetPwdUser(emp)}
                              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-slate-500 hover:text-amber-400 transition"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteUser(emp)}
                              className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredEmployees.length === 0 && (
                  <div className="text-center py-12 text-slate-600">No employees found.</div>
                )}
              </div>
            </div>
          )}

          {/* ─── DRIVERS ─── */}
          {view === 'drivers' && (
            <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Driver</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">License</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Experience</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Vehicle</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                  </tr>
                </thead>
                <tbody>
                  {drivers.map((drv, i) => {
                    const vehicle = vehicles.find(v => v.driver_id === drv.driver_id);
                    return (
                      <tr key={drv.driver_id} className={`border-b border-white/4 hover:bg-white/3 transition ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                              {drv.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <span className="text-sm font-medium text-white">{drv.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{drv.license_no}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{drv.status}</td>
                        <td className="px-6 py-4">
                          {vehicle ? (
                            <div>
                              <p className="text-sm text-sky-400 font-medium">{vehicle.plate_no}</p>
                              <p className="text-xs text-slate-600">{vehicle.plate_no} · {vehicle.capacity} seats</p>
                            </div>
                          ) : <span className="text-slate-600 text-sm">Unassigned</span>}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-xs text-slate-400">{drv.email}</p>
                          <p className="text-xs text-slate-600">{drv.phone}</p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── VEHICLES ─── */}
          {view === 'vehicles' && (
            <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/6">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vehicle</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Plate Number</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Capacity</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Assigned Driver</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v, i) => {
                    const driver = drivers.find(d => d.driver_id === v.driver_id);
                    return (
                      <tr key={v.vehicle_id} className={`border-b border-white/4 hover:bg-white/3 transition ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/15 flex items-center justify-center">
                              <Bus className="w-4 h-4 text-sky-400" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">{v.plate_no}</p>
                              <p className="text-xs text-slate-600">{v.status}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-amber-400 font-mono font-medium">{v.plate_no}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">Vehicle</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{v.capacity} seats</td>
                        <td className="px-6 py-4 text-sm text-slate-400">{driver?.name || <span className="text-slate-600">—</span>}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2.5 py-1 rounded-full ${driver ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/10 text-slate-500'}`}>
                            {driver ? 'Active' : 'Idle'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ─── REQUESTS ─── */}
          {view === 'requests' && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-500">Dropoff date:</span>
                </div>
                <select
                  value={selectedDateFilter}
                  onChange={e => setSelectedDateFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg border border-white/8 bg-white/4 text-white text-sm focus:outline-none focus:border-sky-500/40 transition"
                >
                  <option value="all">All Dates</option>
                  {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span className="text-xs text-slate-600 ml-auto">{filteredRequests.length} requests</span>
              </div>

              <div className="rounded-xl border border-white/8 bg-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/6">
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Location</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shift</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-6 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((r, i) => (
                      <tr key={`${r.kind}-${r.id}`} className={`border-b border-white/4 hover:bg-white/3 transition ${i % 2 === 0 ? '' : 'bg-white/1'}`}>
                        <td className="px-6 py-4 text-sm text-white font-medium">{r.employeeName || `Employee #${r.employeeId}`}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${r.kind === 'pickup' ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                            {r.kind}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 max-w-[180px] truncate">
                          {r.zoneName || `${r.lat ?? '—'}, ${r.lng ?? '—'}`}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">{r.serviceDate}</td>
                        <td className="px-6 py-4 text-xs text-slate-400 font-mono">{r.shiftTime || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            r.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400'
                            : r.status === 'Pending' ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-red-500/15 text-red-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500">
                          <div className="flex gap-2">
                            <button
                              onClick={() => r.kind === 'pickup' ? approvePickup(r.id) : approveDropoff(r.id)}
                              disabled={requestActionLoading || r.status !== 'Pending'}
                              className="px-2 py-1 rounded bg-emerald-500/15 text-emerald-400 disabled:opacity-40"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => r.kind === 'pickup' ? rejectPickup(r.id) : rejectDropoff(r.id)}
                              disabled={requestActionLoading || r.status !== 'Pending'}
                              className="px-2 py-1 rounded bg-red-500/15 text-red-400 disabled:opacity-40"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredRequests.length === 0 && (
                  <div className="text-center py-12 text-slate-600">No requests match the filters.</div>
                )}
              </div>
            </div>
          )}

          {/* ─── ROUTING ─── */}
          {view === 'routing' && (
            <div className="space-y-6">
              {/* Routing controls */}
              <div className="rounded-xl border border-white/8 bg-card p-6">
                <h3 className="text-base font-semibold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Routing
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Routing runs automatically once the weekly request window closes. Pick a date and
                  shift to preview request counts or view the routes the solver produced.
                </p>

                {/* Date and shift selectors */}
                <div className="flex items-end gap-4 flex-wrap mb-6">
                  <div>
                    <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Date</label>
                    <input
                      type="date"
                      value={routingDate}
                      onChange={e => { setRoutingDate(e.target.value); setPickupPreview(null); setDropoffPreview(null); setRoutingResult(null); }}
                      className="px-3 py-2.5 rounded-lg border border-white/8 bg-white/4 text-white text-sm focus:outline-none focus:border-sky-500/40 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Shift Time</label>
                    <select
                      value={routingShift}
                      onChange={e => { setRoutingShift(e.target.value); setPickupPreview(null); setDropoffPreview(null); setRoutingResult(null); }}
                      className="px-3 py-2.5 rounded-lg border border-white/8 bg-white/4 text-white text-sm focus:outline-none focus:border-sky-500/40 transition"
                    >
                      <option value="22:00">22:00</option>
                      <option value="23:00">23:00</option>
                      <option value="00:00">00:00</option>
                      <option value="01:00">01:00</option>
                      <option value="02:00">02:00</option>
                      <option value="03:00">03:00</option>
                      <option value="04:00">04:00</option>
                      <option value="05:00">05:00</option>
                      <option value="06:00">06:00</option>
                    </select>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => loadPreview('pickup')}
                    disabled={apiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-sm font-medium transition disabled:opacity-60"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Pickup
                  </button>
                  <button
                    onClick={() => loadPreview('dropoff')}
                    disabled={apiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 text-sm font-medium transition disabled:opacity-60"
                  >
                    <Eye className="w-4 h-4" />
                    Preview Dropoff
                  </button>
                  <button
                    onClick={loadScheduleSummary}
                    disabled={apiLoading}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-sm font-medium transition disabled:opacity-60"
                  >
                    <BarChart3 className="w-4 h-4" />
                    View Results
                  </button>
                </div>
              </div>

              {/* Preview panels */}
              {(pickupPreview || dropoffPreview) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pickupPreview && (
                    <div className="rounded-xl border border-sky-500/20 bg-card p-5">
                      <h4 className="text-sm font-semibold text-sky-400 mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Pickup Preview</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-500">Total:</span> <span className="text-white font-semibold">{pickupPreview.total_requests}</span></div>
                        <div><span className="text-amber-500">Pending:</span> <span className="text-white font-semibold">{pickupPreview.pending}</span></div>
                        <div><span className="text-emerald-500">Approved:</span> <span className="text-white font-semibold">{pickupPreview.approved}</span></div>
                        <div><span className="text-red-500">Rejected:</span> <span className="text-white font-semibold">{pickupPreview.rejected}</span></div>
                      </div>
                    </div>
                  )}
                  {dropoffPreview && (
                    <div className="rounded-xl border border-emerald-500/20 bg-card p-5">
                      <h4 className="text-sm font-semibold text-emerald-400 mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Dropoff Preview</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-slate-500">Total:</span> <span className="text-white font-semibold">{dropoffPreview.total_requests}</span></div>
                        <div><span className="text-amber-500">Pending:</span> <span className="text-white font-semibold">{dropoffPreview.pending}</span></div>
                        <div><span className="text-emerald-500">Approved:</span> <span className="text-white font-semibold">{dropoffPreview.approved}</span></div>
                        <div><span className="text-red-500">Rejected:</span> <span className="text-white font-semibold">{dropoffPreview.rejected}</span></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule results */}
              {routingResult && routingResult.routes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-sky-400" />
                    <h3 className="text-base font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                      Routes — {routingDate} · {routingShift}
                    </h3>
                    <span className="text-xs text-slate-500">{routingResult.routes.length} route(s)</span>
                  </div>

                  {routingResult.routes.map((route) => {
                    const vehicle = vehicles.find(v => v.vehicle_id === route.assignment?.vehicle_id);
                    const driver = drivers.find(d => d.driver_id === route.assignment?.driver_id);
                    const sortedStops = [...route.stops].sort((a, b) => a.sequence_order - b.sequence_order);
                    const mapMarkers = sortedStops.map((stop, i) => ({
                      position: [stop.latitude, stop.longitude] as [number, number],
                      label: stop.passengers.length > 0 ? stop.passengers.map(p => p.employee_name || `Emp #${p.employee_id}`).join(', ') : (i === sortedStops.length - 1 ? 'Office' : `Stop ${stop.sequence_order}`),
                      color: stop.passengers.length > 0 ? '#0EA5E9' : '#10B981',
                    }));

                    return (
                      <div key={route.route_id} className="rounded-xl border border-white/8 bg-card overflow-hidden">
                        <div className="p-5 border-b border-white/6">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded">Route #{route.route_id}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${route.route_type === 'pickup' ? 'bg-sky-500/15 text-sky-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                                  {route.route_type}
                                </span>
                              </div>
                              <p className="text-sm text-white font-medium mt-1">{vehicle?.plate_no || 'Unassigned'}</p>
                              <p className="text-xs text-slate-500">Driver: {driver?.name || '—'}</p>
                            </div>
                            <div className="text-right text-xs text-slate-500">
                              <p>{route.total_distance_km?.toFixed(1)} km</p>
                              <p>{route.total_travel_time_min} min</p>
                            </div>
                          </div>
                        </div>

                        {/* Map */}
                        <div style={{ padding: '0 16px 16px' }}>
                          <InteractiveMap
                            center={sortedStops.length > 0 ? [sortedStops[0].latitude, sortedStops[0].longitude] : [OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude]}
                            zoom={12}
                            markers={mapMarkers}
                            showRoute={true}
                            routeGeometry={route.route_geometry}
                            height="280px"
                            lazy
                          />
                        </div>

                        {/* Stops list */}
                        <div className="px-5 pb-5 space-y-2">
                          {sortedStops.map((stop, idx) => (
                            <div key={stop.stop_id} className="flex items-start gap-3">
                              <div className="flex flex-col items-center mt-1">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${stop.passengers.length === 0 ? 'bg-emerald-500' : 'bg-sky-500'}`}>
                                  {stop.sequence_order}
                                </div>
                                {idx < sortedStops.length - 1 && (
                                  <div className="w-px flex-1 bg-white/10 mt-1 h-5" />
                                )}
                              </div>
                              <div className="flex-1 pb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm text-white font-medium">
                                    {stop.stop_name || (stop.passengers.length === 0 ? 'Office' : `${stop.passengers.length} passenger(s)`)}
                                  </p>
                                  {stop.is_shared && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 font-medium">
                                      shared drop
                                    </span>
                                  )}
                                  {stop.is_adhoc && (
                                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-medium">
                                      ad-hoc
                                    </span>
                                  )}
                                </div>
                                {stop.passengers.length > 0 && (
                                  <p className="text-xs text-slate-400">
                                    {stop.passengers.map(p => p.employee_name || `Employee #${p.employee_id}`).join(', ')}
                                  </p>
                                )}
                                <p className="text-xs text-slate-500 font-mono">{stop.arrival_time || '—'} → {stop.departure_time || '—'}</p>
                                <p className="text-xs text-slate-700">{stop.latitude.toFixed(5)}, {stop.longitude.toFixed(5)}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {routingResult && routingResult.routes.length === 0 && (
                <div className="rounded-xl border border-white/8 bg-card p-8 text-center">
                  <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-500">No routes found for this date and shift.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ─── MODALS ─── */}

      {/* Add Employee Modal */}
      {addEmpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131929] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Add New Employee</h3>
              <button onClick={() => setAddEmpOpen(false)} className="text-slate-600 hover:text-slate-300 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Full Name', field: 'name', placeholder: 'e.g. Rafiqul Islam', type: 'text' },
                { label: 'Email', field: 'email', placeholder: 'email@company.com', type: 'email' },
                { label: 'Phone', field: 'phone', placeholder: '+880-17xx-xxxxxx', type: 'text' },
                { label: 'Temporary Password', field: 'password', placeholder: 'Set initial password', type: 'password' },
              ].map(({ label, field, placeholder, type }) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                  <input
                    type={type}
                    value={(newEmp as any)[field]}
                    onChange={e => setNewEmp(prev => ({ ...prev, [field]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2.5 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-600 mt-3">
              Give the temporary password to the employee offline. They can change it after logging in.
            </p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setAddEmpOpen(false)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm transition">
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                disabled={addSaving}
                className="flex-1 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {addSaving ? 'Adding…' : 'Add Employee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPwdUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131929] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Reset Password</h3>
              <button onClick={() => setResetPwdUser(null)} className="text-slate-600 hover:text-slate-300 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Set a new temporary password for <span className="text-white font-medium">{resetPwdUser.name}</span>.
              They'll need to log in with this — you can't see their current password.
            </p>
            <input
              type="password"
              value={resetPwdNew}
              onChange={e => { setResetPwdNew(e.target.value); setResetPwdError(''); }}
              placeholder="New password (at least 6 characters)"
              className="w-full px-3 py-2.5 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-amber-500/40 transition mb-2"
            />
            {resetPwdError && <p className="text-xs text-red-400 mb-4">{resetPwdError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setResetPwdUser(null)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
                Cancel
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetSaving}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition disabled:opacity-60"
              >
                {resetSaving ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#131929] p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/20 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Delete Employee</h3>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Deactivate <span className="text-white font-medium">{deleteUser.name}</span>? They won't be able to log
              in, and their account can be re-enabled later. Their request history is kept.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteUser(null)} className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
                Cancel
              </button>
              <button
                onClick={handleDeleteEmployee}
                disabled={actionSaving}
                className="flex-1 py-2.5 rounded-lg bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {actionSaving ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Detail Modal */}
      {viewEmpDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#131929] p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Employee Details</h3>
              <button onClick={() => setViewEmpDetail(null)} className="text-slate-600 hover:text-slate-300 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-6 pb-6 border-b border-white/8">
              <div className="w-14 h-14 rounded-full bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-xl font-bold text-sky-400">
                {viewEmpDetail.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <p className="text-lg font-bold text-white">{viewEmpDetail.name}</p>
                <p className="text-sm text-slate-500">ID {viewEmpDetail.employeeId}</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: viewEmpDetail.email },
                { icon: Phone, label: 'Phone', value: viewEmpDetail.phone || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon className="w-4 h-4 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-slate-300">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setViewEmpDetail(null)} className="w-full mt-6 py-2.5 rounded-lg border border-white/10 text-slate-400 text-sm hover:text-white hover:border-white/20 transition">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
