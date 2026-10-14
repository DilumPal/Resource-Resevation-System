'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  Calendar,
  Users,
  MapPin,
  Search,
  X,
  FileText,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Check,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { ReservationStatus } from '@prisma/client';
import { useNotification } from '@/context/NotificationContext';
import { updateReservationStatus } from '@/actions/reservations';
import { RejectReservationModal, RejectModalItem } from './RejectReservationModal';
import { getCategoryIcon } from '../resources/ResourceCard';

export interface PendingReservationItem {
  id: string;
  title: string;
  purpose?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  status: string;
  rejectionReason?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  resource: {
    id: string;
    name: string;
    code: string;
    location: string;
    capacity?: number;
    bufferMinutes?: number;
    requiresApproval?: boolean;
    imageUrl?: string | null;
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
  conflictStatus?: {
    hasConflict: boolean;
    message?: string;
  };
}

interface ApprovalHubProps {
  initialPending: PendingReservationItem[];
  initialHistory?: PendingReservationItem[];
  adminUserId?: string;
  onQueueUpdate?: (pendingCount: number) => void;
}

export function ApprovalHub({
  initialPending,
  initialHistory = [],
  adminUserId,
  onQueueUpdate,
}: ApprovalHubProps) {
  const router = useRouter();
  const { showToast } = useNotification();

  const [pendingList, setPendingList] = useState<PendingReservationItem[]>(initialPending);
  const [historyList, setHistoryList] = useState<PendingReservationItem[]>(initialHistory);

  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Processing state for one-click approve
  const [approvingId, setApprovingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectItem, setRejectItem] = useState<RejectModalItem | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);

  // Extract available categories from current data
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    [...pendingList, ...historyList].forEach((item) => {
      if (item.resource.category?.name) {
        set.add(item.resource.category.name);
      }
    });
    return Array.from(set);
  }, [pendingList, historyList]);

  // Filtered lists
  const filteredPending = useMemo(() => {
    return pendingList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.resource.name.toLowerCase().includes(q) ||
        item.resource.code.toLowerCase().includes(q) ||
        item.user.name.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q) ||
        (item.user.department && item.user.department.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'ALL' || item.resource.category?.name === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [pendingList, searchQuery, selectedCategory]);

  const filteredHistory = useMemo(() => {
    return historyList.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.resource.name.toLowerCase().includes(q) ||
        item.resource.code.toLowerCase().includes(q) ||
        item.user.name.toLowerCase().includes(q) ||
        item.user.email.toLowerCase().includes(q) ||
        (item.user.department && item.user.department.toLowerCase().includes(q));

      const matchesCat =
        selectedCategory === 'ALL' || item.resource.category?.name === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [historyList, searchQuery, selectedCategory]);

  // Format date helper
  const formatSlotTime = (startStr: Date | string, endStr: Date | string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);

    const dateFormatted = start.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const timeRange = `${start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })} - ${end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    })}`;

    const diffHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const durationFormatted =
      diffHours < 1
        ? `${Math.round(diffHours * 60)}m`
        : Number.isInteger(diffHours)
        ? `${diffHours}h`
        : `${Math.floor(diffHours)}h ${Math.round((diffHours % 1) * 60)}m`;

    return { dateFormatted, timeRange, durationFormatted };
  };

  // One-click approve handler
  const handleApprove = async (item: PendingReservationItem) => {
    try {
      setApprovingId(item.id);

      const res = await updateReservationStatus(
        item.id,
        ReservationStatus.CONFIRMED,
        undefined,
        adminUserId
      );

      if (!res.success) {
        showToast({
          type: 'error',
          title: 'Approval Failed',
          message: res.error || 'Could not approve reservation.',
        });
        return;
      }

      // Optimistic update
      const updatedPending = pendingList.filter((p) => p.id !== item.id);
      setPendingList(updatedPending);

      const updatedHistoryItem: PendingReservationItem = {
        ...item,
        status: ReservationStatus.CONFIRMED,
        updatedAt: new Date(),
      };
      setHistoryList([updatedHistoryItem, ...historyList]);

      if (onQueueUpdate) {
        onQueueUpdate(updatedPending.length);
      }

      showToast({
        type: 'success',
        title: 'Reservation Approved',
        message: `Booking "${item.title}" for ${item.resource.name} is now confirmed.`,
      });

      router.refresh();
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to approve reservation.',
      });
    } finally {
      setApprovingId(null);
    }
  };

  // Open rejection modal
  const handleOpenRejectModal = (item: PendingReservationItem) => {
    setRejectItem({
      id: item.id,
      title: item.title,
      purpose: item.purpose,
      startTime: item.startTime,
      endTime: item.endTime,
      resource: {
        id: item.resource.id,
        name: item.resource.name,
        code: item.resource.code,
        location: item.resource.location,
      },
      user: {
        id: item.user.id,
        name: item.user.name,
        email: item.user.email,
        department: item.user.department,
      },
    });
    setIsRejectModalOpen(true);
  };

  // Confirm rejection handler
  const handleConfirmReject = async (reservationId: string, feedbackReason: string) => {
    const item = pendingList.find((p) => p.id === reservationId);
    if (!item) return;

    const res = await updateReservationStatus(
      reservationId,
      ReservationStatus.REJECTED,
      feedbackReason,
      adminUserId
    );

    if (!res.success) {
      throw new Error(res.error || 'Failed to reject reservation.');
    }

    // Optimistic update
    const updatedPending = pendingList.filter((p) => p.id !== reservationId);
    setPendingList(updatedPending);

    const updatedHistoryItem: PendingReservationItem = {
      ...item,
      status: ReservationStatus.REJECTED,
      rejectionReason: feedbackReason,
      updatedAt: new Date(),
    };
    setHistoryList([updatedHistoryItem, ...historyList]);

    if (onQueueUpdate) {
      onQueueUpdate(updatedPending.length);
    }

    showToast({
      type: 'info',
      title: 'Reservation Rejected',
      message: `Decline recorded for "${item.title}". Feedback has been saved for ${item.user.name}.`,
    });

    router.refresh();
  };

  return (
    <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Review Queue</span>
          </div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
            Approval Hub &amp; Request Review
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Review member reservation requests requiring administrator authorization, inspect conflict status, and approve or reject with feedback.
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${
              pendingList.length > 0
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
            }`}
          >
            {pendingList.length > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{pendingList.length} Pending Review</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Queue Clear</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Tab Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shrink-0">
          <button
            onClick={() => setActiveTab('PENDING')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'PENDING'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>Pending Requests</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                pendingList.length > 0
                  ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300'
                  : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
              }`}
            >
              {pendingList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'HISTORY'
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <span>Decision History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
              {historyList.length}
            </span>
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-lg justify-end">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by requester, title, or code..."
              className="w-full pl-9 pr-7 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
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

          {availableCategories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 cursor-pointer shrink-0"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: PENDING REQUESTS REVIEW */}
      {activeTab === 'PENDING' && (
        <div className="space-y-4">
          {filteredPending.length === 0 ? (
            <div className="p-10 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                Approval Queue is Clear
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
                {searchQuery || selectedCategory !== 'ALL'
                  ? 'No pending reservations match your active filter criteria.'
                  : 'All member requests requiring authorization have been reviewed. New bookings submitted for restricted assets will appear here immediately.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPending.map((item) => {
                const { dateFormatted, timeRange, durationFormatted } = formatSlotTime(
                  item.startTime,
                  item.endTime
                );
                const isProcessing = approvingId === item.id;
                const hasConflict = item.conflictStatus?.hasConflict;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 transition-all shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-5"
                  >
                    {/* Left & Middle Information */}
                    <div className="space-y-3 flex-1 min-w-0">
                      {/* Resource & Requester Meta */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
                            {getCategoryIcon(item.resource.category?.iconName || 'Building2')}
                          </div>
                          <Link
                            href={`/resources/${item.resource.id}`}
                            className="font-bold text-sm text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1 group"
                          >
                            <span>{item.resource.name}</span>
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </Link>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                            {item.resource.code}
                          </span>
                        </div>

                        <span className="text-zinc-300 dark:text-zinc-700">•</span>

                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <MapPin className="w-3 h-3" />
                          <span>{item.resource.location}</span>
                        </span>

                        {item.resource.bufferMinutes && item.resource.bufferMinutes > 0 ? (
                          <>
                            <span className="text-zinc-300 dark:text-zinc-700">•</span>
                            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
                              {item.resource.bufferMinutes}m turnaround buffer
                            </span>
                          </>
                        ) : null}
                      </div>

                      {/* Requester Identity & Submission Time */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {item.user.name}
                        </span>
                        <span className="text-zinc-400">({item.user.email})</span>
                        {item.user.department && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {item.user.department}
                          </span>
                        )}
                        {item.createdAt && (
                          <span className="text-[11px] text-zinc-400">
                            Submitted{' '}
                            {new Date(item.createdAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>

                      {/* Reservation Title & Purpose Quote */}
                      <div className="p-3 rounded-xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800 text-xs space-y-1">
                        <div className="font-bold text-zinc-900 dark:text-white">
                          &quot;{item.title}&quot;
                        </div>
                        {item.purpose ? (
                          <p className="text-[11px] text-zinc-600 dark:text-zinc-300 italic">
                            Purpose: &quot;{item.purpose}&quot;
                          </p>
                        ) : (
                          <p className="text-[11px] text-zinc-400 italic">
                            No additional purpose notes provided.
                          </p>
                        )}
                      </div>

                      {/* Timing & Real-time Conflict Assessment */}
                      <div className="flex flex-wrap items-center gap-3 pt-1">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{dateFormatted}</span>
                        </div>

                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium">
                          <Clock className="w-3.5 h-3.5 text-zinc-500" />
                          <span>
                            {timeRange} ({durationFormatted})
                          </span>
                        </div>

                        {/* Real-time Conflict Assessment Badge */}
                        {hasConflict ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-semibold">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>
                              {item.conflictStatus?.message || 'Scheduling Overlap Detected'}
                            </span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Conflict-Free • Ready for Approval</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2.5 self-end lg:self-center shrink-0 pt-2 lg:pt-0">
                      {/* One-Click Approve */}
                      <button
                        onClick={() => handleApprove(item)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                        title="Approve Reservation and Confirm Schedule"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isProcessing ? 'Confirming...' : 'Approve Request'}</span>
                      </button>

                      {/* Reject with Note */}
                      <button
                        onClick={() => handleOpenRejectModal(item)}
                        disabled={isProcessing}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 dark:hover:border-rose-800 active:scale-95 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                        title="Decline Request with Required Feedback Note"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Reject with Note</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DECISION HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 text-center text-zinc-400">
              <p className="font-semibold text-xs text-zinc-700 dark:text-zinc-300">
                No recent review decisions
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Processed requests requiring administrative approval will be archived here.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-200/60 dark:divide-zinc-800 rounded-xl border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
              {filteredHistory.map((item) => {
                const isConfirmed = item.status === ReservationStatus.CONFIRMED;
                const { dateFormatted, timeRange } = formatSlotTime(item.startTime, item.endTime);

                return (
                  <div
                    key={item.id}
                    className="p-4 bg-white dark:bg-zinc-900 hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {isConfirmed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <Check className="w-3 h-3" />
                            <span>APPROVED</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-3 h-3" />
                            <span>REJECTED</span>
                          </span>
                        )}

                        <span className="font-bold text-zinc-900 dark:text-white">
                          {item.resource.name}
                        </span>
                        <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {item.resource.code}
                        </span>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          &quot;{item.title}&quot;
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>
                          Requester: <strong className="text-zinc-700 dark:text-zinc-300">{item.user.name}</strong> ({item.user.department || 'Member'})
                        </span>
                        <span>•</span>
                        <span>
                          {dateFormatted} • {timeRange}
                        </span>
                        {item.updatedAt && (
                          <>
                            <span>•</span>
                            <span>
                              Decided {new Date(item.updatedAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              })}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Display Rejection Note if present */}
                      {!isConfirmed && item.rejectionReason && (
                        <div className="mt-1.5 p-2 rounded-lg bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-900/40 text-[11px] text-rose-800 dark:text-rose-300 flex items-start gap-1.5">
                          <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold">Feedback Recorded:</span> &quot;{item.rejectionReason}&quot;
                          </div>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/resources/${item.resource.id}`}
                      className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 shrink-0 self-end md:self-center"
                    >
                      <span>View Asset</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Rejection Modal with Feedback Note */}
      <RejectReservationModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        reservation={rejectItem}
        onConfirmReject={handleConfirmReject}
      />
    </div>
  );
}
