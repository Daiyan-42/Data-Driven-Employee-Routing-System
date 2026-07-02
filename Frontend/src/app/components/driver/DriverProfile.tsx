import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { User as UserIcon, Mail, Phone, MapPin, Lock, Save, CheckCircle, Car, Hash, Shield, Fuel } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockDrivers, mockVehicles } from '../../data/mockData';

export const DriverProfile: React.FC = () => {
  const { user } = useAuth();
  const driver = mockDrivers.find(d => d.userId === user?.id) || mockDrivers[0];
  const vehicle = mockVehicles.find(v => v.id === driver?.vehicleId);

  const [editMode, setEditMode] = useState(false);
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [saved, setSaved] = useState(false);

  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 600));
    setSaved(true);
    setEditMode(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChangePwd = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError('');
    if (pwdForm.next !== pwdForm.confirm) { setPwdError('Passwords do not match.'); return; }
    if (pwdForm.next.length < 6) { setPwdError('Min 6 characters.'); return; }
    await new Promise(r => setTimeout(r, 600));
    setPwdSaved(true);
    setPwdForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwdSaved(false), 3000);
  };

  return (
    <Sidebar role="driver">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>My Profile</h1>
          <p className="text-slate-500 text-sm">Your driver information and vehicle assignment.</p>
        </div>

        {/* Avatar header */}
        <div className="rounded-xl border border-white/8 bg-card p-6 mb-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center text-2xl font-bold text-emerald-400 flex-shrink-0">
            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{user?.name}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/15 text-emerald-400">
                Driver
              </span>
              {driver?.experience && (
                <span className="text-xs px-2 py-0.5 rounded bg-white/6 border border-white/8 text-slate-500">
                  {driver.experience} experience
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition ${editMode ? 'border-white/15 bg-white/8 text-white' : 'border-white/8 bg-white/4 text-slate-400 hover:text-white'}`}
          >
            {editMode ? 'Cancel' : 'Edit'}
          </button>
        </div>

        {/* Vehicle card */}
        {vehicle && (
          <div className="rounded-xl border border-sky-500/15 bg-sky-500/6 p-5 mb-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/20 flex items-center justify-center">
                <Car className="w-5 h-5 text-sky-400" />
              </div>
              <h3 className="text-sm font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Assigned Vehicle</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Plate Number', value: vehicle.plateNumber, icon: Hash },
                { label: 'Model', value: vehicle.model, icon: Car },
                { label: 'Type', value: vehicle.type, icon: Fuel },
                { label: 'Capacity', value: `${vehicle.capacity} seats`, icon: UserIcon },
                { label: 'Color', value: vehicle.color, icon: Shield },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-2">
                  <Icon className="w-4 h-4 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider">{label}</p>
                    <p className="text-sm text-slate-300 font-medium">{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Personal info */}
        <div className="rounded-xl border border-white/8 bg-card p-6 mb-5">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Personal Information</h3>
          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">Home Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="text"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              </div>
              <button onClick={handleSave} className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition">
                <Save className="w-4 h-4" /> Save Changes
              </button>
              {saved && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Saved.</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Full Name', value: user?.name, icon: UserIcon },
                { label: 'Email', value: user?.email, icon: Mail },
                { label: 'Phone', value: user?.phone, icon: Phone },
                { label: 'Home Address', value: user?.address, icon: MapPin },
                { label: 'License Number', value: driver?.licenseNumber, icon: Shield },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-start gap-3 py-3 border-b border-white/4 last:border-0">
                  <Icon className="w-4 h-4 text-slate-600 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-sm text-slate-300">{value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Password */}
        <div className="rounded-xl border border-white/8 bg-card p-6">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Change Password</h3>
          <form onSubmit={handleChangePwd} className="space-y-4">
            {[
              { label: 'Current Password', field: 'current' },
              { label: 'New Password', field: 'next' },
              { label: 'Confirm New Password', field: 'confirm' },
            ].map(({ label, field }) => (
              <div key={field}>
                <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <input
                    type="password"
                    value={(pwdForm as any)[field]}
                    onChange={e => setPwdForm(prev => ({ ...prev, [field]: e.target.value }))}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                  />
                </div>
              </div>
            ))}
            {pwdError && <p className="text-xs text-red-400">{pwdError}</p>}
            {pwdSaved && <p className="text-xs text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Password updated.</p>}
            <button type="submit" className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white/8 border border-white/12 hover:bg-white/12 text-white font-semibold text-sm transition">
              <Lock className="w-4 h-4" /> Update Password
            </button>
          </form>
        </div>
      </div>
    </Sidebar>
  );
};
