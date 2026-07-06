import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { MapPin, Send, CheckCircle, Clock, Lock, Info } from 'lucide-react';
import { InteractiveMap } from '../shared/InteractiveMap';
import { useAuth } from '../../context/AuthContext';
import { OFFICE_LOCATION } from '../../data/mockData';

const SHIFT_OPTIONS = ['07:00', '10:00', '13:00', '16:00', '19:00', '22:00'];
const DHAKA_CENTER: [number, number] = [23.7808, 90.4043];

// Dropoff only available after deadline (Sun–Thu)
const isDropoffAvailable = () => {
  const now = new Date();
  const day = now.getDay();
  return day !== 5 && day !== 6;
};

export const DropoffRequestForm: React.FC = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(user?.address || '');
  const [latitude, setLatitude] = useState(user?.latitude || DHAKA_CENTER[0]);
  const [longitude, setLongitude] = useState(user?.longitude || DHAKA_CENTER[1]);
  const [shiftTime, setShiftTime] = useState('19:00');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const available = isDropoffAvailable();

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (!available) {
    return (
      <Sidebar role="employee">
        <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          <div className="rounded-2xl border border-slate-700/50 bg-white/3 p-10 text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-slate-500/10 border border-slate-500/20 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Not Available Yet
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Dropoff requests can only be submitted <span className="text-white font-medium">after the pickup submission deadline</span> ends (after Saturday). This page opens from Sunday onwards.
            </p>
            <div className="mt-6 px-4 py-2.5 rounded-lg bg-white/4 border border-white/8 text-xs text-slate-600 font-mono">
              Available: Sunday — Thursday
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (submitted) {
    return (
      <Sidebar role="employee">
        <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Request Submitted!</h2>
            <p className="text-slate-400 text-sm">Your dropoff request has been received.</p>
            <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold transition">
              Submit Another
            </button>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Dropoff Request
          </h1>
          <p className="text-slate-500 text-sm">Request a dropoff from office to your home.</p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/15 bg-emerald-500/6 px-5 py-4 mb-6">
          <Info className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-emerald-300/80">
            Dropoff is from <span className="font-semibold text-emerald-300">Office (Motijheel)</span> to your home. Set your home drop point on the map.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/8 bg-card p-5">
              <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Set Dropoff Destination</h3>
              <p className="text-xs text-slate-600 mb-4">Click on the map to pin your drop location.</p>
              <InteractiveMap
                center={[latitude, longitude]}
                zoom={13}
                onLocationSelect={handleLocationSelect}
                markers={[
                  { position: [OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude], label: 'Office (Origin)', color: '#0EA5E9' },
                  ...(latitude !== DHAKA_CENTER[0] ? [{ position: [latitude, longitude] as [number, number], label: 'Your Drop Location', color: '#10B981' }] : []),
                ]}
                showRoute={latitude !== DHAKA_CENTER[0]}
                height="420px"
              />
            </div>

            <div className="rounded-xl border border-white/8 bg-card p-5 space-y-5">
              <div>
                <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Trip / Shift Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <select
                    value={shiftTime}
                    onChange={e => setShiftTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/8 bg-white/4 text-white text-sm focus:outline-none focus:border-sky-500/40 transition"
                  >
                    {SHIFT_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Dropoff Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                  <textarea
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Your home address or click on map…"
                    rows={3}
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-white/8 bg-white/3 p-4">
                <p className="text-xs text-slate-600 mb-2 uppercase tracking-wider">Origin (Fixed)</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-sky-400" />
                  <p className="text-sm text-slate-300">{OFFICE_LOCATION.name}</p>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !location}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4" /> Submit Dropoff Request</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Sidebar>
  );
};
