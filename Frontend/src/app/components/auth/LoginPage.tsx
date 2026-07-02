import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bus, Mail, Lock, Eye, EyeOff, UserCircle, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { mockUsers } from '../../data/mockData';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 600));

    const user = mockUsers.find(u => u.email === email && u.password === password && u.role !== 'admin');

    if (user) {
      login(user);
      if (user.role === 'employee') navigate('/employee/profile');
      else navigate('/driver/profile');
    } else {
      setError('Invalid email or password. Contact your admin if you need access.');
    }
    setLoading(false);
  };

  const quickLogin = (role: 'employee' | 'driver') => {
    const u = mockUsers.find(u => u.role === role);
    if (u) {
      setEmail(u.email);
      setPassword(u.password || 'demo123');
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #0D1320 0%, #0B1628 50%, #0A1A35 100%)',
        }}
      >
        {/* Decorative grid */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(14,165,233,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(14,165,233,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Bus className="w-5 h-5 text-sky-400" />
            </div>
            <span className="font-rajdhani text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              TranspoRT
            </span>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div>
            <h1 className="text-5xl font-bold text-white leading-tight mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Your Daily<br />
              <span className="text-sky-400">Commute,</span><br />
              Simplified.
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Corporate transport route management for Dhaka&apos;s workforce. Request pickups, track routes, arrive on time.
            </p>
          </div>

          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-sky-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>500+</p>
              <p className="text-slate-500 text-sm mt-1">Employees</p>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>24</p>
              <p className="text-slate-500 text-sm mt-1">Vehicles</p>
            </div>
            <div className="w-px bg-slate-700" />
            <div className="text-center">
              <p className="text-3xl font-bold text-emerald-400" style={{ fontFamily: 'Rajdhani, sans-serif' }}>98%</p>
              <p className="text-slate-500 text-sm mt-1">On-Time Rate</p>
            </div>
          </div>
        </div>

        <p className="relative z-10 text-slate-600 text-xs">© 2026 TranspoRT Systems. All rights reserved.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center">
              <Bus className="w-5 h-5 text-sky-400" />
            </div>
            <span className="text-xl font-bold text-white tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              TranspoRT
            </span>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Sign In
            </h2>
            <p className="text-slate-400 text-sm">
              Use the credentials provided by your administrator.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your.email@company.com"
                  required
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-12 py-3 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/30 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold tracking-wide transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Demo quick login */}
          <div className="mt-8 pt-6 border-t border-white/8">
            <p className="text-xs text-slate-600 text-center mb-4 uppercase tracking-wider">Demo Access</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => quickLogin('employee')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition"
              >
                <UserCircle className="w-4 h-4" />
                Employee Demo
              </button>
              <button
                onClick={() => quickLogin('driver')}
                className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-sm transition"
              >
                <Truck className="w-4 h-4" />
                Driver Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
