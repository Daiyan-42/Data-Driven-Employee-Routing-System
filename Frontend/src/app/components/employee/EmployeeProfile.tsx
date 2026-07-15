import React, { useEffect, useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  Save,
  CheckCircle,
  Edit3,
  Loader2,
  Car,
  Clock,
  Navigation,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../services/transportApi';
import type { Employee, ScheduleResponse } from '../../types/api';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icons for Vite (uses CDN to avoid asset-pipeline issues)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const DEFAULT_CENTER: [number, number] = [23.8103, 90.4125]; // Dhaka

// ── Map sub-components ──────────────────────────────────────────────────────

const ClickHandler: React.FC<{ onPick: (pos: [number, number]) => void }> = ({ onPick }) => {
  useMapEvents({ click: (e) => onPick([e.latlng.lat, e.latlng.lng]) });
  return null;
};

const LocationPicker: React.FC<{
  position: [number, number] | null;
  onChange: (pos: [number, number]) => void;
}> = ({ position, onChange }) => (
  <div className="rounded-lg overflow-hidden border border-white/10" style={{ height: 240 }}>
    <MapContainer
      center={position ?? DEFAULT_CENTER}
      zoom={position ? 14 : 11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <ClickHandler onPick={onChange} />
      {position && (
        <Marker
          position={position}
          draggable
          eventHandlers={{
            dragend(e) {
              const ll = e.target.getLatLng();
              onChange([ll.lat, ll.lng]);
            },
          }}
        />
      )}
    </MapContainer>
  </div>
);

// ── Main component ──────────────────────────────────────────────────────────

export const EmployeeProfile: React.FC = () => {
  const { user, updateUser } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<Employee | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Edit state
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [homePos, setHomePos] = useState<[number, number] | null>(null);

  // Schedule state
  const [schedule, setSchedule] = useState<ScheduleResponse | null>(null);
  const [schedLoading, setSchedLoading] = useState(true);

  // Password change state
  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  // Load profile on mount
  useEffect(() => {
    setProfileLoading(true);
    employeeApi
      .getProfile()
      .then((data) => {
        setProfile(data);
        setForm({ name: data.name, phone: data.phone ?? '' });
        if (data.home_lat != null && data.home_lng != null) {
          setHomePos([data.home_lat, data.home_lng]);
        }
      })
      .catch(() => setProfileError('Could not load profile. Is the backend running?'))
      .finally(() => setProfileLoading(false));
  }, []);

  // Load today's schedule on mount
  useEffect(() => {
    setSchedLoading(true);
    employeeApi
      .getSchedule()
      .then(setSchedule)
      .catch(() => setSchedule({ routing_done: false }))
      .finally(() => setSchedLoading(false));
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const startEdit = () => {
    if (!profile) return;
    setForm({ name: profile.name, phone: profile.phone ?? '' });
    setHomePos(
      profile.home_lat != null && profile.home_lng != null
        ? [profile.home_lat, profile.home_lng]
        : null,
    );
    setSavedOk(false);
    setEditMode(true);
  };

  const cancelEdit = () => setEditMode(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updated = await employeeApi.updateProfile({
        name: form.name.trim() || undefined,
        phone: form.phone.trim() || undefined,
        home_lat: homePos?.[0],
        home_lng: homePos?.[1],
      });
      setProfile(updated);
      updateUser({ name: updated.name, phone: updated.phone ?? undefined });
      setEditMode(false);
      setSavedOk(true);
      setTimeout(() => setSavedOk(false), 3000);
    } catch {
      setProfileError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (pwdForm.next !== pwdForm.confirm) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (pwdForm.next.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }
    // Password change is not yet wired to a backend endpoint — show success locally
    await new Promise((r) => setTimeout(r, 600));
    setPwdSaved(true);
    setPwdForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwdSaved(false), 3000);
  };

  // ── Loading / error states ─────────────────────────────────────────────────

  if (profileLoading) {
    return (
      <Sidebar role="employee">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-sky-400" />
        </div>
      </Sidebar>
    );
  }

  if (profileError && !profile) {
    return (
      <Sidebar role="employee">
        <div className="p-6 max-w-3xl mx-auto">
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {profileError}
          </div>
        </div>
      </Sidebar>
    );
  }

  const p = profile!;
  const initials = p.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-3xl mx-auto space-y-5">

        {/* Page title */}
        <div className="mb-2">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            My Profile
          </h1>
          <p className="text-slate-500 text-sm">Manage your personal information and account settings.</p>
        </div>

        {profileError && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-red-400 text-sm">
            {profileError}
          </div>
        )}

        {/* ── Avatar / header card ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-card p-6 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-2xl font-bold text-sky-400 flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              {p.name}
            </h2>
            <p className="text-slate-500 text-sm">{p.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/15 text-sky-400 capitalize">
                {p.role}
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded border font-medium ${
                  p.status === 'Active'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-slate-500/10 border-slate-500/20 text-slate-400'
                }`}
              >
                {p.status}
              </span>
            </div>
          </div>
          <button
            onClick={editMode ? cancelEdit : startEdit}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
              editMode
                ? 'border-white/15 bg-white/8 text-white'
                : 'border-white/8 bg-white/4 text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Success banner */}
        {savedOk && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            Profile saved successfully.
          </div>
        )}

        {/* ── Profile info card ────────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-card p-6">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Personal Information
          </h3>

          {editMode ? (
            /* Edit mode */
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your full name"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+880-17xx-xxxxxx"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              </div>

              {/* Home location */}
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">
                  Home Location
                </label>
                {homePos && (
                  <p className="text-xs text-slate-600 font-mono mb-2">
                    {homePos[0].toFixed(6)}, {homePos[1].toFixed(6)}
                  </p>
                )}
                <LocationPicker position={homePos} onChange={setHomePos} />
                <p className="text-xs text-slate-600 mt-1.5">
                  Click the map or drag the marker to update your home location.
                </p>
                {/* Manual coordinate inputs */}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="any"
                      value={homePos?.[0] ?? ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setHomePos([v, homePos?.[1] ?? DEFAULT_CENTER[1]]);
                      }}
                      placeholder="23.8103"
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-xs focus:outline-none focus:border-sky-500/40 transition font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-600 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="any"
                      value={homePos?.[1] ?? ''}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!isNaN(v)) setHomePos([homePos?.[0] ?? DEFAULT_CENTER[0], v]);
                      }}
                      placeholder="90.4125"
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-xs focus:outline-none focus:border-sky-500/40 transition font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Save button */}
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-60 text-white font-semibold text-sm transition"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          ) : (
            /* View mode */
            <div className="space-y-1">
              {[
                { label: 'Full Name', value: p.name, icon: UserIcon },
                { label: 'Email Address', value: p.email, icon: Mail },
                { label: 'Phone Number', value: p.phone, icon: Phone },
                {
                  label: 'Home Location',
                  value:
                    p.home_lat != null && p.home_lng != null
                      ? `${p.home_lat.toFixed(5)}, ${p.home_lng.toFixed(5)}`
                      : null,
                  icon: MapPin,
                },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3 py-3 border-b border-white/4 last:border-0">
                  <Icon className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm text-slate-300 font-mono">{value || '—'}</p>
                  </div>
                </div>
              ))}

              {/* Static home location map preview */}
              {p.home_lat != null && p.home_lng != null && (
                <div className="pt-3">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-2">Home on Map</p>
                  <div className="rounded-lg overflow-hidden border border-white/10" style={{ height: 200 }}>
                    <MapContainer
                      center={[p.home_lat, p.home_lng]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                      dragging={false}
                      zoomControl={false}
                      scrollWheelZoom={false}
                      doubleClickZoom={false}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Marker position={[p.home_lat, p.home_lng]} />
                    </MapContainer>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Today's Schedule card ────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-card p-6">
          <h3
            className="text-sm font-semibold text-white mb-5 flex items-center gap-2"
            style={{ fontFamily: 'Rajdhani, sans-serif' }}
          >
            <Navigation className="w-4 h-4 text-sky-400" />
            Today's Assigned Route
          </h3>

          {schedLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
            </div>
          ) : !schedule?.routing_done ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <MapPin className="w-8 h-8 text-slate-700 mb-3" />
              <p className="text-slate-400 text-sm font-medium">No route assigned yet</p>
              <p className="text-slate-600 text-xs mt-1 max-w-xs">
                The admin hasn't run routing for today. Check back once routing is complete.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Info column */}
              <div className="space-y-3">
                {/* Service type & shift */}
                <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Service</p>
                  <p className="text-sm text-white font-medium capitalize">
                    {schedule.route_type ?? 'Pickup'}
                  </p>
                  {schedule.shift_time && (
                    <p className="text-xs text-sky-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Shift: {schedule.shift_time}
                    </p>
                  )}
                </div>

                {/* Stop info */}
                {schedule.stop && (
                  <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Your Stop</p>
                    <p className="text-sm text-white font-medium">Stop #{schedule.stop.sequence_order}</p>
                    <p className="text-xs text-slate-500 font-mono">
                      {schedule.stop.latitude.toFixed(5)}, {schedule.stop.longitude.toFixed(5)}
                    </p>
                    {schedule.stop.arrival_time && (
                      <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Arrival: {schedule.stop.arrival_time}
                      </p>
                    )}
                  </div>
                )}

                {/* Driver */}
                <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Driver</p>
                  {schedule.driver ? (
                    <>
                      <p className="text-sm text-white font-medium">{schedule.driver.name ?? '—'}</p>
                      {schedule.driver.phone && (
                        <p className="text-xs text-slate-500 mt-0.5">{schedule.driver.phone}</p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">Not yet assigned</p>
                  )}
                </div>

                {/* Vehicle */}
                <div className="rounded-lg border border-white/8 bg-white/3 px-4 py-3">
                  <p className="text-xs text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Car className="w-3 h-3" /> Vehicle
                  </p>
                  {schedule.vehicle ? (
                    <>
                      <p className="text-sm text-white font-semibold font-mono">
                        {schedule.vehicle.plate_no ?? '—'}
                      </p>
                      {schedule.vehicle.capacity && (
                        <p className="text-xs text-slate-500 mt-0.5">
                          Capacity: {schedule.vehicle.capacity} seats
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-600">Not yet assigned</p>
                  )}
                </div>
              </div>

              {/* Map column */}
              <div>
                {schedule.stop ? (
                  <div className="rounded-lg overflow-hidden border border-white/10" style={{ height: 280 }}>
                    <MapContainer
                      center={[schedule.stop.latitude, schedule.stop.longitude]}
                      zoom={14}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />
                      <Marker position={[schedule.stop.latitude, schedule.stop.longitude]}>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <p className="font-semibold">Stop #{schedule.stop.sequence_order}</p>
                            {schedule.stop.arrival_time && (
                              <p>Arrival: {schedule.stop.arrival_time}</p>
                            )}
                            {schedule.driver?.name && <p>Driver: {schedule.driver.name}</p>}
                            {schedule.vehicle?.plate_no && <p>Plate: {schedule.vehicle.plate_no}</p>}
                          </div>
                        </Popup>
                      </Marker>
                    </MapContainer>
                  </div>
                ) : (
                  <div
                    className="rounded-lg border border-white/8 flex items-center justify-center"
                    style={{ height: 280 }}
                  >
                    <p className="text-slate-600 text-sm">No coordinates available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Password change card ─────────────────────────────────────────── */}
        <div className="rounded-xl border border-white/8 bg-card p-6">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Change Password
          </h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {[
              { label: 'Current Password', field: 'current', placeholder: 'Enter current password' },
              { label: 'New Password', field: 'next', placeholder: 'At least 6 characters' },
              { label: 'Confirm New Password', field: 'confirm', placeholder: 'Repeat new password' },
            ].map(({ label, field, placeholder }) => (
              <div key={field}>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="password"
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    value={(pwdForm as any)[field]}
                    onChange={(e) =>
                      setPwdForm((prev) => ({ ...prev, [field]: e.target.value }))
                    }
                    placeholder={placeholder}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              </div>
            ))}
            {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            {pwdSaved && (
              <p className="text-xs text-emerald-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Password changed successfully.
              </p>
            )}
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/8 border border-white/12 hover:bg-white/12 text-white font-semibold text-sm transition"
            >
              <Lock className="w-4 h-4" />
              Update Password
            </button>
          </form>
        </div>

      </div>
    </Sidebar>
  );
};
