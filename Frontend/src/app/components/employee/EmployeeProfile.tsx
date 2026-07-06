import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { User as UserIcon, Mail, Phone, MapPin, Lock, Save, CheckCircle, Edit3, Building2, Hash } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockUsers } from '../../data/mockData';

export const EmployeeProfile: React.FC = () => {
  const { user } = useAuth();
  const empData = mockUsers.find(u => u.id === user?.id);

  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({
    name: empData?.name || '',
    phone: empData?.phone || '',
    address: empData?.address || '',
  });
  const [savedProfile, setSavedProfile] = useState(false);

  const [pwdForm, setPwdForm] = useState({ current: '', next: '', confirm: '' });
  const [pwdError, setPwdError] = useState('');
  const [pwdSaved, setPwdSaved] = useState(false);

  const handleSaveProfile = async () => {
    await new Promise(r => setTimeout(r, 600));
    setSavedProfile(true);
    setEditMode(false);
    setTimeout(() => setSavedProfile(false), 3000);
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
    await new Promise(r => setTimeout(r, 600));
    setPwdSaved(true);
    setPwdForm({ current: '', next: '', confirm: '' });
    setTimeout(() => setPwdSaved(false), 3000);
  };

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>My Profile</h1>
          <p className="text-slate-500 text-sm">Manage your personal information and account settings.</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 text-red-700 rounded-lg px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Avatar header */}
        <div className="rounded-xl border border-white/8 bg-card p-6 mb-5 flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/15 border border-sky-500/20 flex items-center justify-center text-2xl font-bold text-sky-400 flex-shrink-0">
            {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>{user?.name}</h2>
            <p className="text-slate-500 text-sm">{user?.email}</p>
            <div className="flex items-center gap-3 mt-2">
              {empData?.employeeId && (
                <span className="text-xs px-2 py-0.5 rounded bg-white/6 border border-white/8 text-slate-500 font-mono">
                  {empData.employeeId}
                </span>
              )}
              {empData?.department && (
                <span className="text-xs px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/15 text-sky-400">
                  {empData.department}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditMode(!editMode)}
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

        {/* Profile info */}
        <div className="rounded-xl border border-white/8 bg-card p-6 mb-5">
          <h3 className="text-sm font-semibold text-white mb-5" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Personal Information
          </h3>

          {editMode ? (
            <div className="space-y-4">
              {[
                { label: 'Full Name', field: 'name', icon: UserIcon, type: 'text', placeholder: 'Your full name' },
                { label: 'Phone Number', field: 'phone', icon: Phone, type: 'text', placeholder: '+880-17xx-xxxxxx' },
                { label: 'Home Address', field: 'address', icon: MapPin, type: 'text', placeholder: 'Your home address' },
              ].map(({ label, field, icon: Icon, type, placeholder }) => (
                <div key={field}>
                  <label className="block text-xs text-slate-500 mb-1.5 uppercase tracking-wider">{label}</label>
                  <div className="relative">
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input
                      type={type}
                      value={(form as any)[field]}
                      onChange={e => setForm(prev => ({ ...prev, [field]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={handleSaveProfile}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition"
              >
                <Save className="w-4 h-4" />
                Save Changes
              </button>
              {savedProfile && (
                <p className="text-xs text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Profile updated successfully.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {[
                { label: 'Full Name', value: user?.name, icon: UserIcon },
                { label: 'Email Address', value: user?.email, icon: Mail },
                { label: 'Phone Number', value: user?.phone, icon: Phone },
                { label: 'Home Address', value: empData?.address, icon: MapPin },
                { label: 'Department', value: empData?.department, icon: Building2 },
                { label: 'Employee ID', value: empData?.employeeId, icon: Hash },
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

        {/* Password change */}
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
                    value={(pwdForm as any)[field]}
                    onChange={e => setPwdForm(prev => ({ ...prev, [field]: e.target.value }))}
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
