'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  CalendarDays,
  TrendingUp,
  ShieldCheck,
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
} from 'lucide-react';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';
import { getCategoryIcon } from '../resources/ResourceCard';

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
  pendingReservations: Array<{
    id: string;
    title: string;
    startTime: Date | string;
    endTime: Date | string;
    status: string;
    resource: {
      id: string;
      name: string;
      code: string;
      location: string;
    };
    user: {
      id: string;
      name: string;
      email: string;
      department?: string | null;
    };
  }>;
  activeMaintenanceLogs: Array<{
    id: string;
    reason: string;
    startTime: Date | string;
    endTime: Date | string | null;
    status: string;
    resource: {
      name: string;
      code: string;
    };
  }>;
}

interface AdminDashboardProps {
  initialData: AdminStatsData;
}

export function AdminDashboard({ initialData }: AdminDashboardProps) {
  const { currentUser, role, toggleRole, isAdmin } = useUserRole();
  const { showToast } = useNotification();

  const {
    stats,
    categoryDemand,
    dailyTrend,
    hourlyDistribution,
    topDemandedResources,
    pendingReservations,
    activeMaintenanceLogs,
  } = initialData;

  const handleRoleToggle = () => {
    toggleRole();
    showToast({
      type: 'info',
      title: 'Switched Role Context',
      message: `Now viewing as ${!isAdmin ? 'Administrator (Sarah Jenkins)' : 'Member (Alex Morgan)'}.`,
    });
  };

  // Find max daily count for bar chart scaling
  const maxDailyCount = useMemo(() => {
    const maxVal = Math.max(1, ...dailyTrend.map((d) => d.total));
    return maxVal;
  }, [dailyTrend]);

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
        <div className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Pending Approvals
              </p>
              <h3 className="text-3xl font-extrabold text-zinc-900 dark:text-white mt-1.5">
                {stats.pendingApprovalsCount}
              </h3>
            </div>
            <div
              className={`p-3 rounded-xl border ${
                stats.pendingApprovalsCount > 0
                  ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/60 text-amber-600 dark:text-amber-400'
                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
            {stats.pendingApprovalsCount > 0 ? (
              <span className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <span>Requires Review</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>All requests clear</span>
              </span>
            )}
            <span className="text-zinc-400">Queue Status</span>
          </div>
        </div>
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
                  {/* Tooltip / Count on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-mono font-bold text-zinc-600 dark:text-zinc-300 mb-1.5">
                    {dayItem.total} {dayItem.total === 1 ? 'slot' : 'slots'}
                  </div>

                  {/* Bar Column Stack */}
                  <div className="w-full max-w-[42px] h-44 bg-zinc-100 dark:bg-zinc-800/60 rounded-xl flex flex-col justify-end overflow-hidden p-1 gap-1 border border-zinc-200/50 dark:border-zinc-700/50">
                    {/* Pending portion (top) */}
                    {dayItem.pending > 0 && (
                      <div
                        className="w-full bg-amber-500 hover:bg-amber-400 rounded-lg transition-all"
                        style={{ height: `${Math.max(15, pendingHeightPercent)}%` }}
                        title={`${dayItem.pending} Pending on ${dayItem.day}`}
                      />
                    )}

                    {/* Confirmed portion (bottom) */}
                    {dayItem.confirmed > 0 && (
                      <div
                        className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all"
                        style={{ height: `${Math.max(15, confirmedHeightPercent)}%` }}
                        title={`${dayItem.confirmed} Confirmed on ${dayItem.day}`}
                      />
                    )}

                    {dayItem.total === 0 && (
                      <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full my-auto opacity-40" />
                    )}
                  </div>

                  {/* Day Label & Date Marker */}
                  <div className="mt-3 text-center">
                    <span
                      className={`block text-xs font-bold ${
                        dayItem.isToday
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {dayItem.day}
                    </span>
                    <span
                      className={`block text-[11px] ${
                        dayItem.isToday
                          ? 'font-bold text-emerald-600 dark:text-emerald-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {dayItem.shortDate}
                    </span>
                    {dayItem.isToday && (
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mt-0.5" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <span>
              Peak Day:{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">
                Monday (4 reservations)
              </strong>
            </span>
            <span>Horizon: 7 Days (Operating Hours 08:00 – 20:00)</span>
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
              Distribution of reservation volume across asset classes.
            </p>
          </div>

          <div className="space-y-5">
            {categoryDemand.map((cat) => {
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                      <span>{cat.name}</span>
                      <span className="text-zinc-400 font-normal">
                        ({cat.resourceCount} assets)
                      </span>
                    </span>
                    <span className="font-bold text-zinc-900 dark:text-zinc-100">
                      {cat.count} bookings ({cat.percentage}%)
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.percentage > 50
                          ? 'bg-emerald-600'
                          : cat.percentage > 20
                          ? 'bg-purple-600'
                          : 'bg-teal-600'
                      }`}
                      style={{ width: `${Math.max(2, cat.percentage)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="p-3.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-xs text-purple-900 dark:text-purple-200 space-y-1">
              <span className="font-bold block">Highest Demand Category:</span>
              <p className="text-[11px] opacity-90 leading-relaxed">
                Meeting Spaces command 71% of total enterprise booking volume, driven by high utilization in Boardroom Alpha.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Analytics Grid: Hourly Traffic Heatmap & Top Resources Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Hourly Peak Traffic Heatmap */}
        <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-5">
          <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Hourly Peak Traffic Distribution
              </h2>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Concentration of reservation hours across enterprise operating hours.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {hourlyDistribution.map((slot, index) => {
              const isPeak = slot.count >= 2;
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
              href="/schedule"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <span>Master Schedule</span>
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
    </div>
  );
}
