import React, { useState, useMemo } from 'react';
import { Sidebar } from '../shared/Sidebar';
import {
  MapPin, Clock, Send, CheckCircle, ArrowRight, ArrowLeft,
  Info, Calendar, AlertTriangle, Lock,
} from 'lucide-react';
import { InteractiveMap } from '../shared/InteractiveMap';
import { useAuth } from '../../context/AuthContext';

const ALL_DAYS = [
  { id: 'sunday', label: 'Sun', full: 'Sunday' },
  { id: 'monday', label: 'Mon', full: 'Monday' },
  { id: 'tuesday', label: 'Tue', full: 'Tuesday' },
  { id: 'wednesday', label: 'Wed', full: 'Wednesday' },
  { id: 'thursday', label: 'Thu', full: 'Thursday' },
  { id: 'friday', label: 'Fri', full: 'Friday' },
  { id: 'saturday', label: 'Sat', full: 'Saturday' },
];

const SHIFT_OPTIONS = ['07:00', '10:00', '13:00', '16:00', '19:00', '22:00'];

// Dhaka city center
const DHAKA_CENTER: [number, number] = [23.7808, 90.4043];

interface DaySchedule {
  day: string;
  location: string;
  latitude: number;
  longitude: number;
  shiftTime: string;
}

// Deadline: Friday midnight to Saturday midnight (Sun–Thu window only)
const isWithinDeadline = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri, 6=Sat
  return day !== 5 && day !== 6; // Fri & Sat are deadline window — submission allowed
};

const deadlinePassed = () => {
  const now = new Date();
  const day = now.getDay();
  return day !== 5 && day !== 6;
};

export const PickupRequestForm: React.FC = () => {
  const { user } = useAuth();
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday']);
  const [currentDayIdx, setCurrentDayIdx] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<'days' | 'details' | 'success'>('days');

  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(
      ALL_DAYS.map(d => [
        d.id,
        {
          day: d.id,
          location: user?.address || '',
          latitude: user?.latitude || DHAKA_CENTER[0],
          longitude: user?.longitude || DHAKA_CENTER[1],
          shiftTime: '07:00',
        },
      ])
    )
  );

  const withinDeadline = !deadlinePassed(); // flip: deadline open on Fri/Sat

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const currentDay = selectedDays[currentDayIdx];
  const currentSchedule = schedules[currentDay] || null;

  const handleLocationSelect = (lat: number, lng: number) => {
    if (!currentDay) return;
    setSchedules(prev => ({
      ...prev,
      [currentDay]: { ...prev[currentDay], latitude: lat, longitude: lng, location: `${lat.toFixed(5)}, ${lng.toFixed(5)}` },
    }));
  };

  const handleFieldChange = (field: keyof DaySchedule, value: string) => {
    if (!currentDay) return;
    setSchedules(prev => ({ ...prev, [currentDay]: { ...prev[currentDay], [field]: value } }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setIsSubmitting(false);
    setStep('success');
  };

  if (!withinDeadline) {
    return (
      <Sidebar role="employee">
        <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 p-10 text-center max-w-md">
            <div className="w-14 h-14 rounded-full bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Submission Window Closed
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Pickup requests for the upcoming week can only be submitted on <span className="text-amber-400 font-medium">Friday and Saturday</span>.
              The next submission window opens this Friday.
            </p>
            <div className="mt-6 px-4 py-2.5 rounded-lg bg-white/4 border border-white/8 text-xs text-slate-500 font-mono">
              Next window: Friday 00:00 — Saturday 23:59
            </div>
          </div>
        </div>
      </Sidebar>
    );
  }

  if (step === 'success') {
    return (
      <Sidebar role="employee">
        <div className="p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[70vh]">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
              Requests Submitted!
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">
              Pickup requests for <span className="text-white font-medium">{selectedDays.length} day(s)</span> have been submitted.
            </p>
            <p className="text-xs text-slate-600">
              You will be notified once routes are assigned. Check <strong className="text-slate-400">My Requests</strong> for status.
            </p>
            <button
              onClick={() => { setStep('days'); setSelectedDays(['monday']); setCurrentDayIdx(0); }}
              className="mt-6 px-6 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-sm font-semibold transition"
            >
              Submit Another Week
            </button>
          </div>
        </div>
      </Sidebar>
    );
  }

  return (
    <Sidebar role="employee">
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
            Pickup Request
          </h1>
          <p className="text-slate-500 text-sm">Select your shift days and enter pickup locations for each.</p>
        </div>

        {/* Deadline notice */}
        <div className="flex items-start gap-3 rounded-xl border border-sky-500/15 bg-sky-500/8 px-5 py-4 mb-6">
          <Info className="w-4 h-4 text-sky-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-300/80">
            Pickup requests for next week must be submitted by <span className="font-semibold text-sky-300">Saturday midnight</span>.
            Late submissions will not be accepted.
          </p>
        </div>

        {step === 'days' && (
          <div className="space-y-6">
            {/* Day selector */}
            <div className="rounded-xl border border-white/8 bg-card p-6">
              <h3 className="text-base font-semibold text-white mb-4" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                Which days do you have a shift?
              </h3>
              <div className="flex gap-3 flex-wrap">
                {ALL_DAYS.map(d => {
                  const selected = selectedDays.includes(d.id);
                  return (
                    <button
                      key={d.id}
                      onClick={() => toggleDay(d.id)}
                      className={`px-5 py-3 rounded-xl text-sm font-semibold transition-all border ${
                        selected
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : 'border-white/8 bg-white/4 text-slate-500 hover:text-slate-300 hover:border-white/15'
                      }`}
                    >
                      {d.full}
                    </button>
                  );
                })}
              </div>
              {selectedDays.length === 0 && (
                <p className="text-xs text-amber-400 mt-3 flex items-center gap-2">
                  <AlertTriangle className="w-3 h-3" /> Select at least one day.
                </p>
              )}
            </div>

            <button
              disabled={selectedDays.length === 0}
              onClick={() => { setCurrentDayIdx(0); setStep('details'); }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Set Locations
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {step === 'details' && currentSchedule && (
          <div className="space-y-6">
            {/* Day tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              {selectedDays.map((d, i) => {
                const dayInfo = ALL_DAYS.find(x => x.id === d)!;
                const active = i === currentDayIdx;
                const filled = schedules[d]?.location && schedules[d]?.shiftTime;
                return (
                  <button
                    key={d}
                    onClick={() => setCurrentDayIdx(i)}
                    className={`flex-shrink-0 px-4 py-2.5 rounded-lg text-sm font-medium transition border ${
                      active
                        ? 'bg-sky-500/20 border-sky-500/30 text-sky-300'
                        : 'border-white/8 bg-white/4 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {dayInfo.full}
                    {filled && <span className="ml-2 w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Map */}
              <div className="rounded-xl border border-white/8 bg-card p-5">
                <h3 className="text-sm font-semibold text-white mb-1" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                  Pick location on map
                </h3>
                <p className="text-xs text-slate-600 mb-4">Click anywhere on the Dhaka city map to set your pickup point.</p>
                <InteractiveMap
                  center={[currentSchedule.latitude, currentSchedule.longitude]}
                  zoom={13}
                  onLocationSelect={handleLocationSelect}
                  markers={
                    currentSchedule.location
                      ? [{ position: [currentSchedule.latitude, currentSchedule.longitude], label: 'Pickup', color: '#0EA5E9' }]
                      : []
                  }
                  height="420px"
                />
              </div>

              {/* Form */}
              <div className="rounded-xl border border-white/8 bg-card p-5 space-y-5">
                <div className="flex items-center gap-2 pb-4 border-b border-white/8">
                  <Calendar className="w-4 h-4 text-sky-400" />
                  <h3 className="text-base font-semibold text-white" style={{ fontFamily: 'Rajdhani, sans-serif' }}>
                    {ALL_DAYS.find(d => d.id === currentDay)?.full} — Details
                  </h3>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Shift Time</label>
                  <select
                    value={currentSchedule.shiftTime}
                    onChange={e => handleFieldChange('shiftTime', e.target.value)}
                    className="w-full px-3 py-3 rounded-lg border border-white/8 bg-white/4 text-white text-sm focus:outline-none focus:border-sky-500/40 transition"
                  >
                    {SHIFT_OPTIONS.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-500 mb-2 uppercase tracking-wider">Pickup Address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-600" />
                    <textarea
                      value={currentSchedule.location}
                      onChange={e => handleFieldChange('location', e.target.value)}
                      placeholder="Type your full address, or click on the map…"
                      rows={3}
                      className="w-full pl-9 pr-4 py-3 rounded-lg border border-white/8 bg-white/4 text-white placeholder:text-slate-700 text-sm focus:outline-none focus:border-sky-500/40 transition resize-none"
                    />
                  </div>
                </div>

                {currentSchedule.latitude !== DHAKA_CENTER[0] && (
                  <div className="flex items-center gap-2 rounded-lg bg-emerald-500/8 border border-emerald-500/15 px-3 py-2.5">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="text-xs">
                      <p className="text-emerald-300 font-medium">Location pinned on map</p>
                      <p className="text-slate-600 font-mono">
                        {currentSchedule.latitude.toFixed(5)}, {currentSchedule.longitude.toFixed(5)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex gap-3 pt-2">
                  {currentDayIdx > 0 && (
                    <button
                      onClick={() => setCurrentDayIdx(i => i - 1)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white hover:border-white/20 text-sm transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      {ALL_DAYS.find(d => d.id === selectedDays[currentDayIdx - 1])?.full}
                    </button>
                  )}
                  {currentDayIdx < selectedDays.length - 1 ? (
                    <button
                      onClick={() => setCurrentDayIdx(i => i + 1)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-300 hover:bg-sky-500/25 text-sm transition ml-auto"
                    >
                      {ALL_DAYS.find(d => d.id === selectedDays[currentDayIdx + 1])?.full}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-semibold text-sm transition disabled:opacity-60 ml-auto"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Submit All
                        </>
                      )}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setStep('days')}
                  className="text-xs text-slate-600 hover:text-slate-400 transition"
                >
                  ← Change selected days
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Sidebar>
  );
};
