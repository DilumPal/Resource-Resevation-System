'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import {
  X,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Users,
  MapPin,
  Sparkles,
  Layers,
  Check,
  ChevronRight,
  Info,
  Timer,
} from 'lucide-react';
import { ResourceData, getCategoryIcon, getLiveStatus } from '../resources/ResourceCard';
import {
  createReservation,
  checkSlotConflict,
  getAvailableSlots,
  TimeSlot,
} from '@/actions/reservations';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';
import { TimezoneBadge } from '../common/TimezoneBadge';

export interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  resources: ResourceData[];
  initialResourceId?: string;
  initialDate?: string; // YYYY-MM-DD
  initialStartTime?: string; // ISO string or HH:mm
  initialEndTime?: string; // ISO string or HH:mm
  onSuccess?: () => void;
}

// Generate time options from 08:00 to 20:00 in 30-min increments
const TIME_OPTIONS: string[] = [];
for (let h = 8; h <= 20; h++) {
  const hPad = String(h).padStart(2, '0');
  TIME_OPTIONS.push(`${hPad}:00`);
  if (h < 20) {
    TIME_OPTIONS.push(`${hPad}:30`);
  }
}

function formatTimeString(time24: string) {
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr || '00';
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${ampm}`;
}

export function BookingModal({
  isOpen,
  onClose,
  resources,
  initialResourceId,
  initialDate,
  initialStartTime,
  initialEndTime,
  onSuccess,
}: BookingModalProps) {
  const { currentUser, role } = useUserRole();
  const { showToast } = useNotification();

  // Selected Resource
  const [selectedResourceId, setSelectedResourceId] = useState<string>(() => {
    if (initialResourceId && resources.some((r) => r.id === initialResourceId)) {
      return initialResourceId;
    }
    return resources[0]?.id || '';
  });

  // Today as YYYY-MM-DD
  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  // Selected Date
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (initialDate && initialDate.length >= 10) {
      return initialDate.slice(0, 10);
    }
    return todayStr;
  });

  // Time strings in 24h format "09:00", "10:30"
  const [startTime, setStartTime] = useState<string>(() => {
    if (initialStartTime) {
      if (initialStartTime.includes('T')) {
        const d = new Date(initialStartTime);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
      return initialStartTime;
    }
    return '09:00';
  });

  const [endTime, setEndTime] = useState<string>(() => {
    if (initialEndTime) {
      if (initialEndTime.includes('T')) {
        const d = new Date(initialEndTime);
        const h = String(d.getHours()).padStart(2, '0');
        const m = String(d.getMinutes()).padStart(2, '0');
        return `${h}:${m}`;
      }
      return initialEndTime;
    }
    return '10:00';
  });

  // Form Fields
  const [title, setTitle] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Conflict Checking State
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);
  const [conflictResult, setConflictResult] = useState<{
    hasConflict: boolean;
    canBook: boolean;
    message?: string;
    conflictType?: string;
  } | null>(null);

  // Day's booked slots for visual mini timeline
  const [daySlots, setDaySlots] = useState<TimeSlot[]>([]);

  // Update resource if initialResourceId changes
  useEffect(() => {
    if (initialResourceId && resources.some((r) => r.id === initialResourceId)) {
      setSelectedResourceId(initialResourceId);
    }
  }, [initialResourceId, resources]);

  // Update date/times if initial props change
  useEffect(() => {
    if (initialDate && initialDate.length >= 10) {
      setSelectedDate(initialDate.slice(0, 10));
    }
  }, [initialDate]);

  useEffect(() => {
    if (initialStartTime && initialStartTime.includes('T')) {
      const d = new Date(initialStartTime);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setStartTime(`${h}:${m}`);
    }
    if (initialEndTime && initialEndTime.includes('T')) {
      const d = new Date(initialEndTime);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      setEndTime(`${h}:${m}`);
    }
  }, [initialStartTime, initialEndTime]);

  // Current active resource
  const activeResource = useMemo(() => {
    return resources.find((r) => r.id === selectedResourceId) || resources[0];
  }, [resources, selectedResourceId]);

  // Load day slots for the mini-timeline
  useEffect(() => {
    if (!isOpen || !selectedResourceId || !selectedDate) return;

    let isMounted = true;
    getAvailableSlots(selectedResourceId, selectedDate).then((res) => {
      if (isMounted && res.success) {
        setDaySlots(res.slots);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedResourceId, selectedDate]);

  // Calculate duration in minutes
  const durationMinutes = useMemo(() => {
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startTotal = startH * 60 + startM;
    const endTotal = endH * 60 + endM;
    return endTotal - startTotal;
  }, [startTime, endTime]);

  // Formatted duration string
  const durationLabel = useMemo(() => {
    if (durationMinutes <= 0) return 'Invalid time range';
    const hours = Math.floor(durationMinutes / 60);
    const mins = durationMinutes % 60;
    if (hours > 0 && mins > 0) return `${hours} hr ${mins} min`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${mins} min`;
  }, [durationMinutes]);

  // Construct start and end Date objects for validation & submission
  const { startDateTime, endDateTime } = useMemo(() => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const [sH, sM] = startTime.split(':').map(Number);
    const [eH, eM] = endTime.split(':').map(Number);

    const start = new Date(y, m - 1, d, sH, sM, 0, 0);
    const end = new Date(y, m - 1, d, eH, eM, 0, 0);

    return { startDateTime: start, endDateTime: end };
  }, [selectedDate, startTime, endTime]);

  // Live real-time conflict checking
  useEffect(() => {
    if (!isOpen || !selectedResourceId || !selectedDate) return;

    // Fast client-side preliminary checks
    if (durationMinutes <= 0) {
      setConflictResult({
        hasConflict: true,
        canBook: false,
        message: 'Start time must be strictly earlier than end time.',
        conflictType: 'INVALID_DURATION',
      });
      return;
    }

    if (startDateTime.getTime() < Date.now() - 60 * 1000) {
      setConflictResult({
        hasConflict: true,
        canBook: false,
        message: 'Cannot schedule a reservation in the past.',
        conflictType: 'PAST_TIME',
      });
      return;
    }

    // Debounced server-side atomic check against database
    setIsCheckingConflict(true);
    const timer = setTimeout(async () => {
      try {
        const res = await checkSlotConflict({
          resourceId: selectedResourceId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
        });

        if (res.success) {
          setConflictResult({
            hasConflict: res.hasConflict,
            canBook: res.canBook,
            message: res.message,
            conflictType: res.conflictType,
          });
        } else {
          setConflictResult({
            hasConflict: true,
            canBook: false,
            message: res.message || 'Error validating slot conflict.',
          });
        }
      } catch (err) {
        console.error('Error during conflict check:', err);
      } finally {
        setIsCheckingConflict(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [isOpen, selectedResourceId, selectedDate, startTime, endTime, durationMinutes, startDateTime, endDateTime]);

  // Duration Quick Select Handler
  const handleQuickDuration = (minutes: number) => {
    const [sH, sM] = startTime.split(':').map(Number);
    const startTotal = sH * 60 + sM;
    const endTotal = Math.min(20 * 60, startTotal + minutes);

    const endH = Math.floor(endTotal / 60);
    const endM = endTotal % 60;
    const endHPad = String(endH).padStart(2, '0');
    const endMPad = String(endM).padStart(2, '0');

    setEndTime(`${endHPad}:${endMPad}`);
  };

  // Submit Booking Form
  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeResource) return;

    if (!title.trim()) {
      showToast({
        type: 'warning',
        title: 'Title Required',
        message: 'Please provide a descriptive reservation title.',
      });
      return;
    }

    if (conflictResult?.hasConflict || !conflictResult?.canBook) {
      showToast({
        type: 'error',
        title: 'Scheduling Conflict',
        message: conflictResult?.message || 'The selected slot cannot be booked due to conflicts.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createReservation({
        resourceId: activeResource.id,
        userId: currentUser.id,
        title: title.trim(),
        purpose: purpose.trim() || undefined,
        startTime: startDateTime.toISOString(),
        endTime: endDateTime.toISOString(),
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: res.requiresApproval ? 'Approval Requested' : 'Reservation Confirmed',
          message: res.message || 'Your reservation has been booked successfully.',
        });

        // Reset form
        setTitle('');
        setPurpose('');
        onClose();

        if (onSuccess) {
          onSuccess();
        }
      } else {
        showToast({
          type: 'error',
          title: 'Booking Failed',
          message: res.error || 'The requested slot could not be reserved.',
        });
      }
    } catch (err) {
      console.error('Failed to reserve slot:', err);
      showToast({
        type: 'error',
        title: 'System Error',
        message: 'An unexpected error occurred while confirming reservation.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const liveStatus = activeResource ? getLiveStatus(activeResource) : null;
  const isFormValid =
    title.trim().length > 0 &&
    durationMinutes > 0 &&
    conflictResult !== null &&
    !conflictResult.hasConflict &&
    conflictResult.canBook;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Reserve Resource
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Instant zero-conflict validation with turnaround protection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close booking modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmitBooking} className="p-6 space-y-6">
          {/* Resource Selector & Information Banner */}
          <div className="p-4 rounded-xl border border-zinc-200/90 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Selected Asset
                </label>
                <div className="relative">
                  <select
                    value={selectedResourceId}
                    onChange={(e) => setSelectedResourceId(e.target.value)}
                    className="w-full appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 pr-9 text-xs font-bold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer shadow-xs"
                  >
                    {resources.map((r) => (
                      <option key={r.id} value={r.id}>
                        [{r.code}] {r.name} ({r.category.name})
                      </option>
                    ))}
                  </select>
                  <Layers className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {activeResource && (
                <div className="flex flex-wrap items-center gap-1.5 sm:self-end">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-xs">
                    <MapPin className="w-3 h-3 text-zinc-400" />
                    <span>{activeResource.location}</span>
                  </span>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 shadow-xs">
                    <Users className="w-3 h-3 text-zinc-400" />
                    <span>Max {activeResource.capacity}</span>
                  </span>

                  {liveStatus && (
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${liveStatus.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${liveStatus.dotClass}`} />
                      <span>{liveStatus.label}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Turnaround buffer notice */}
            {activeResource && activeResource.bufferMinutes > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 px-3 py-1.5 rounded-lg">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>
                  <strong>Turnaround Policy:</strong> A {activeResource.bufferMinutes}-minute buffer
                  is enforced immediately following bookings for turnover & sanitization.
                </span>
              </div>
            )}
          </div>

          {/* Date & Time Picker Group */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Schedule & Time Window</span>
              <TimezoneBadge variant="pill" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Date Input */}
              <div className="sm:col-span-1">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Reservation Date
                </label>
                <div className="relative">
                  <input
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer"
                  />
                </div>
              </div>

              {/* Start Time Select */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Start Time
                </label>
                <select
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer"
                >
                  {TIME_OPTIONS.filter((t) => t !== '20:00').map((t) => (
                    <option key={t} value={t}>
                      {formatTimeString(t)}
                    </option>
                  ))}
                </select>
              </div>

              {/* End Time Select */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  End Time
                </label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer"
                >
                  {TIME_OPTIONS.filter((t) => t !== '08:00').map((t) => (
                    <option key={t} value={t}>
                      {formatTimeString(t)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Duration Pills & Duration Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-zinc-400 font-medium mr-1">Quick Duration:</span>
                {[30, 60, 90, 120, 180].map((mins) => {
                  const label = mins < 60 ? `${mins}m` : `${mins / 60}h`;
                  return (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => handleQuickDuration(mins)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        durationMinutes === mins
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      +{label}
                    </button>
                  );
                })}
              </div>

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                <Timer className="w-3 h-3 text-zinc-400" />
                <span>{durationLabel}</span>
              </div>
            </div>
          </div>

          {/* Mini Timeline of Selected Day */}
          {daySlots.length > 0 && (
            <div className="p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                <span>Daily Timeline (08:00 AM – 08:00 PM)</span>
                <span className="font-mono">
                  Proposed: {formatTimeString(startTime)} – {formatTimeString(endTime)}
                </span>
              </div>

              {/* 24 Half-Hour Segment Bar */}
              <div className="h-5 w-full rounded-lg overflow-hidden flex bg-zinc-200 dark:bg-zinc-700 gap-[1px]">
                {daySlots.map((slot, index) => {
                  const slotStartMs = new Date(slot.startTime).getTime();
                  const slotEndMs = new Date(slot.endTime).getTime();

                  const reqStartMs = startDateTime.getTime();
                  const reqEndMs = endDateTime.getTime();

                  const isRequested = slotStartMs < reqEndMs && slotEndMs > reqStartMs;
                  const isBuffer = slot.isBufferPeriod;
                  const isReserved = !slot.available && !isBuffer;

                  let cellClass = 'bg-white dark:bg-zinc-800'; // available
                  if (slot.isPast) cellClass = 'bg-zinc-300 dark:bg-zinc-600 opacity-60';
                  if (isReserved) cellClass = 'bg-teal-600';
                  if (isBuffer) cellClass = 'bg-purple-500';

                  if (isRequested) {
                    if (isReserved || isBuffer) {
                      cellClass = 'bg-rose-500 animate-pulse'; // visual collision!
                    } else {
                      cellClass = 'bg-emerald-500 font-bold';
                    }
                  }

                  return (
                    <div
                      key={index}
                      title={`${slot.formattedTime} - ${slot.reason || (isRequested ? 'Your Selected Window' : 'Available')}`}
                      className={`flex-1 transition-colors ${cellClass}`}
                    />
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                <span>08:00 AM</span>
                <span>02:00 PM</span>
                <span>08:00 PM</span>
              </div>
            </div>
          )}

          {/* Real-time Conflict Validation & Approval Banner */}
          <div>
            {isCheckingConflict ? (
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center gap-2 text-xs text-zinc-500">
                <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                <span>Checking atomic slot availability...</span>
              </div>
            ) : conflictResult?.hasConflict ? (
              <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800/80 bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 flex items-start gap-2.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Scheduling Conflict Detected</strong>
                  <span className="mt-0.5 block leading-relaxed opacity-95">
                    {conflictResult.message}
                  </span>
                </div>
              </div>
            ) : conflictResult?.canBook ? (
              <div
                className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                  activeResource?.requiresApproval
                    ? 'border-purple-200 dark:border-purple-800/80 bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                    : 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {activeResource?.requiresApproval ? (
                  <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <strong className="block font-bold">
                    {activeResource?.requiresApproval
                      ? 'Slot Available • Approval Required'
                      : 'Slot Clear • Instant Confirmation'}
                  </strong>
                  <span className="mt-0.5 block leading-relaxed opacity-90">
                    {activeResource?.requiresApproval
                      ? 'No conflicts found. Because this asset requires governance, your booking will be queued for Administrator review.'
                      : 'No overlapping reservations or maintenance windows found. Your reservation will be immediately confirmed.'}
                  </span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Meeting Details Inputs */}
          <div className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Reservation Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Q4 Executive Product Strategy Session"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Purpose / Meeting Agenda (Optional)
              </label>
              <textarea
                rows={2}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="Brief agenda notes, attendee count, or special equipment setup instructions..."
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none shadow-xs"
              />
            </div>

            {/* Active User Attribution */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-[10px] flex items-center justify-center">
                  {currentUser.name.charAt(0)}
                </div>
                <span>
                  Reserving as <strong className="text-zinc-800 dark:text-zinc-200">{currentUser.name}</strong> ({currentUser.department})
                </span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {role}
              </span>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!isFormValid || isSubmitting || isCheckingConflict}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              <span>
                {activeResource?.requiresApproval
                  ? 'Submit for Admin Approval'
                  : 'Confirm Reservation'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
