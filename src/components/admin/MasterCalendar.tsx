'use client';

import React, { useState, useMemo, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CalendarDays,
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
  X,
  ExternalLink,
  Plus,
  Layers,
  ArrowRight,
  Check,
  Search,
  Filter,
  Wrench,
  XCircle,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { ResourceStatus, ReservationStatus } from '@prisma/client';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';
import { updateReservationStatus, cancelReservation } from '@/actions/reservations';
import { toggleResourceMaintenance } from '@/actions/resources';
import { getCategoryIcon } from '../resources/ResourceCard';
import { BookingModal } from '../booking/BookingModal';
import { RejectReservationModal, RejectModalItem } from './RejectReservationModal';
import { TimezoneBadge } from '../common/TimezoneBadge';

// Operating hours window
const START_HOUR = 8;  // 08:00 AM
const END_HOUR = 20;   // 08:00 PM
const TOTAL_HOURS = END_HOUR - START_HOUR; // 12 hours
const TOTAL_MINUTES = TOTAL_HOURS * 60;   // 720 minutes

export interface CalendarResourceItem {
  id: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  description?: string;
  status: ResourceStatus;
  bufferMinutes: number;
  requiresApproval: boolean;
  imageUrl?: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    iconName?: string | null;
  };
  maintenanceLogs?: Array<{
    id: string;
    reason: string;
    startTime: Date | string;
    endTime: Date | string | null;
    status: string;
  }>;
}

export interface CalendarReservationItem {
  id: string;
  title: string;
  purpose?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: ReservationStatus | string;
  resourceId: string;
  rejectionReason?: string | null;
  resource: {
    id: string;
    name: string;
    code: string;
    location: string;
    bufferMinutes?: number;
    requiresApproval?: boolean;
    category?: {
      name: string;
      iconName?: string | null;
    } | null;
  };
  user: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
  };
}

export interface CalendarMaintenanceItem {
  id: string;
  reason: string;
  startTime: Date | string;
  endTime: Date | string | null;
  status: string;
  notes?: string | null;
  performedBy?: string | null;
  resourceId: string;
  resource: {
    id: string;
    name: string;
    code: string;
    location?: string;
  };
}

interface MasterCalendarProps {
  initialDate: string; // YYYY-MM-DD
  resources: CalendarResourceItem[];
  reservations: CalendarReservationItem[];
  maintenanceLogs: CalendarMaintenanceItem[];
  categories: Array<{ id: string; name: string; slug: string; iconName?: string | null }>;
  metrics: {
    totalResources: number;
    totalBookingsToday: number;
    confirmedBookings: number;
    pendingApprovals: number;
    inMaintenanceCount: number;
    utilizationRate: number;
  };
}

export function MasterCalendar({
  initialDate,
  resources,
  reservations: initialReservations,
  maintenanceLogs: initialMaintenance,
  categories,
  metrics: initialMetrics,
}: MasterCalendarProps) {
  const router = useRouter();
  const { currentUser, isAdmin } = useUserRole();
  const { showToast } = useNotification();
  const [isPending, startTransition] = useTransition();

  // Active Date State
  const [currentDateStr, setCurrentDateStr] = useState<string>(initialDate);
  const [reservationsList, setReservationsList] = useState<CalendarReservationItem[]>(initialReservations);
  const [maintenanceList, setMaintenanceList] = useState<CalendarMaintenanceItem[]>(initialMaintenance);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Inspector Modal State
  const [selectedReservation, setSelectedReservation] = useState<CalendarReservationItem | null>(null);
  const [selectedMaintenance, setSelectedMaintenance] = useState<CalendarMaintenanceItem | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  // Quick Action States
  const [isActionLoading, setIsActionLoading] = useState(false);

  // Rejection Modal State
  const [rejectItem, setRejectItem] = useState<RejectModalItem | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Booking Modal State (Empty slot click-to-book)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingTargetResource, setBookingTargetResource] = useState<CalendarResourceItem | null>(null);
  const [bookingInitialStartTime, setBookingInitialStartTime] = useState<string | undefined>(undefined);
  const [bookingInitialEndTime, setBookingInitialEndTime] = useState<string | undefined>(undefined);

  // Parse current date
  const parsedDate = useMemo(() => {
    const [y, m, d] = currentDateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [currentDateStr]);

  const formattedDateBanner = useMemo(() => {
    return parsedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }, [parsedDate]);

  // Date Navigation Handlers
  const handleShiftDate = (days: number) => {
    const nextDate = new Date(parsedDate);
    nextDate.setDate(nextDate.getDate() + days);
    const nextStr = nextDate.toISOString().split('T')[0];
    setCurrentDateStr(nextStr);
    router.push(`/admin/calendar?date=${nextStr}`);
  };

  const handleJumpToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setCurrentDateStr(todayStr);
    router.push(`/admin/calendar?date=${todayStr}`);
  };

  const handleDirectDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value) {
      setCurrentDateStr(e.target.value);
      router.push(`/admin/calendar?date=${e.target.value}`);
    }
  };

  // Filter resources
  const filteredResources = useMemo(() => {
    return resources.filter((res) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        res.name.toLowerCase().includes(q) ||
        res.code.toLowerCase().includes(q) ||
        res.location.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'ALL' || res.category.id === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || res.status === selectedStatus;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [resources, searchQuery, selectedCategory, selectedStatus]);

  // Time Slot Calculations helper
  const calculateBlockPosition = (startTimeStr: Date | string, endTimeStr: Date | string) => {
    const start = new Date(startTimeStr);
    const end = new Date(endTimeStr);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();

    const timelineStartMinutes = START_HOUR * 60;
    const timelineEndMinutes = END_HOUR * 60;

    // Clamp within operating horizon
    const effectiveStart = Math.max(timelineStartMinutes, Math.min(timelineEndMinutes, startMinutes));
    const effectiveEnd = Math.max(timelineStartMinutes, Math.min(timelineEndMinutes, endMinutes));

    if (effectiveEnd <= effectiveStart) return null;

    const leftPercent = ((effectiveStart - timelineStartMinutes) / TOTAL_MINUTES) * 100;
    const widthPercent = ((effectiveEnd - effectiveStart) / TOTAL_MINUTES) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${Math.max(1.5, widthPercent)}%`,
    };
  };

  // Turnaround buffer position helper
  const calculateBufferPosition = (
    endTimeStr: Date | string,
    bufferMinutes: number
  ) => {
    if (!bufferMinutes || bufferMinutes <= 0) return null;

    const end = new Date(endTimeStr);
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const bufferEndMinutes = endMinutes + bufferMinutes;

    const timelineStartMinutes = START_HOUR * 60;
    const timelineEndMinutes = END_HOUR * 60;

    const effectiveStart = Math.max(timelineStartMinutes, Math.min(timelineEndMinutes, endMinutes));
    const effectiveEnd = Math.max(timelineStartMinutes, Math.min(timelineEndMinutes, bufferEndMinutes));

    if (effectiveEnd <= effectiveStart) return null;

    const leftPercent = ((effectiveStart - timelineStartMinutes) / TOTAL_MINUTES) * 100;
    const widthPercent = ((effectiveEnd - effectiveStart) / TOTAL_MINUTES) * 100;

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // One-click approve handler from inspector or timeline
  const handleApproveReservation = async (reservationId: string) => {
    try {
      setIsActionLoading(true);
      const res = await updateReservationStatus(
        reservationId,
        ReservationStatus.CONFIRMED,
        undefined,
        currentUser.id
      );

      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Approval Failed',
          message: res.error || 'Could not approve reservation.',
        });
        return;
      }

      setReservationsList((prev) =>
        prev.map((r) =>
          r.id === reservationId ? { ...r, status: ReservationStatus.CONFIRMED } : r
        )
      );

      setIsInspectorOpen(false);
      showToast({
        type: 'success',
        title: 'Reservation Approved',
        message: 'The reservation status has been updated to Confirmed.',
      });

      router.refresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to approve reservation.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Cancel reservation handler
  const handleCancelReservation = async (reservationId: string) => {
    if (!confirm('Are you sure you want to cancel this reservation? The slot will be immediately freed for other bookings.')) {
      return;
    }

    try {
      setIsActionLoading(true);
      const res = await cancelReservation(
        reservationId,
        currentUser.id,
        'Cancelled by administrator via Master Calendar'
      );

      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Cancellation Failed',
          message: res.error || 'Could not cancel reservation.',
        });
        return;
      }

      setReservationsList((prev) => prev.filter((r) => r.id !== reservationId));
      setIsInspectorOpen(false);

      showToast({
        type: 'info',
        title: 'Reservation Cancelled',
        message: 'The slot has been released and is now available.',
      });

      router.refresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to cancel reservation.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Open Rejection Modal
  const handleOpenRejectModal = (r: CalendarReservationItem) => {
    setIsInspectorOpen(false);
    setRejectItem({
      id: r.id,
      title: r.title,
      purpose: r.purpose,
      startTime: r.startTime,
      endTime: r.endTime,
      resource: {
        id: r.resource.id,
        name: r.resource.name,
        code: r.resource.code,
        location: r.resource.location,
      },
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        department: r.user.department,
      },
    });
    setIsRejectModalOpen(true);
  };

  // Confirm Rejection handler
  const handleConfirmReject = async (reservationId: string, feedbackReason: string) => {
    const res = await updateReservationStatus(
      reservationId,
      ReservationStatus.REJECTED,
      feedbackReason,
      currentUser.id
    );

    if (!res.success) {
      throw new Error(res.error || 'Failed to reject reservation.');
    }

    setReservationsList((prev) => prev.filter((r) => r.id !== reservationId));

    showToast({
      type: 'info',
      title: 'Reservation Rejected',
      message: 'Decline recorded with administrative feedback.',
    });

    router.refresh();
  };

  // Restore resource from maintenance
  const handleRestoreOperational = async (resourceId: string, resourceName: string) => {
    try {
      setIsActionLoading(true);
      const res = await toggleResourceMaintenance(
        resourceId,
        ResourceStatus.AVAILABLE,
        undefined,
        currentUser.id
      );

      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Operation Failed',
          message: res.error || 'Could not restore resource status.',
        });
        return;
      }

      setMaintenanceList((prev) => prev.filter((m) => m.resourceId !== resourceId));
      setIsInspectorOpen(false);

      showToast({
        type: 'success',
        title: 'Resource Operational',
        message: `"${resourceName}" is restored to service and available for booking.`,
      });

      router.refresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to end maintenance.',
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle empty slot click to book
  const handleEmptySlotClick = (res: CalendarResourceItem, hour: number) => {
    if (res.status === ResourceStatus.RETIRED) {
      showToast({
        type: 'warning',
        title: 'Resource Retired',
        message: 'This resource is archived and cannot be booked.',
      });
      return;
    }

    const slotStart = new Date(parsedDate);
    slotStart.setHours(hour, 0, 0, 0);

    const slotEnd = new Date(parsedDate);
    slotEnd.setHours(hour + 1, 0, 0, 0);

    setBookingTargetResource(res);
    setBookingInitialStartTime(slotStart.toISOString());
    setBookingInitialEndTime(slotEnd.toISOString());
    setIsBookingModalOpen(true);
  };

  // Generate hourly scale labels (08:00 to 20:00)
  const hourHeaders = useMemo(() => {
    const hours = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      const displayHour = h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`;
      hours.push({ hour: h, display: displayHour });
    }
    return hours;
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar: Date Navigation & Actions */}
      <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <CalendarDays className="w-4 h-4" />
              <span>Cross-Resource Operations Timeline</span>
            </div>
            <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              Master Scheduling Matrix
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Comprehensive operational grid showing all meeting rooms, labs, workstations, and fleet assets across standard operating windows (08:00 - 20:00).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Admin Hub</span>
            </Link>

            <Link
              href="/schedule"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              <span>Single Asset Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Date Navigator & Quick Filters */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Date Picker Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700">
              <button
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={handleJumpToday}
                className="px-3 py-1 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                Today
              </button>

              <button
                onClick={() => handleShiftDate(1)}
                className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              <input
                type="date"
                value={currentDateStr}
                onChange={handleDirectDateChange}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
              />
            </div>

            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 px-1 hidden sm:inline-block">
              {formattedDateBanner}
            </span>
            <TimezoneBadge variant="pill" />
          </div>

          {/* Search & Category Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assets by name or code..."
                className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value={ResourceStatus.AVAILABLE}>Operational Only</option>
              <option value={ResourceStatus.MAINTENANCE}>In Maintenance</option>
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-[11px] pt-3 border-t border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-600 border border-emerald-700" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Confirmed Booking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-500 border border-amber-600" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Pending Review</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-800/80 border border-amber-900" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Maintenance Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-zinc-300 dark:bg-zinc-700 border border-zinc-400 dark:border-zinc-600" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Turnaround Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-white dark:bg-zinc-900 border border-dashed border-zinc-300 dark:border-zinc-700" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Available (Click to Book)</span>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Managed Inventory
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {filteredResources.length}
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">Assets Visible</span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Total Bookings Today
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {reservationsList.length}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              {initialMetrics.confirmedBookings} Confirmed
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Pending Approvals
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {initialMetrics.pendingApprovals}
            </span>
            <span className="text-[11px] text-zinc-400">
              {initialMetrics.pendingApprovals > 0 ? 'Requires Action' : 'All Clear'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xs">
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Operating Utilization
          </span>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {initialMetrics.utilizationRate}%
            </span>
            <span className="text-[11px] text-zinc-400">08:00 - 20:00 Cap</span>
          </div>
        </div>
      </div>

      {/* 3. Cross-Resource Gantt Timeline Grid */}
      <div className="rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[1000px]">
            {/* Timeline Header Row (Hours Scale) */}
            <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/50 sticky top-0 z-20">
              {/* Left Column Header (Resource Asset Info) */}
              <div className="w-72 shrink-0 p-3.5 border-r border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                <span>Facility / Hardware Asset</span>
                <span className="text-[10px] text-zinc-400 font-normal">
                  Showing {filteredResources.length}
                </span>
              </div>

              {/* Time Hour Scale (08:00 - 20:00) */}
              <div className="flex-1 flex">
                {hourHeaders.slice(0, -1).map((item) => (
                  <div
                    key={item.hour}
                    className="flex-1 p-3 text-center border-r border-zinc-200/60 dark:border-zinc-800 text-[11px] font-mono font-semibold text-zinc-600 dark:text-zinc-400"
                  >
                    <span>{item.display}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Timeline Rows per Resource */}
            <div className="divide-y divide-zinc-200/70 dark:divide-zinc-800/80">
              {filteredResources.length === 0 ? (
                <div className="p-12 text-center text-zinc-400">
                  <p className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                    No resources match filters
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Try adjusting your category, status, or search query.
                  </p>
                </div>
              ) : (
                filteredResources.map((res) => {
                  const isMaintenance = res.status === ResourceStatus.MAINTENANCE;
                  const isRetired = res.status === ResourceStatus.RETIRED;

                  // Get reservations on this date for this resource
                  const resourceReservations = reservationsList.filter(
                    (r) => r.resourceId === res.id
                  );

                  // Get maintenance logs for this resource
                  const resourceMaintenance = maintenanceList.filter(
                    (m) => m.resourceId === res.id
                  );

                  return (
                    <div
                      key={res.id}
                      className="flex hover:bg-zinc-50/40 dark:hover:bg-zinc-800/20 transition-colors group"
                    >
                      {/* Left Column: Asset Identity Card */}
                      <div className="w-72 shrink-0 p-3.5 border-r border-zinc-200/80 dark:border-zinc-800 flex flex-col justify-between space-y-2">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                                {getCategoryIcon(res.category.iconName || 'Building2')}
                              </div>
                              <Link
                                href={`/resources/${res.id}`}
                                className="font-bold text-xs text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors truncate"
                                title={res.name}
                              >
                                {res.name}
                              </Link>
                            </div>

                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 shrink-0">
                              {res.code}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-400">
                            <span className="truncate">{res.location}</span>
                            <span>•</span>
                            <span className="shrink-0">{res.capacity} cap</span>
                          </div>
                        </div>

                        {/* Status & Buffer tag */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
                          {isMaintenance ? (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                              Maintenance
                            </span>
                          ) : isRetired ? (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              Archived
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                              Operational
                            </span>
                          )}

                          {res.bufferMinutes > 0 ? (
                            <span className="text-zinc-400 font-mono">
                              {res.bufferMinutes}m buffer
                            </span>
                          ) : (
                            <span className="text-zinc-400">Instant</span>
                          )}
                        </div>
                      </div>

                      {/* Right Timeline Track */}
                      <div className="flex-1 relative h-24 flex items-center bg-zinc-50/20 dark:bg-zinc-900/40">
                        {/* Background Grid Columns for each hour */}
                        <div className="absolute inset-0 flex pointer-events-none">
                          {hourHeaders.slice(0, -1).map((item) => (
                            <div
                              key={item.hour}
                              className="flex-1 border-r border-zinc-200/40 dark:border-zinc-800/40 h-full flex"
                            >
                              {/* 30-min subtle divider */}
                              <div className="flex-1 border-r border-dashed border-zinc-200/20 dark:border-zinc-800/20 h-full" />
                              <div className="flex-1" />
                            </div>
                          ))}
                        </div>

                        {/* Interactive Clickable Hour Zones for Empty Slot Booking */}
                        <div className="absolute inset-0 flex">
                          {hourHeaders.slice(0, -1).map((item) => (
                            <button
                              key={item.hour}
                              onClick={() => handleEmptySlotClick(res, item.hour)}
                              className="flex-1 h-full hover:bg-emerald-500/5 transition-colors group/cell relative cursor-pointer focus:outline-none"
                              title={`Click to book ${res.name} at ${item.display}`}
                            >
                              <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center pointer-events-none">
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-white/90 dark:bg-zinc-900/90 px-1.5 py-0.5 rounded shadow-xs border border-emerald-200 dark:border-emerald-800">
                                  <Plus className="w-2.5 h-2.5" />
                                  <span>Book</span>
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>

                        {/* Confirmed & Pending Reservations Blocks */}
                        {resourceReservations.map((r) => {
                          const blockPos = calculateBlockPosition(r.startTime, r.endTime);
                          if (!blockPos) return null;

                          const isConfirmed = r.status === ReservationStatus.CONFIRMED;
                          const bufferPos = calculateBufferPosition(
                            r.endTime,
                            res.bufferMinutes
                          );

                          const startFormatted = new Date(r.startTime).toLocaleTimeString(
                            'en-US',
                            { hour: 'numeric', minute: '2-digit' }
                          );
                          const endFormatted = new Date(r.endTime).toLocaleTimeString(
                            'en-US',
                            { hour: 'numeric', minute: '2-digit' }
                          );

                          return (
                            <React.Fragment key={r.id}>
                              {/* Booking Block */}
                              <div
                                style={{ left: blockPos.left, width: blockPos.width }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedReservation(r);
                                  setSelectedMaintenance(null);
                                  setIsInspectorOpen(true);
                                }}
                                className={`absolute h-18 rounded-xl p-2.5 flex flex-col justify-between overflow-hidden shadow-sm transition-all cursor-pointer z-10 select-none group/block ${
                                  isConfirmed
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-emerald-900/20'
                                    : 'bg-amber-500 hover:bg-amber-600 text-zinc-950 border border-amber-400 shadow-amber-900/20 animate-pulse'
                                }`}
                                title={`${r.title} • ${startFormatted} - ${endFormatted} (${r.user.name})`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-bold text-[11px] truncate leading-tight">
                                      {r.title}
                                    </span>
                                    {!isConfirmed && (
                                      <span className="text-[9px] font-extrabold uppercase px-1 py-0.2 rounded bg-black/20 text-black shrink-0">
                                        Review
                                      </span>
                                    )}
                                  </div>
                                  <p
                                    className={`text-[10px] truncate ${
                                      isConfirmed ? 'text-emerald-100' : 'text-amber-950'
                                    }`}
                                  >
                                    {r.user.name} ({r.user.department || 'Member'})
                                  </p>
                                </div>

                                <div className="flex items-center justify-between text-[9px] font-mono font-medium pt-1 border-t border-black/10">
                                  <span>
                                    {startFormatted} - {endFormatted}
                                  </span>
                                </div>
                              </div>

                              {/* Turnaround Buffer Extension Block */}
                              {bufferPos && (
                                <div
                                  style={{
                                    left: bufferPos.left,
                                    width: bufferPos.width,
                                  }}
                                  className="absolute h-14 rounded-lg bg-zinc-200/90 dark:bg-zinc-800/90 border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[9px] font-mono text-zinc-600 dark:text-zinc-400 z-5 select-none pointer-events-none"
                                  title={`Turnaround buffer: ${res.bufferMinutes} minutes`}
                                >
                                  <span>{res.bufferMinutes}m buffer</span>
                                </div>
                              )}
                            </React.Fragment>
                          );
                        })}

                        {/* Active Maintenance Blocks */}
                        {resourceMaintenance.map((m) => {
                          const mStart = new Date(m.startTime);
                          const mEnd = m.endTime
                            ? new Date(m.endTime)
                            : new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), END_HOUR, 0, 0);

                          const blockPos = calculateBlockPosition(mStart, mEnd);
                          if (!blockPos) return null;

                          return (
                            <div
                              key={m.id}
                              style={{ left: blockPos.left, width: blockPos.width }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMaintenance(m);
                                setSelectedReservation(null);
                                setIsInspectorOpen(true);
                              }}
                              className="absolute h-18 rounded-xl p-2.5 bg-amber-900/90 text-amber-100 border border-amber-700 flex flex-col justify-between overflow-hidden shadow-sm transition-all cursor-pointer z-10 select-none hover:bg-amber-900"
                              title={`Maintenance: ${m.reason}`}
                            >
                              <div>
                                <div className="flex items-center gap-1 text-[11px] font-bold text-amber-200 truncate">
                                  <Wrench className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{m.reason}</span>
                                </div>
                                <p className="text-[10px] text-amber-300/80 truncate">
                                  Asset Out of Service
                                </p>
                              </div>
                              <span className="text-[9px] font-mono text-amber-200/70">
                                In Progress
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Block Inspector Modal (Details & Admin Controls) */}
      {isInspectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden transition-all transform animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                    selectedReservation
                      ? selectedReservation.status === ReservationStatus.CONFIRMED
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                      : 'bg-amber-950/60 border-amber-800 text-amber-400'
                  }`}
                >
                  {selectedReservation ? (
                    selectedReservation.status === ReservationStatus.CONFIRMED ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )
                  ) : (
                    <Wrench className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                    {selectedReservation
                      ? 'Reservation Details'
                      : 'Maintenance Outage Details'}
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {selectedReservation
                      ? selectedReservation.status === ReservationStatus.CONFIRMED
                        ? 'Confirmed booking on active calendar schedule'
                        : 'Awaiting administrator review and approval'
                      : 'Active service window blocking resource allocations'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsInspectorOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {selectedReservation && (
                <>
                  {/* Resource & Title Summary */}
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-zinc-900 dark:text-white">
                          {selectedReservation.resource.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                          {selectedReservation.resource.code}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400">
                        {selectedReservation.resource.location}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                      &quot;{selectedReservation.title}&quot;
                    </h3>

                    {selectedReservation.purpose && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-300 italic pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                        Purpose: &quot;{selectedReservation.purpose}&quot;
                      </p>
                    )}
                  </div>

                  {/* Requester Profile */}
                  <div className="flex items-center justify-between text-xs p-3 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                    <div>
                      <span className="font-bold text-zinc-900 dark:text-white block">
                        {selectedReservation.user.name}
                      </span>
                      <span className="text-zinc-400">{selectedReservation.user.email}</span>
                    </div>
                    {selectedReservation.user.department && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {selectedReservation.user.department}
                      </span>
                    )}
                  </div>

                  {/* Time Window */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-semibold">Start Time</span>
                      <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                        {new Date(selectedReservation.startTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-zinc-800">
                      <span className="text-[10px] text-zinc-400 block font-semibold">End Time</span>
                      <span className="font-bold text-zinc-900 dark:text-white mt-0.5 block">
                        {new Date(selectedReservation.endTime).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {selectedMaintenance && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-zinc-900 dark:text-white">
                        {selectedMaintenance.resource.name} ({selectedMaintenance.resource.code})
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200">
                        IN PROGRESS
                      </span>
                    </div>

                    <p className="text-xs text-zinc-800 dark:text-zinc-200 font-semibold">
                      Reason: {selectedMaintenance.reason}
                    </p>

                    {selectedMaintenance.notes && (
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic">
                        &quot;{selectedMaintenance.notes}&quot;
                      </p>
                    )}
                  </div>

                  <div className="text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
                    <p>
                      Started: {new Date(selectedMaintenance.startTime).toLocaleString('en-US')}
                    </p>
                    <p>
                      Estimated End:{' '}
                      {selectedMaintenance.endTime
                        ? new Date(selectedMaintenance.endTime).toLocaleString('en-US')
                        : 'Indefinite'}
                    </p>
                    {selectedMaintenance.performedBy && (
                      <p>Technician: {selectedMaintenance.performedBy}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3 bg-zinc-50/50 dark:bg-zinc-850/40">
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                {selectedReservation && selectedReservation.status === ReservationStatus.PENDING && (
                  <>
                    <button
                      onClick={() => handleOpenRejectModal(selectedReservation)}
                      disabled={isActionLoading}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject with Note</span>
                    </button>

                    <button
                      onClick={() => handleApproveReservation(selectedReservation.id)}
                      disabled={isActionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve Reservation</span>
                    </button>
                  </>
                )}

                {selectedReservation && selectedReservation.status === ReservationStatus.CONFIRMED && (
                  <button
                    onClick={() => handleCancelReservation(selectedReservation.id)}
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 text-xs font-bold transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel Reservation</span>
                  </button>
                )}

                {selectedMaintenance && (
                  <button
                    onClick={() =>
                      handleRestoreOperational(
                        selectedMaintenance.resourceId,
                        selectedMaintenance.resource.name
                      )
                    }
                    disabled={isActionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete &amp; Restore Resource</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Rejection Modal with Feedback Note */}
      <RejectReservationModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        reservation={rejectItem}
        onConfirmReject={handleConfirmReject}
      />

      {/* 6. Quick Booking Modal for Empty Slot Clicks */}
      {bookingTargetResource && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => {
            setIsBookingModalOpen(false);
            setBookingTargetResource(null);
          }}
          resources={resources as any}
          initialResourceId={bookingTargetResource.id}
          initialDate={currentDateStr}
          initialStartTime={bookingInitialStartTime}
          initialEndTime={bookingInitialEndTime}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
