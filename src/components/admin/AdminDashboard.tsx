'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Building2,
  Laptop,
  Cpu,
  Car,
  Clock,
  ArrowRight,
  Sparkles,
  BarChart3,
  Activity,
  CheckCircle2,
  Users,
  MapPin,
  ExternalLink,
  RotateCcw,
  Shield,
  ArrowUpRight,
  Filter,
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Search,
  X,
  Wrench,
  WrenchOff,
} from 'lucide-react';
import { ResourceStatus } from '@prisma/client';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';
import { ResourceData, getCategoryIcon } from '../resources/ResourceCard';
import { ResourceFormModal, CategoryItem } from './ResourceFormModal';
import { MaintenanceModal } from './MaintenanceModal';
import { ApprovalHub, PendingReservationItem } from './ApprovalHub';
import { archiveResource, getResources, toggleResourceMaintenance } from '@/actions/resources';

export interface AdminStatsData {
  stats: {
    totalResources: number;
    availableCount: number;
    maintenanceCount: number;
    todayBookingsCount: number;
    pendingApprovalsCount: number;
    utilizationRate: number;
  };
  categoryDemand: Array<{
    id: string;
    name: string;
    count: number;
    resourceCount: number;
    percentage: number;
  }>;
  dailyTrend: Array<{
    day: string;
    date: string;
    shortDate: string;
    confirmed: number;
    pending: number;
    total: number;
    isToday: boolean;
  }>;
  hourlyDistribution: Array<{
    timeSlot: string;
    count: number;
    intensityPercent: number;
  }>;
  topDemandedResources: Array<{
    id: string;
    name: string;
    code: string;
    categoryName: string;
    bookingsCount: number;
    utilizationPercent: number;
  }>;
  pendingReservations: PendingReservationItem[];
  recentDecisions?: PendingReservationItem[];
  activeMaintenanceLogs: Array<{
    id: string;
    reason: string;
    startTime: Date | string;
    endTime: Date | string | null;
    status: string;
    performedBy?: string | null;
    notes?: string | null;
    resource: {
      id?: string;
      name: string;
      code: string;
      location?: string;
    };
  }>;
  categories: Array<{
    id: string;
    name: string;
  }>;
}

interface AdminDashboardProps {
  initialData: AdminStatsData;
  initialResources?: ResourceData[];
  categories?: CategoryItem[];
}

export function AdminDashboard({
  initialData,
  initialResources = [],
  categories = [],
}: AdminDashboardProps) {
  const router = useRouter();
  const { currentUser, role, toggleRole, isAdmin } = useUserRole();
  const { showToast } = useNotification();

  const {
    stats,
    categoryDemand,
    dailyTrend,
    hourlyDistribution,
    topDemandedResources,
    pendingReservations,
    recentDecisions = [],
    activeMaintenanceLogs,
  } = initialData;

  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(stats.pendingApprovalsCount);

  // Inventory Management State
  const [resourcesList, setResourcesList] = useState<ResourceData[]>(initialResources);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | ResourceStatus>('ALL');

  // Resource Form Modal State (Create / Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resourceToEdit, setResourceToEdit] = useState<ResourceData | null>(null);
  const [isArchivingId, setIsArchivingId] = useState<string | null>(null);

  // Maintenance Modal State
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceModalResource, setMaintenanceModalResource] = useState<ResourceData | null>(null);
  const [isTogglingMaintenanceId, setIsTogglingMaintenanceId] = useState<string | null>(null);

  const activeCategories: CategoryItem[] = useMemo(() => {
    if (categories && categories.length > 0) return categories;
    return initialData.categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.id,
      iconName: 'Building2',
    }));
  }, [categories, initialData.categories]);

  const handleRoleToggle = () => {
    toggleRole();
    showToast({
      type: 'info',
      title: 'Switched Role Context',
      message: `Now viewing as ${!isAdmin ? 'Administrator (Sarah Jenkins)' : 'Member (Alex Morgan)'}.`,
    });
  };

  const handleRefreshResources = async () => {
    const res = await getResources();
    if (res.success && res.resources) {
      setResourcesList(res.resources as unknown as ResourceData[]);
    }
  };

  const handleOpenMaintenanceModal = (res: ResourceData) => {
    setMaintenanceModalResource(res);
    setIsMaintenanceModalOpen(true);
  };

  const handleRestoreOperational = async (res: ResourceData | { id: string; name: string }) => {
    setIsTogglingMaintenanceId(res.id);

    // Optimistic update
    setResourcesList((prev) =>
      prev.map((item) =>
        item.id === res.id ? { ...item, status: ResourceStatus.AVAILABLE } : item
      )
    );

    const result = await toggleResourceMaintenance(
      res.id,
      ResourceStatus.AVAILABLE,
      undefined,
      currentUser.id
    );

    setIsTogglingMaintenanceId(null);

    if (result.success) {
      showToast({
        type: 'success',
        title: 'Operational Status Restored',
        message: `Resource "${res.name}" has returned to service and is available for booking.`,
      });
      handleRefreshResources();
      router.refresh();
    } else {
      // Revert on failure
      setResourcesList((prev) =>
        prev.map((item) =>
          item.id === res.id ? { ...item, status: ResourceStatus.MAINTENANCE } : item
        )
      );
      showToast({
        type: 'error',
        title: 'Action Failed',
        message: result.error || 'Failed to restore operational status.',
      });
    }
  };

  const handleToggleArchive = async (res: ResourceData) => {
    const willArchive = res.status !== ResourceStatus.RETIRED;
    const previousStatus = res.status;
    setIsArchivingId(res.id);

    // Optimistic update
    setResourcesList((prev) =>
      prev.map((item) =>
        item.id === res.id
          ? {
              ...item,
              status: willArchive ? ResourceStatus.RETIRED : ResourceStatus.AVAILABLE,
            }
          : item
      )
    );

    const result = await archiveResource(res.id, willArchive, currentUser.id);
    setIsArchivingId(null);

    if (result.success) {
      showToast({
        type: 'success',
        title: willArchive ? 'Resource Archived' : 'Resource Restored',
        message: result.message || `Status updated for ${res.name}.`,
      });
      router.refresh();
    } else {
      // Revert on failure
      setResourcesList((prev) =>
        prev.map((item) => (item.id === res.id ? { ...item, status: previousStatus } : item))
      );
      showToast({
        type: 'error',
        title: 'Operation Failed',
        message: result.error || 'Failed to update resource status.',
      });
    }
  };

  // Filtered resources calculation
  const filteredResources = useMemo(() => {
    return resourcesList.filter((res) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = res.name.toLowerCase().includes(q);
        const matchCode = res.code.toLowerCase().includes(q);
        const matchLocation = res.location.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchLocation) return false;
      }
      if (selectedCategory !== 'ALL' && res.categoryId !== selectedCategory) {
        return false;
      }
      if (selectedStatus !== 'ALL' && res.status !== selectedStatus) {
        return false;
      }
      return true;
    });
  }, [resourcesList, searchQuery, selectedCategory, selectedStatus]);

  // Max daily count for bar chart scaling
  const maxDailyCount = useMemo(() => {
    return Math.max(1, ...dailyTrend.map((d) => d.total));
  }, [dailyTrend]);

  // Role Gate check: Access Restricted for non-admins
  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="p-8 sm:p-12 rounded-3xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm max-w-2xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-6 shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 text-xs font-bold mb-4">
            <span>Restricted Area</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
            Administrator Access Required
          </h1>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
            You are currently viewing SyncSpace as <strong className="text-zinc-900 dark:text-zinc-100">{currentUser.name}</strong> with standard <span className="font-semibold text-zinc-800 dark:text-zinc-200">Member</span> permissions. The Operations Hub, inventory controls, and organizational analytics are restricted to system administrators.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleRoleToggle}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Switch to Administrator (Sarah Jenkins)</span>
            </button>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              <span>Return to Catalog</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Top Header & Role Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400 mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>Operations & Governance Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Analytics & Utilization Dashboard
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Real-time telemetry on resource demand, booking velocity, operational efficiency, and pending approval queues.
          </p>
        </div>

        {/* Admin Context Banner & Switcher */}
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 text-xs shrink-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
              isAdmin ? 'bg-purple-600 shadow-purple-600/20' : 'bg-emerald-600 shadow-emerald-600/20'
            }`}
          >
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-zinc-900 dark:text-white">
                {currentUser.name}
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  isAdmin
                    ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                }`}
              >
                {role}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              {isAdmin ? 'Full Governance & Administrative Access' : 'Viewing with Member permissions'}
            </p>
          </div>

          <button
            onClick={handleRoleToggle}
            className="ml-2 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
          >
            Switch Role
          </button>

          <Link
            href="/admin/calendar"
            className="px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-[11px] font-semibold transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Master Calendar</span>
          </Link>
        </div>
      </div>

      {/* 4 Core Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Resources */}
        <div className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Total Resources
              </p>
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1.5">
                {stats.totalResources}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{stats.availableCount} Operational</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{stats.maintenanceCount} Maint.</span>
            </span>
          </div>
        </div>

        {/* Card 2: Today's Bookings */}
        <div className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Today&apos;s Bookings
              </p>
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1.5">
                {stats.todayBookingsCount}
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/60 text-teal-600 dark:text-teal-400">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Daily reservation velocity</span>
            <span className="text-teal-600 dark:text-teal-400 font-semibold">Active Horizon</span>
          </div>
        </div>

        {/* Card 3: Active Utilization % */}
        <div className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Active Utilization
              </p>
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1.5">
                {stats.utilizationRate}%
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200/80 dark:border-purple-800/60 text-purple-600 dark:text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 space-y-1.5">
            <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-purple-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(5, stats.utilizationRate)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-zinc-400">
              <span>Operating load</span>
              <span>12h max daily cap</span>
            </div>
          </div>
        </div>

        {/* Card 4: Pending Approvals */}
        <a
          href="#approval-hub"
          className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/80 transition-all relative overflow-hidden group block cursor-pointer"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Pending Approvals
              </p>
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1.5">
                {pendingApprovalsCount}
              </h3>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                pendingApprovalsCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            {pendingApprovalsCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <span>Requires Review</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All requests clear</span>
              </span>
            )}
            <span className="text-zinc-400">Queue Status</span>
          </div>
        </a>
      </div>

      {/* Main Charts Grid: 7-Day Demand Horizon & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: 7-Day Demand Horizon Trend Bar Chart */}
        <div className="lg:col-span-2 p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  7-Day Booking Demand Horizon
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Daily allocation volume comparing confirmed bookings and pending requests across the week.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-600" />
                <span className="text-zinc-600 dark:text-zinc-400">Confirmed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500" />
                <span className="text-zinc-600 dark:text-zinc-400">Pending</span>
              </div>
            </div>
          </div>

          {/* Interactive Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-3 sm:gap-6 pt-6 pb-2 px-2">
            {dailyTrend.map((dayItem, index) => {
              const confirmedHeightPercent =
                maxDailyCount > 0 ? (dayItem.confirmed / maxDailyCount) * 100 : 0;
              const pendingHeightPercent =
                maxDailyCount > 0 ? (dayItem.pending / maxDailyCount) * 100 : 0;

              return (
                <div
                  key={index}
                  className="flex-1 flex flex-col items-center h-full justify-end group cursor-pointer"
                >
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-[10px] rounded-lg py-1 px-2 mb-2 pointer-events-none shadow-lg whitespace-nowrap z-20">
                    <p className="font-bold">{dayItem.date}</p>
                    <p className="text-emerald-400">{dayItem.confirmed} confirmed</p>
                    {dayItem.pending > 0 && <p className="text-amber-400">{dayItem.pending} pending</p>}
                  </div>

                  {/* Stacked Bar Container */}
                  <div className="w-full max-w-[48px] bg-zinc-100 dark:bg-zinc-800 rounded-t-xl overflow-hidden flex flex-col justify-end relative h-44 group-hover:bg-zinc-200/80 dark:group-hover:bg-zinc-700/80 transition-colors">
                    {/* Pending Segment */}
                    {pendingHeightPercent > 0 && (
                      <div
                        style={{ height: `${pendingHeightPercent}%` }}
                        className="w-full bg-amber-500 border-b border-amber-600/40 transition-all duration-300"
                      />
                    )}
                    {/* Confirmed Segment */}
                    {confirmedHeightPercent > 0 && (
                      <div
                        style={{ height: `${confirmedHeightPercent}%` }}
                        className="w-full bg-emerald-600 transition-all duration-300"
                      />
                    )}
                  </div>

                  {/* Day Label */}
                  <div className="mt-3 text-center">
                    <span
                      className={`text-xs font-bold block ${
                        dayItem.isToday
                          ? 'text-emerald-600 dark:text-emerald-400 underline underline-offset-4'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {dayItem.day}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">
                      {dayItem.total} {dayItem.total === 1 ? 'bk' : 'bks'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
            <span>Operating Week Window (Mon - Sun)</span>
            <span>Peak capacity dynamically calculated</span>
          </div>
        </div>

        {/* Right 1 Col: Category Demand Breakdown */}
        <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-6">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Category Demand Share
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Proportion of total reservation volume by facility type.
            </p>
          </div>

          <div className="space-y-4">
            {categoryDemand.map((cat) => {
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {cat.name}
                    </span>
                    <span className="font-mono text-zinc-500 dark:text-zinc-400">
                      {cat.count} bks ({cat.percentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(4, cat.percentage)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400">
                    <span>{cat.resourceCount} managed inventory units</span>
                    <span>Demand factor: {cat.percentage > 35 ? 'High' : 'Normal'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-3.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-300">
            <span className="font-bold block">Capacity Recommendation</span>
            <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
              Meeting rooms and private focus pods represent the highest scheduling density. Consider expanding workstation allocations.
            </p>
          </div>
        </div>
      </div>

      {/* Hourly Contention & Most Demanded Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hourly Distribution / Contention Peaks */}
        <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Peak Traffic Distribution
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Concentration of reservations across daytime operating hours.
              </p>
            </div>

            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              08:00 – 20:00
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hourlyDistribution.map((slot, index) => {
              const isPeak = slot.count > 1;
              return (
                <div
                  key={index}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isPeak
                      ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50/60 dark:bg-emerald-950/40'
                      : 'border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30'
                  }`}
                >
                  <span className="text-[11px] font-mono font-semibold text-zinc-500 dark:text-zinc-400 block">
                    {slot.timeSlot}
                  </span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xl font-bold text-zinc-900 dark:text-white">
                      {slot.count}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isPeak
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {isPeak ? 'Peak Traffic' : 'Moderate'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-zinc-400 pt-1">
            Standard operating windows experience highest contention between 10:00 AM and 04:00 PM. Turnaround buffers are automatically maintained.
          </p>
        </div>

        {/* Top Demanded Resources Ranking */}
        <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Most Demanded Assets
                </h2>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Top utilized shared facilities and specialized hardware.
              </p>
            </div>

            <Link
              href="/admin/calendar"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Master Calendar Timeline</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {topDemandedResources.map((res, index) => (
              <div
                key={res.id}
                className="p-3 rounded-xl border border-zinc-200/70 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 flex items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                    {index + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/resources/${res.id}`}
                        className="text-xs font-bold text-zinc-900 dark:text-zinc-100 hover:text-emerald-600 transition-colors"
                      >
                        {res.name}
                      </Link>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                        {res.code}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">
                      {res.categoryName}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                    {res.bookingsCount} {res.bookingsCount === 1 ? 'booking' : 'bookings'}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    {res.utilizationPercent}% demand score
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Approval Hub: Review Queue */}
      <div id="approval-hub" className="scroll-mt-20">
        <ApprovalHub
          initialPending={pendingReservations}
          initialHistory={recentDecisions}
          adminUserId={currentUser.id}
          onQueueUpdate={(newCount) => setPendingApprovalsCount(newCount)}
        />
      </div>

      {/* 5. Active Maintenance Queue & Downtime Governance */}
      <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
              <Wrench className="w-4 h-4" />
              <span>Downtime Governance</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Active Maintenance Queue
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Managed facilities and equipment currently out of service for servicing, repair, or inspection.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold border ${
                activeMaintenanceLogs.length > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
              }`}
            >
              {activeMaintenanceLogs.length === 1
                ? '1 Asset Out of Service'
                : `${activeMaintenanceLogs.length} Assets Out of Service`}
            </span>
          </div>
        </div>

        {activeMaintenanceLogs.length === 0 ? (
          <div className="p-8 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20 text-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto mb-2.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-zinc-900 dark:text-white">
              All Managed Resources Operational
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
              There are zero scheduled outages or active maintenance blocks. All assets are available for reservation in accordance with governance policies.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeMaintenanceLogs.map((log) => {
              const startFormatted = new Date(log.startTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              });

              const endFormatted = log.endTime
                ? new Date(log.endTime).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })
                : 'Indefinite / Ongoing';

              const resourceTarget = resourcesList.find((r) => r.id === log.resource?.id) || {
                id: log.resource?.id || log.id,
                name: log.resource?.name || 'Resource',
              };

              return (
                <div
                  key={log.id}
                  className="p-4 rounded-xl border border-amber-200/90 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-zinc-900 dark:text-white">
                            {log.resource.name}
                          </span>
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200">
                            {log.resource.code}
                          </span>
                        </div>
                        {log.resource.location && (
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                            {log.resource.location}
                          </p>
                        )}
                      </div>

                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0">
                        IN PROGRESS
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-amber-200/60 dark:border-amber-900/40 text-xs">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block">
                        {log.reason}
                      </span>
                      {log.notes && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 italic">
                          &quot;{log.notes}&quot;
                        </p>
                      )}
                    </div>

                    <div className="space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <div className="flex items-center justify-between">
                        <span>Started:</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {startFormatted}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Estimated Return:</span>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">
                          {endFormatted}
                        </span>
                      </div>
                      {log.performedBy && (
                        <div className="flex items-center justify-between">
                          <span>Technician:</span>
                          <span className="font-medium text-zinc-700 dark:text-zinc-300">
                            {log.performedBy}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreOperational(resourceTarget as ResourceData)}
                    disabled={isTogglingMaintenanceId === resourceTarget.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Complete &amp; Restore to Service</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 6. Resource Inventory Directory & Asset Governance */}
      <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-6">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Layers className="w-4 h-4" />
              <span>Asset Governance</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Resource Inventory Directory
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Create, configure, modify, and retire workspace rooms, workstations, labs, and fleet assets.
            </p>
          </div>

          <button
            onClick={() => {
              setResourceToEdit(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Register New Resource</span>
          </button>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by asset name, code, or location..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Select */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {activeCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Status Select */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'ALL' | ResourceStatus)}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
            >
              <option value="ALL">All Operational Statuses</option>
              <option value={ResourceStatus.AVAILABLE}>Operational (Available)</option>
              <option value={ResourceStatus.MAINTENANCE}>Maintenance</option>
              <option value={ResourceStatus.RETIRED}>Archived / Retired</option>
            </select>

            <span className="text-[11px] font-medium text-zinc-400 px-2">
              Showing {filteredResources.length} of {resourcesList.length}
            </span>
          </div>
        </div>

        {/* Assets Table */}
        <div className="overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-zinc-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                <th className="px-4 py-3">Resource Asset</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Location & Capacity</th>
                <th className="px-4 py-3">Turnover & Approval</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/80 text-xs">
              {filteredResources.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                    <p className="font-semibold text-sm text-zinc-700 dark:text-zinc-300">
                      No resources found
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      No assets match the active search or category filters.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredResources.map((res) => {
                  const isRetired = res.status === ResourceStatus.RETIRED;
                  const isMaintenance = res.status === ResourceStatus.MAINTENANCE;

                  return (
                    <tr
                      key={res.id}
                      className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Name & Code */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-center text-zinc-600 dark:text-zinc-300 shrink-0">
                            {getCategoryIcon(res.category?.iconName || 'Building2')}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link
                                href={`/resources/${res.id}`}
                                className="font-bold text-zinc-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                              >
                                {res.name}
                              </Link>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60">
                                {res.code}
                              </span>
                            </div>
                            <p className="text-[11px] text-zinc-400 truncate max-w-xs mt-0.5">
                              {res.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 font-medium">
                          <span>{res.category?.name || 'Unassigned'}</span>
                        </span>
                      </td>

                      {/* Location & Capacity */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                            <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>{res.location}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400 text-[11px]">
                            <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>Up to {res.capacity} people</span>
                          </div>
                        </div>
                      </td>

                      {/* Turnover & Approval */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                            <span>
                              {res.bufferMinutes > 0
                                ? `${res.bufferMinutes} min buffer`
                                : '0 min buffer'}
                            </span>
                          </div>
                          {res.requiresApproval ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              Approval Required
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                              Instant Auto-Book
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {res.status === ResourceStatus.AVAILABLE && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Operational
                          </span>
                        )}
                        {res.status === ResourceStatus.MAINTENANCE && (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              Maintenance
                            </span>
                            {res.maintenanceLogs?.[0] && (
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-medium truncate max-w-[130px]" title={res.maintenanceLogs[0].reason}>
                                {res.maintenanceLogs[0].reason}
                              </p>
                            )}
                          </div>
                        )}
                        {res.status === ResourceStatus.RETIRED && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Edit Button */}
                          <button
                            onClick={() => {
                              setResourceToEdit(res);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
                            title="Edit Resource Specs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Maintenance Mode Toggle Button */}
                          {isMaintenance ? (
                            <button
                              onClick={() => handleRestoreOperational(res)}
                              disabled={isTogglingMaintenanceId === res.id}
                              className="p-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors cursor-pointer"
                              title="Restore to Operational (End Maintenance)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpenMaintenanceModal(res)}
                              disabled={isRetired || isTogglingMaintenanceId === res.id}
                              className="p-1.5 rounded-lg border border-amber-200 dark:border-amber-800/80 bg-amber-50/60 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors cursor-pointer disabled:opacity-40"
                              title="Place in Maintenance Mode"
                            >
                              <Wrench className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Archive / Restore Button */}
                          <button
                            onClick={() => handleToggleArchive(res)}
                            disabled={isArchivingId === res.id}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isRetired
                                ? 'border-emerald-200 dark:border-emerald-800/80 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
                                : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                            title={isRetired ? 'Restore to Operational' : 'Archive Resource'}
                          >
                            {isRetired ? (
                              <ArchiveRestore className="w-3.5 h-3.5" />
                            ) : (
                              <Archive className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resource Modal for Create & Edit */}
      <ResourceFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        resourceToEdit={resourceToEdit}
        categories={activeCategories}
        onSuccess={() => {
          handleRefreshResources();
          router.refresh();
        }}
      />

      {/* Maintenance Modal for Placing Assets into Maintenance */}
      <MaintenanceModal
        isOpen={isMaintenanceModalOpen}
        onClose={() => setIsMaintenanceModalOpen(false)}
        resource={maintenanceModalResource}
        onSuccess={() => {
          handleRefreshResources();
          router.refresh();
        }}
      />
    </div>
  );
}
