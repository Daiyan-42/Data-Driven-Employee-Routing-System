import React, { useState } from 'react';
import { Sidebar } from '../shared/Sidebar';
import { MapPin, Send, CheckCircle, Lock, Info, Zap, Clock } from 'lucide-react';
import { InteractiveMap } from '../shared/InteractiveMap';
import { useAuth } from '../../context/AuthContext';
import { pickupRequestApi } from '../../services/transportApi';

const DHAKA_CENTER: [number, number] = [23.7808, 90.4043];

const todayInput = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const isTooCloseToShift = (shiftTime: string) => {
  const shiftDate = new Date(`${todayInput()}T${shiftTime}:00`);
  return shiftDate.getTime() - Date.now() < 2 * 60 * 60 * 1000;
};

export const AdhocRequestForm: React.FC = () => {
  const { user } = useAuth();
  const [location, setLocation] = useState(user?.address || '');
  const [latitude, setLatitude] = useState(user?.latitude || DHAKA_CENTER[0]);
  const [longitude, setLongitude] = useState(user?.longitude || DHAKA_CENTER[1]);
  const [reason, setReason] = useState('');
  const [tripTime, setTripTime] = useState('07:00');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooCloseToShift = isTooCloseToShift(tripTime);

  const handleLocationSelect = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
    setLocation(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (tooCloseToShift) {
      setError('Ad-hoc pickup must be submitted at least 2 hours before shift start.');
      return;
    }

    setIsSubmitting(true);

    try {
      await pickupRequestApi.create({
        pickup_lat: latitude,
        pickup_lng: longitude,
        shift_start_time: tripTime,
        service_date: todayInput(),
      });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ad-hoc request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Sidebar role="employee">
        <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Ad-hoc Submitted!</h2>
            <p className="text-slate-400 text-sm">Your ad-hoc request is pending approval. You will be notified shortly.</p>
            <button onClick={() => setSubmitted(false)} className="mt-6 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold transition">
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
          <div className="flex items-center gap-3 mb-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <h1 className="text-3xl font-bold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Ad-hoc Request
            </h1>
          </div>
          <p className="text-slate-500 text-sm ml-11">For unplanned same-day transport needs.</p>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-amber-500/15 bg-amber-500/6 px-5 py-4 mb-6">
          <Info className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-300/80">
            Ad-hoc requests must be submitted at least <span className="font-semibold text-amber-300">2 hours before your trip</span>. Late requests will not be accepted.
          </p>
        </div>

        {(error || tooCloseToShift) && (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/8 px-5 py-4 mb-6">
            <Lock className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-red-300/90">
              {error ?? 'This trip is less than 2 hours away, so ad-hoc submission is closed.'}
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="rounded-xl border border-white/8 bg-card p-5">
              <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>Pickup Location</h3>
              <p className="text-xs text-slate-600 mb-4">Click on the Dhaka map to set your location.</p>
              <InteractiveMap
                center={[latitude, longitude]}
                zoom={13}
                onLocationSelect={handleLocationSelect}
                markers={
                  latitude !== DHAKA_CENTER[0]
                    ? [{ position: [latitude, longitude] as [number, number], label: 'Ad-hoc Pickup', color: '#F59E0B' }]
                    : []
                }
                height="420px"
              />
            </div>

            <div className="rounded-xl border border-white/8 bg-card p-5 space-y-5">
              <div>
                <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Requested Trip Time</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                  <select
                    value={tripTime}
                    onChange={e => setTripTime(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-white/8 bg-white/4 text-white text-sm focus:outline-none focus:border-amber-500/40 transition"
                  >
                    {['07:00', '10:00', '13:00', '16:00', '19:00', '22:00'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Pickup Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                  <textarea
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Your current or pickup address…"
                    rows={3}
                    required
                    className="w-full pl-9 pr-4 py-3 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-amber-500/40 transition resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Missed regular bus, urgent work…"
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-amber-500/40 transition resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !location || tooCloseToShift}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition disabled:opacity-60"
              >
                {isSubmitting ? (
                  <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Submitting...</>
                ) : (
                  <><Zap className="w-4 h-4" /> Submit Ad-hoc Request</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </Sidebar>
  );
};
