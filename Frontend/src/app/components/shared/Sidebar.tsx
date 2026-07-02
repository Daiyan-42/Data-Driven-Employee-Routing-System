import React, { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  MapPinned, MapPin, ClipboardList, User, LogOut, Map,
  Car, Menu, X, Zap, Bus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  role: 'employee' | 'driver';
  children: ReactNode;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string;
  color?: string;
}

const employeeNavItems: NavItem[] = [
  { icon: MapPinned, label: 'Pickup Request', path: '/employee/pickup', color: 'text-sky-400' },
  { icon: MapPin, label: 'Dropoff Request', path: '/employee/dropoff', color: 'text-emerald-400' },
  { icon: Zap, label: 'Ad-hoc Request', path: '/employee/adhoc', color: 'text-amber-400' },
  { icon: ClipboardList, label: 'My Requests', path: '/employee/requests', color: 'text-purple-400' },
  { icon: User, label: 'My Profile', path: '/employee/profile', color: 'text-slate-400' },
];

const driverNavItems: NavItem[] = [
  { icon: Map, label: "Today's Trips", path: '/driver/trips', color: 'text-sky-400' },
  { icon: User, label: 'My Profile', path: '/driver/profile', color: 'text-slate-400' },
];

export const Sidebar: React.FC<SidebarProps> = ({ role, children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navItems = role === 'employee' ? employeeNavItems : driverNavItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
            <Bus className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <p className="font-bold text-white text-base tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              TranspoRT
            </p>
            <p className="text-xs text-slate-600 capitalize">{role} Portal</p>
          </div>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-4 border-b border-white/6">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/4 border border-white/6">
          <div className="w-9 h-9 rounded-full bg-sky-500/20 border border-sky-500/25 flex items-center justify-center text-sm font-bold text-sky-400 flex-shrink-0">
            {user?.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-600 truncate">{user?.email}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
            >
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  active
                    ? 'bg-sky-500/15 border border-sky-500/20 text-white'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-sky-400' : (item.color || 'text-slate-500')}`} />
                <span className={`text-sm font-medium flex-1 ${active ? 'text-white' : ''}`}>{item.label}</span>
                {item.badge && (
                  <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${active ? 'bg-sky-500/30 text-sky-300' : 'bg-amber-500/20 text-amber-400'}`}>
                    {item.badge}
                  </span>
                )}
                {active && (
                  <div className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/6">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-500/70 hover:text-red-400 hover:bg-red-500/8 transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex md:flex-col w-60 flex-shrink-0 border-r border-white/6"
        style={{ background: '#0D1320' }}
      >
        <SidebarContent />
      </aside>

      {/* Mobile topbar */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 border-b border-white/6"
        style={{ background: '#0D1320' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/15 border border-sky-500/25 flex items-center justify-center">
            <Bus className="w-4 h-4 text-sky-400" />
          </div>
          <span className="font-bold text-white tracking-wide" style={{ fontFamily: 'Rajdhani, sans-serif' }}>TranspoRT</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-400 hover:text-white transition"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 bg-black/60 z-40"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            className="md:hidden fixed top-0 left-0 bottom-0 w-60 z-50 border-r border-white/6"
            style={{ background: '#0D1320' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
};
