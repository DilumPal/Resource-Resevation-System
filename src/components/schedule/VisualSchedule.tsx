'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Users,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Info,
  CalendarDays,
  X,
  ExternalLink,
  Plus,
  Layers,
  ArrowRight,
  Check,
} from 'lucide-react';
import {
  getAvailableSlots,
  getScheduleReservations,
  createReservation,
  TimeSlot,
} from '@/actions/reservations';
import { ResourceData, getCategoryIcon, getLiveStatus } from '../resources/ResourceCard';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';

interface VisualScheduleProps {
  resources: ResourceData[];
  initialResourceId?: string;
  initialDate?: string; // YYYY-MM-DD
  initialView?: 'day' | 'week';
  hideResourceSelector?: boolean;
}

interface ReservationBlock {
  id: string;
  title: string;
  purpose?: string | null;
  startTime: string;
  endTime: string;
  status: string;
  user?: {
    id?: string;
    name: string;
    email?: string;
    department?: string | null;
  } | null;
  resource?: {
    id: string;
    name: string;
    code: string;
  };
}

interface MaintenanceBlock {
  id: string;
  reason: string;
  startTime: string;
  endTime: string | null;
}

export function VisualSchedule({
  resources,
  initialResourceId,
  initialDate,
  initialView = 'day',
  hideResourceSelector = false,
}: VisualScheduleProps) {
  const { currentUser } = useUserRole();
  const { showToast } = useNotification();
  const [isPending, startTransition] = useTransition();

  // Selected Resource
  const [selectedResourceId, setSelectedResourceId] = useState<string>(() => {
    if (initialResourceId && resources.some((r) => r.id === initialResourceId)) {
      return initialResourceId;
    }
    return resources[0]?.id || '';
  });

  // Current view: 'day' | 'week'
  const [view, setView] = useState<'day' | 'week'>(initialView);

  // Selected date state (defaults to today or initialDate)
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    if (initialDate) {
      const d = new Date(initialDate);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  // Schedule data
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [weekReservations, setWeekReservations] = useState<ReservationBlock[]>([]);
  const [weekMaintenance, setWeekMaintenance] = useState<MaintenanceBlock[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals & Selected Slot
  const [viewingReservation, setViewingReservation] = useState<ReservationBlock | null>(null);
  const [bookingSlot, setBookingSlot] = useState<{
    startTime: string;
    endTime: string;
    formattedTime: string;
  } | null>(null);

  // Booking Form Fields
  const [bookingTitle, setBookingTitle] = useState('');
  const [bookingPurpose, setBookingPurpose] = useState('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  // Active Resource object
  const activeResource = useMemo(() => {
    return resources.find((r) => r.id === selectedResourceId) || resources[0];
  }, [resources, selectedResourceId]);

  // Format date helper: YYYY-MM-DD
  const formatDateKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Week boundary calculation (Monday to Sunday)
  const weekDays = useMemo(() => {
    const curr = new Date(currentDate);
    const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
    // Adjust so week starts on Monday
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentDate]);

  // Load schedule data whenever resource, date, or view changes
  const loadScheduleData = React.useCallback(async () => {
    if (!selectedResourceId) return;
    setIsLoading(true);

    try {
      if (view === 'day') {
        const dateKey = formatDateKey(currentDate);
        const res = await getAvailableSlots(selectedResourceId, dateKey);
        if (res.success) {
          setSlots(res.slots);
        } else {
          showToast({
            type: 'error',
            title: 'Schedule Load Error',
            message: res.error || 'Failed to fetch day schedule.',
          });
        }
      } else {
        // Week View: load reservations for the full 7-day span
        const startDay = weekDays[0];
        const endDay = new Date(weekDays[6]);
        endDay.setHours(23, 59, 59, 999);

        const res = await getScheduleReservations(
          startDay.toISOString(),
          endDay.toISOString(),
          selectedResourceId
        );

        if (res.success) {
          setWeekReservations(res.reservations as unknown as ReservationBlock[]);
          setWeekMaintenance(res.maintenanceLogs as unknown as MaintenanceBlock[]);
        } else {
          showToast({
            type: 'error',
            title: 'Schedule Load Error',
            message: res.error || 'Failed to fetch week schedule.',
          });
        }
      }
    } catch (err) {
      console.error('Error loading schedule:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedResourceId, view, currentDate, weekDays, showToast]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (view === 'day') {
      next.setDate(next.getDate() - 1);
    } else {
      next.setDate(next.getDate() - 7);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'day') {
      next.setDate(next.getDate() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Submit new booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingSlot || !activeResource) return;

    if (!bookingTitle.trim()) {
      showToast({
        type: 'warning',
        title: 'Title Required',
        message: 'Please provide a descriptive reservation title.',
      });
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const res = await createReservation({
        resourceId: activeResource.id,
        userId: currentUser.id,
        title: bookingTitle.trim(),
        purpose: bookingPurpose.trim() || undefined,
        startTime: bookingSlot.startTime,
        endTime: bookingSlot.endTime,
      });

      if (res.success) {
        showToast({
          type: 'success',
          title: res.requiresApproval ? 'Approval Requested' : 'Reservation Confirmed',
          message: res.message || 'Your reservation has been booked successfully.',
        });
        setBookingSlot(null);
        setBookingTitle('');
        setBookingPurpose('');
        // Reload schedule
        loadScheduleData();
      } else {
        showToast({
          type: 'error',
          title: 'Booking Conflict',
          message: res.error || 'The requested slot could not be booked.',
        });
      }
    } catch (err) {
      console.error('Failed to create reservation:', err);
      showToast({
        type: 'error',
        title: 'System Error',
        message: 'An unexpected error occurred while confirming reservation.',
      });
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Date formatted strings
  const formattedHeaderDate = useMemo(() => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } else {
      const first = weekDays[0];
      const last = weekDays[6];
      const sameMonth = first.getMonth() === last.getMonth();
      if (sameMonth) {
        return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
      }
      return `${first.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${last.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  }, [view, currentDate, weekDays]);

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const liveStatus = activeResource ? getLiveStatus(activeResource) : null;

  return (
    <div className="w-full space-y-6">
      {/* Top Header & Resource Selection Bar */}
      {!hideResourceSelector && (
        <div className="p-4 sm:p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="resource-select" className="sr-only">
                Select Resource
              </label>
              <select
                id="resource-select"
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
                className="w-full appearance-none bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 rounded-xl px-4 py-2.5 pr-10 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer transition-all shadow-xs"
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.code}] {r.name} ({r.category.name})
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            {/* Quick Specs Pill Box */}
            {activeResource && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-medium">
                  <MapPin className="w-3 h-3 text-zinc-400" />
                  {activeResource.location}
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 font-medium">
                  <Users className="w-3 h-3 text-zinc-400" />
                  {activeResource.capacity === 1 ? '1 Person' : `Max ${activeResource.capacity}`}
                </span>

                {activeResource.bufferMinutes > 0 && (
                  <span
                    title="Cleaning buffer automatically enforced between bookings"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/50 font-medium"
                  >
                    <Clock className="w-3 h-3" />
                    {activeResource.bufferMinutes}m buffer
                  </span>
                )}

                {activeResource.requiresApproval && (
                  <span
                    title="Admin approval required prior to confirmation"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/50 font-medium"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    Approval Required
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Link to Dedicated Detail Page */}
          {activeResource && (
            <Link
              href={`/resources/${activeResource.id}`}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 transition-colors"
            >
              <span>View Full Specs</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Date Navigator & View Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        {/* Date Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 p-0.5 shadow-xs">
            <button
              onClick={handlePrev}
              title={view === 'day' ? 'Previous day' : 'Previous week'}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors rounded-lg cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              title={view === 'day' ? 'Next day' : 'Next week'}
              className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pl-2">
            <CalendarIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              {formattedHeaderDate}
            </span>
          </div>
        </div>

        {/* View Switcher: Day vs Week */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Quick Date Jump Input */}
          <input
            type="date"
            value={formatDateKey(currentDate)}
            onChange={(e) => {
              if (e.target.value) {
                const picked = new Date(e.target.value + 'T00:00:00');
                if (!isNaN(picked.getTime())) setCurrentDate(picked);
              }
            }}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-xs"
          />

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-xl p-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80">
            <button
              onClick={() => setView('day')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                view === 'day'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                view === 'week'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              Week View
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Legend Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200/60 dark:border-zinc-800/60 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-emerald-500/20 border border-emerald-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Open Slot (Click to Book)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-teal-600 text-white" />
            <span className="text-zinc-600 dark:text-zinc-400">Confirmed Reservation</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500 text-white" />
            <span className="text-zinc-600 dark:text-zinc-400">Pending Approval</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-purple-500/30 border border-purple-500 text-purple-700" />
            <span className="text-zinc-600 dark:text-zinc-400">Cleaning Buffer</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-rose-500 text-white" />
            <span className="text-zinc-600 dark:text-zinc-400">Maintenance Window</span>
          </div>
        </div>

        {liveStatus && (
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 dark:text-zinc-400">Current Status:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${liveStatus.badgeClass}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${liveStatus.dotClass}`} />
              {liveStatus.label}
            </span>
          </div>
        )}
      </div>

      {/* Main Schedule Visual Grid */}
      {isLoading ? (
        <div className="py-24 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Loading schedule timeline...
          </p>
        </div>
      ) : view === 'day' ? (
        /* ================= DAY VIEW ================= */
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Daily Operating Schedule (08:00 AM – 08:00 PM)</span>
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              30-Minute Allocation Blocks
            </span>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {slots.map((slot, idx) => {
              const isAvailable = slot.available;
              const isPast = slot.isPast;
              const isBuffer = slot.isBufferPeriod;
              const isReserved = !isAvailable && slot.reservationTitle && !isBuffer;
              const isMaintenance =
                !isAvailable && slot.reason && slot.reason.startsWith('Maintenance');

              return (
                <div
                  key={idx}
                  className={`group px-4 sm:px-6 py-3 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isReserved
                      ? 'bg-teal-50/50 dark:bg-teal-950/20 hover:bg-teal-50 dark:hover:bg-teal-950/30'
                      : isBuffer
                      ? 'bg-purple-50/40 dark:bg-purple-950/10'
                      : isMaintenance
                      ? 'bg-rose-50/40 dark:bg-rose-950/20'
                      : isPast
                      ? 'bg-zinc-50/60 dark:bg-zinc-900/40 opacity-60'
                      : 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  {/* Left: Time Label */}
                  <div className="flex items-center gap-3 shrink-0 sm:w-48">
                    <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-200">
                      {slot.formattedTime}
                    </span>
                    {isPast && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                        Past
                      </span>
                    )}
                  </div>

                  {/* Middle: Status & Content Card */}
                  <div className="flex-1">
                    {isReserved && (
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {slot.reservationTitle}
                          </p>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Reserved Booking
                          </p>
                        </div>
                      </div>
                    )}

                    {isBuffer && (
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-purple-900 dark:text-purple-300">
                            {slot.reservationTitle || 'Turnaround Buffer'}
                          </p>
                          <p className="text-[11px] text-purple-700/80 dark:text-purple-400">
                            Sanitization, inspection & turnaround transition
                          </p>
                        </div>
                      </div>
                    )}

                    {isMaintenance && (
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-rose-900 dark:text-rose-300">
                            {slot.reason}
                          </p>
                          <p className="text-[11px] text-rose-600/80 dark:text-rose-400">
                            Out of operational service
                          </p>
                        </div>
                      </div>
                    )}

                    {isAvailable && !isPast && (
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span className="text-xs font-medium">Available for booking</span>
                      </div>
                    )}

                    {isPast && !isReserved && !isBuffer && !isMaintenance && (
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        Unavailable (Expired time slot)
                      </span>
                    )}
                  </div>

                  {/* Right: Action CTA */}
                  <div className="shrink-0 flex items-center justify-end">
                    {isAvailable && !isPast && (
                      <button
                        onClick={() =>
                          setBookingSlot({
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                            formattedTime: slot.formattedTime,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs hover:shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Book Slot</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ================= WEEK VIEW ================= */
        <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-x-auto">
          <div className="min-w-[850px]">
            {/* Week Columns Header */}
            <div className="grid grid-cols-8 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50">
              {/* Time Column Header */}
              <div className="p-3 text-center text-xs font-bold text-zinc-400 border-r border-zinc-200/80 dark:border-zinc-800">
                Time
              </div>

              {/* 7 Day Column Headers */}
              {weekDays.map((d, index) => {
                const todayCol = isToday(d);
                return (
                  <div
                    key={index}
                    className={`p-3 text-center border-r border-zinc-200/80 dark:border-zinc-800 last:border-r-0 ${
                      todayCol
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/20 font-bold'
                        : ''
                    }`}
                  >
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div
                      className={`text-sm mt-0.5 font-bold ${
                        todayCol
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {d.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Week Hours Grid (8:00 to 20:00) */}
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {Array.from({ length: 12 }).map((_, hourIdx) => {
                const hour = 8 + hourIdx;
                const hourLabel =
                  hour === 12
                    ? '12:00 PM'
                    : hour > 12
                    ? `${hour - 12}:00 PM`
                    : `${hour}:00 AM`;

                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[58px]">
                    {/* Time Label */}
                    <div className="p-2 text-right pr-3 text-[11px] font-mono font-medium text-zinc-400 border-r border-zinc-200/60 dark:border-zinc-800">
                      {hourLabel}
                    </div>

                    {/* 7 Days Cells */}
                    {weekDays.map((dayDate, dayIdx) => {
                      const slotStart = new Date(dayDate);
                      slotStart.setHours(hour, 0, 0, 0);
                      const slotEnd = new Date(dayDate);
                      slotEnd.setHours(hour + 1, 0, 0, 0);

                      const now = new Date();
                      const isPast = slotStart.getTime() < now.getTime();

                      // Check if a reservation overlaps this hour
                      const matchingRes = weekReservations.find((res) => {
                        const rStart = new Date(res.startTime).getTime();
                        const rEnd = new Date(res.endTime).getTime();
                        return rStart < slotEnd.getTime() && rEnd > slotStart.getTime();
                      });

                      // Check if buffer overlaps this hour
                      const bufferMs = (activeResource?.bufferMinutes || 0) * 60 * 1000;
                      const matchingBuffer =
                        !matchingRes && bufferMs > 0
                          ? weekReservations.find((res) => {
                              const rEnd = new Date(res.endTime).getTime();
                              const bufEnd = rEnd + bufferMs;
                              return rEnd < slotEnd.getTime() && bufEnd > slotStart.getTime();
                            })
                          : null;

                      // Check if maintenance overlaps this hour
                      const matchingMaint = weekMaintenance.find((m) => {
                        const mStart = new Date(m.startTime).getTime();
                        const mEnd = m.endTime ? new Date(m.endTime).getTime() : Infinity;
                        return mStart < slotEnd.getTime() && mEnd > slotStart.getTime();
                      });

                      return (
                        <div
                          key={dayIdx}
                          className={`relative p-1 border-r border-zinc-200/60 dark:border-zinc-800 last:border-r-0 transition-colors ${
                            isToday(dayDate) ? 'bg-emerald-500/[0.02]' : ''
                          }`}
                        >
                          {matchingRes ? (
                            <button
                              onClick={() => setViewingReservation(matchingRes)}
                              className={`w-full h-full text-left p-1.5 rounded-lg text-white shadow-xs transition-transform hover:scale-[1.02] cursor-pointer ${
                                matchingRes.status === 'PENDING'
                                  ? 'bg-amber-600 hover:bg-amber-700'
                                  : 'bg-teal-600 hover:bg-teal-700'
                              }`}
                            >
                              <div className="text-[10px] font-bold line-clamp-1 leading-tight">
                                {matchingRes.title}
                              </div>
                              <div className="text-[9px] opacity-90 line-clamp-1">
                                {matchingRes.user?.name || 'Reserved'}
                              </div>
                            </button>
                          ) : matchingBuffer ? (
                            <div className="w-full h-full p-1.5 rounded-lg bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 text-purple-800 dark:text-purple-300 text-[10px] flex items-center justify-center font-medium">
                              <span>Buffer ({activeResource.bufferMinutes}m)</span>
                            </div>
                          ) : matchingMaint ? (
                            <div className="w-full h-full p-1.5 rounded-lg bg-rose-100 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 text-rose-800 dark:text-rose-300 text-[10px] flex items-center justify-center font-medium">
                              <span>Maintenance</span>
                            </div>
                          ) : !isPast ? (
                            <button
                              onClick={() => {
                                const formatHours = (d: Date) =>
                                  d.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true,
                                  });
                                setBookingSlot({
                                  startTime: slotStart.toISOString(),
                                  endTime: slotEnd.toISOString(),
                                  formattedTime: `${formatHours(slotStart)} - ${formatHours(slotEnd)}`,
                                });
                              }}
                              className="w-full h-full rounded-lg border border-transparent hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 flex items-center justify-center text-transparent hover:text-emerald-600 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <div className="w-full h-full bg-zinc-50/50 dark:bg-zinc-900/30" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= RESERVATION DETAIL POPUP MODAL ================= */}
      {viewingReservation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    viewingReservation.status === 'PENDING' ? 'bg-amber-500' : 'bg-teal-500'
                  }`}
                />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Reservation Details
                </h3>
              </div>
              <button
                onClick={() => setViewingReservation(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Meeting Title</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {viewingReservation.title}
                </p>
                {viewingReservation.purpose && (
                  <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {viewingReservation.purpose}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Booked By</span>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {viewingReservation.user?.name || 'Authorized Member'}
                  </p>
                  {viewingReservation.user?.department && (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {viewingReservation.user.department}
                    </p>
                  )}
                </div>

                <div>
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">Status</span>
                  <div className="mt-0.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
                        viewingReservation.status === 'CONFIRMED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}
                    >
                      {viewingReservation.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <span className="text-xs text-zinc-500 dark:text-zinc-400">Time Interval</span>
                <p className="text-xs font-mono font-medium text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {new Date(viewingReservation.startTime).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  –{' '}
                  {new Date(viewingReservation.endTime).toLocaleString('en-US', {
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                onClick={() => setViewingReservation(null)}
                className="px-4 py-2 rounded-xl bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-300 dark:hover:bg-zinc-600 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= FAST BOOKING MODAL ================= */}
      {bookingSlot && activeResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <form onSubmit={handleConfirmBooking}>
              <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Book {activeResource.name}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {activeResource.code} • {activeResource.location}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBookingSlot(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Selected Slot Notice */}
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-3">
                  <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      Selected Time Slot
                    </p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400 font-mono mt-0.5">
                      {bookingSlot.formattedTime} on{' '}
                      {new Date(bookingSlot.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    {activeResource.bufferMinutes > 0 && (
                      <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-1">
                        A {activeResource.bufferMinutes}-minute turnaround buffer will be added
                        automatically after your booking.
                      </p>
                    )}
                  </div>
                </div>

                {/* Form Fields */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Reservation Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bookingTitle}
                    onChange={(e) => setBookingTitle(e.target.value)}
                    placeholder="e.g. Q4 Executive Strategy Session"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                    Purpose / Agenda (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={bookingPurpose}
                    onChange={(e) => setBookingPurpose(e.target.value)}
                    placeholder="Notes for attendees, equipment requirements, or agenda points..."
                    className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>

                {/* User Identity Confirmation */}
                <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Booking as:</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {currentUser.name} ({currentUser.department})
                  </span>
                </div>
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setBookingSlot(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isSubmittingBooking ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>
                    {activeResource.requiresApproval
                      ? 'Submit for Approval'
                      : 'Confirm Reservation'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
