'use client';

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Search,
  X,
  Plus,
  ArrowRight,
  ExternalLink,
  Bookmark,
  Layers,
  Calendar,
  Building2,
  Laptop,
  Cpu,
  Car,
  Check,
  AlertCircle,
  Trash2,
  ChevronRight,
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';
import { getUserReservations, cancelReservation } from '@/actions/reservations';
import { ResourceData, getCategoryIcon } from '../resources/ResourceCard';
import { BookingModal } from '../booking/BookingModal';
import { TimezoneBadge } from '../common/TimezoneBadge';
import { formatLocalDateTimeRange } from '@/lib/date-utils';

interface ReservationItem {
  id: string;
  resourceId: string;
  userId: string;
  title: string;
  purpose?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  rejectionReason?: string | null;
  createdAt: Date | string;
  resource: {
    id: string;
    name: string;
    code: string;
    location: string;
    imageUrl?: string | null;
    bufferMinutes: number;
    requiresApproval: boolean;
    category: {
      name: string;
      iconName?: string;
    };
  };
}

interface MyReservationsViewProps {
  resources: ResourceData[];
}

type TabType = 'UPCOMING' | 'PENDING' | 'PAST' | 'CANCELLED';

export function MyReservationsView({ resources }: MyReservationsViewProps) {
  const { currentUser, role } = useUserRole();
  const { showToast } = useNotification();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<TabType>('UPCOMING');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Reservation lists
  const [allReservations, setAllReservations] = useState<ReservationItem[]>([]);
  const [upcomingList, setUpcomingList] = useState<ReservationItem[]>([]);
  const [pendingList, setPendingList] = useState<ReservationItem[]>([]);
  const [pastList, setPastList] = useState<ReservationItem[]>([]);
  const [cancelledList, setCancelledList] = useState<ReservationItem[]>([]);

  // Cancellation Modal State
  const [cancellingItem, setCancellingItem] = useState<ReservationItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Rebooking Modal State
  const [rebookResourceId, setRebookResourceId] = useState<string | null>(null);

  // Fetch reservations for current user
  const loadReservations = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getUserReservations(currentUser.id);
      if (res.success) {
        setAllReservations(res.all as unknown as ReservationItem[]);
        setUpcomingList(res.upcoming as unknown as ReservationItem[]);
        setPendingList(res.pending as unknown as ReservationItem[]);
        setPastList(res.past as unknown as ReservationItem[]);
        setCancelledList(res.cancelled as unknown as ReservationItem[]);
      } else {
        showToast({
          type: 'error',
          title: 'Error Loading Reservations',
          message: res.error || 'Failed to fetch user reservations.',
        });
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id, showToast]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  // Handle one-click cancellation submission
  const handleConfirmCancel = async () => {
    if (!cancellingItem) return;

    setIsCancelling(true);
    try {
      const res = await cancelReservation(
        cancellingItem.id,
        currentUser.id,
        cancelReason.trim() || undefined
      );

      if (res.success) {
        showToast({
          type: 'info',
          title: 'Reservation Cancelled',
          message: `Your reservation for "${cancellingItem.resource.name}" has been cancelled.`,
        });
        setCancellingItem(null);
        setCancelReason('');
        // Reload data
        loadReservations();
      } else {
        showToast({
          type: 'error',
          title: 'Cancellation Failed',
          message: res.error || 'Failed to cancel the reservation.',
        });
      }
    } catch (err) {
      console.error('Failed to cancel reservation:', err);
      showToast({
        type: 'error',
        title: 'System Error',
        message: 'An unexpected error occurred while cancelling.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  // Get active list based on selected tab
  const currentList = useMemo(() => {
    let list: ReservationItem[] = [];
    switch (activeTab) {
      case 'UPCOMING':
        list = upcomingList;
        break;
      case 'PENDING':
        list = pendingList;
        break;
      case 'PAST':
        list = pastList;
        break;
      case 'CANCELLED':
        list = cancelledList;
        break;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.resource.name.toLowerCase().includes(q) ||
        item.resource.code.toLowerCase().includes(q) ||
        item.resource.location.toLowerCase().includes(q) ||
        (item.purpose && item.purpose.toLowerCase().includes(q))
    );
  }, [activeTab, upcomingList, pendingList, pastList, cancelledList, searchQuery]);

  // Format date helper using standardized local timezone formatter
  const formatDateTimeRange = (start: Date | string, end: Date | string) => {
    return formatLocalDateTimeRange(start, end);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Header & Active User Indicator */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
            <Bookmark className="w-4 h-4" />
            <span>Member Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            My Reservations
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Review scheduled appointments, check administrative approvals, and manage your asset allocations.
          </p>
        </div>

        {/* User Context & Role Indicator */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 text-xs">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-white">
                {currentUser.name}
              </span>
              <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                {role}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {currentUser.email} • {currentUser.department}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-3 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {/* Upcoming Tab */}
          <button
            onClick={() => setActiveTab('UPCOMING')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'UPCOMING'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Upcoming</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'UPCOMING'
                  ? 'bg-emerald-700 text-emerald-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {upcomingList.length}
            </span>
          </button>

          {/* Pending Approval Tab */}
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'PENDING'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Pending Approval</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'PENDING'
                  ? 'bg-amber-700 text-amber-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {pendingList.length}
            </span>
          </button>

          {/* Past Tab */}
          <button
            onClick={() => setActiveTab('PAST')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'PAST'
                ? 'bg-zinc-800 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Past</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'PAST'
                  ? 'bg-zinc-700 dark:bg-zinc-200 text-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {pastList.length}
            </span>
          </button>

          {/* Cancelled / Rejected Tab */}
          <button
            onClick={() => setActiveTab('CANCELLED')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeTab === 'CANCELLED'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <span>Cancelled & Rejected</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'CANCELLED'
                  ? 'bg-rose-700 text-rose-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}
            >
              {cancelledList.length}
            </span>
          </button>
        </div>

        {/* Search Input Filter & Timezone Badge */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter reservations..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <TimezoneBadge variant="pill" />
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="py-24 text-center rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="inline-block animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mb-3" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Loading reservations...
          </p>
        </div>
      ) : currentList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {currentList.map((item) => {
            const { dateStr, timeStr, durationLabel } = formatDateTimeRange(
              item.startTime,
              item.endTime
            );

            const isUpcoming = activeTab === 'UPCOMING';
            const isPendingTab = activeTab === 'PENDING';
            const isCancelled = item.status === 'CANCELLED';
            const isRejected = item.status === 'REJECTED';

            return (
              <div
                key={item.id}
                className="group p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Card Header: Category, Code, and Status Badge */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        {getCategoryIcon(item.resource.category.iconName || 'Building2')}
                        <span>{item.resource.category.name}</span>
                      </span>

                      <span className="px-2 py-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-[10px] font-mono font-bold">
                        {item.resource.code}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {item.status === 'CONFIRMED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>Confirmed</span>
                        </span>
                      )}

                      {item.status === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-xs font-semibold">
                          <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>Pending Approval</span>
                        </span>
                      )}

                      {isCancelled && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 text-xs font-medium">
                          <span>Cancelled</span>
                        </span>
                      )}

                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 text-xs font-semibold">
                          <X className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                          <span>Rejected</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title and Purpose */}
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-snug">
                    {item.title}
                  </h3>

                  {item.purpose && (
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.purpose}
                    </p>
                  )}

                  {/* Resource Name & Location Specs */}
                  <div className="mt-3.5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-zinc-600 dark:text-zinc-300">
                    <Link
                      href={`/resources/${item.resource.id}`}
                      className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                    >
                      <span>{item.resource.name}</span>
                      <ChevronRight className="w-3 h-3" />
                    </Link>

                    <div className="flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{item.resource.location}</span>
                    </div>
                  </div>

                  {/* Time & Duration Specs Box */}
                  <div className="mt-3.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 font-medium text-zinc-800 dark:text-zinc-200">
                      <CalendarDays className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>{dateStr}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="font-mono">{timeStr}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-zinc-600 dark:text-zinc-400 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded text-[11px]">
                        {durationLabel}
                      </span>

                      {item.resource.bufferMinutes > 0 && (
                        <span
                          title={`Includes a ${item.resource.bufferMinutes}-minute cleaning buffer`}
                          className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 px-2 py-0.5 rounded"
                        >
                          +{item.resource.bufferMinutes}m buffer
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Rejection / Cancellation Reason Note */}
                  {item.rejectionReason && (
                    <div className="mt-3 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <strong>Reason:</strong> {item.rejectionReason}
                      </div>
                    </div>
                  )}

                  {/* Pending Approval Notice */}
                  {isPendingTab && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        This booking is currently in the Administrator Review queue. You will receive
                        confirmation once approved.
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions Footer */}
                <div className="pt-3.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/schedule?resourceId=${item.resource.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Timeline</span>
                    </Link>

                    <Link
                      href={`/resources/${item.resource.id}`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Specs</span>
                    </Link>
                  </div>

                  {/* One-Click Cancel Button for Upcoming & Pending */}
                  {(isUpcoming || isPendingTab) && (
                    <button
                      onClick={() => setCancellingItem(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-all cursor-pointer active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Cancel Booking</span>
                    </button>
                  )}

                  {/* Rebook Button for Past & Cancelled */}
                  {(activeTab === 'PAST' || activeTab === 'CANCELLED') && (
                    <button
                      onClick={() => setRebookResourceId(item.resource.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Book Again</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-8 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto">
            <Bookmark className="w-6 h-6" />
          </div>

          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              {activeTab === 'UPCOMING' && 'No Upcoming Reservations'}
              {activeTab === 'PENDING' && 'No Pending Approval Requests'}
              {activeTab === 'PAST' && 'No Past Reservations Recorded'}
              {activeTab === 'CANCELLED' && 'No Cancelled Reservations'}
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              {activeTab === 'UPCOMING' &&
                'You do not have any upcoming bookings scheduled. Explore available meeting rooms and assets to reserve a slot.'}
              {activeTab === 'PENDING' &&
                'All your reservation requests have been processed or you have not submitted bookings requiring approval.'}
              {activeTab === 'PAST' &&
                'Your completed reservation history will appear here once past bookings conclude.'}
              {activeTab === 'CANCELLED' &&
                'No cancelled or rejected booking records found for your account.'}
            </p>
          </div>

          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Explore Resource Catalog</span>
            </Link>
          </div>
        </div>
      )}

      {/* ================= ONE-CLICK CANCELLATION CONFIRMATION MODAL ================= */}
      {cancellingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Cancel Reservation
                </h3>
              </div>
              <button
                onClick={() => setCancellingItem(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                Are you sure you want to cancel your reservation for{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {cancellingItem.title}
                </strong>{' '}
                in{' '}
                <strong className="text-zinc-900 dark:text-white">
                  {cancellingItem.resource.name}
                </strong>
                ?
              </p>

              {/* Reservation summary box */}
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 text-xs space-y-1">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {cancellingItem.resource.code} • {cancellingItem.resource.location}
                </div>
                <div className="text-zinc-500 dark:text-zinc-400 font-mono">
                  {new Date(cancellingItem.startTime).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}{' '}
                  –{' '}
                  {new Date(cancellingItem.endTime).toLocaleTimeString('en-US', {
                    timeStyle: 'short',
                  })}
                </div>
              </div>

              {/* Optional Reason Input */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Cancellation Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Meeting postponed, agenda completed early"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 shadow-xs"
                />
              </div>

              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs">
                This action will immediately release the time slot and turnaround buffer back into the public catalog.
              </div>
            </div>

            <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setCancellingItem(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Keep Reservation
              </button>

              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancel}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-rose-600/20 active:scale-95 transition-all cursor-pointer"
              >
                {isCancelling ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REBOOK SMART BOOKING MODAL ================= */}
      {rebookResourceId && (
        <BookingModal
          isOpen={!!rebookResourceId}
          onClose={() => setRebookResourceId(null)}
          resources={resources}
          initialResourceId={rebookResourceId}
          onSuccess={loadReservations}
        />
      )}
    </div>
  );
}
