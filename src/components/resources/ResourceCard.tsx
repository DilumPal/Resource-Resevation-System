'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Laptop,
  Cpu,
  Car,
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  CalendarDays,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ResourceStatus } from '@prisma/client';

export interface ResourceData {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  location: string;
  capacity: number;
  description: string;
  status: ResourceStatus;
  requiresApproval: boolean;
  bufferMinutes: number;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
    iconName: string;
  };
  reservations?: Array<{
    id: string;
    title: string;
    startTime: Date | string;
    endTime: Date | string;
    status: string;
    user?: { name: string } | null;
  }>;
  maintenanceLogs?: Array<{
    id: string;
    reason: string;
    startTime: Date | string;
    endTime: Date | string | null;
    status: string;
  }>;
  _count?: {
    reservations: number;
    maintenanceLogs: number;
  };
}

interface ResourceCardProps {
  resource: ResourceData;
  onBookClick?: (resource: ResourceData) => void;
}

export type LiveStatus = 'AVAILABLE_NOW' | 'IN_USE' | 'BUFFER' | 'MAINTENANCE' | 'RETIRED';

export function getLiveStatus(resource: ResourceData): {
  status: LiveStatus;
  label: string;
  sublabel?: string;
  badgeClass: string;
  dotClass: string;
} {
  const now = new Date().getTime();

  if (resource.status === 'RETIRED') {
    return {
      status: 'RETIRED',
      label: 'Retired',
      badgeClass: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700',
      dotClass: 'bg-zinc-400',
    };
  }

  // Active maintenance check
  if (resource.status === 'MAINTENANCE') {
    const activeLog = resource.maintenanceLogs?.[0];
    return {
      status: 'MAINTENANCE',
      label: 'Maintenance',
      sublabel: activeLog ? activeLog.reason : 'Out of service for maintenance',
      badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
      dotClass: 'bg-amber-500',
    };
  }

  // Check if an ongoing reservation is occurring right now
  const bufferMs = (resource.bufferMinutes || 0) * 60 * 1000;
  const currentReservation = resource.reservations?.find((r) => {
    const start = new Date(r.startTime).getTime();
    const end = new Date(r.endTime).getTime();
    return start <= now && end >= now;
  });

  if (currentReservation) {
    const endFormatted = new Date(currentReservation.endTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return {
      status: 'IN_USE',
      label: 'In Use',
      sublabel: `Until ${endFormatted}`,
      badgeClass: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
      dotClass: 'bg-rose-500',
    };
  }

  // Check if in cleaning/turnaround buffer after a recently completed reservation
  if (bufferMs > 0) {
    const recentRes = resource.reservations?.find((r) => {
      const end = new Date(r.endTime).getTime();
      return now > end && now < end + bufferMs;
    });

    if (recentRes) {
      const bufferFreeTime = new Date(new Date(recentRes.endTime).getTime() + bufferMs).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      return {
        status: 'BUFFER',
        label: 'Cleaning Buffer',
        sublabel: `Free at ${bufferFreeTime}`,
        badgeClass: 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
        dotClass: 'bg-purple-500',
      };
    }
  }

  // Check next upcoming reservation today
  const nextRes = resource.reservations?.find((r) => {
    const start = new Date(r.startTime).getTime();
    return start > now;
  });

  let nextSublabel: string | undefined = undefined;
  if (nextRes) {
    const nextStartFormatted = new Date(nextRes.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    nextSublabel = `Free until ${nextStartFormatted}`;
  }

  return {
    status: 'AVAILABLE_NOW',
    label: 'Available Now',
    sublabel: nextSublabel || 'Open all day',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    dotClass: 'bg-emerald-500 animate-pulse',
  };
}

export function getCategoryIcon(iconName: string) {
  switch (iconName) {
    case 'Building2':
      return <Building2 className="w-3.5 h-3.5" />;
    case 'Laptop':
      return <Laptop className="w-3.5 h-3.5" />;
    case 'Cpu':
      return <Cpu className="w-3.5 h-3.5" />;
    case 'Car':
      return <Car className="w-3.5 h-3.5" />;
    default:
      return <Building2 className="w-3.5 h-3.5" />;
  }
}

export function ResourceCard({ resource, onBookClick }: ResourceCardProps) {
  const [imageError, setImageError] = useState(false);
  const liveStatus = getLiveStatus(resource);

  return (
    <div className="group relative flex flex-col rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 transition-all duration-200 overflow-hidden">
      {/* Thumbnail Banner */}
      <div className="relative h-48 w-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
        {resource.imageUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resource.imageUrl}
            alt={resource.name}
            onError={() => setImageError(true)}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-400">
            {getCategoryIcon(resource.category.iconName)}
            <span className="text-xs font-medium mt-2">{resource.category.name}</span>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent pointer-events-none" />

        {/* Top Badges: Category & Code */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 shadow-xs border border-white/20">
            {getCategoryIcon(resource.category.iconName)}
            <span>{resource.category.name}</span>
          </div>

          <span className="px-2.5 py-1 rounded-full bg-zinc-950/80 backdrop-blur-xs text-white text-[11px] font-mono font-bold tracking-wider border border-white/10 shadow-xs">
            {resource.code}
          </span>
        </div>

        {/* Bottom Status Overlay Badge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border backdrop-blur-xs shadow-xs ${liveStatus.badgeClass}`}
          >
            <span className={`w-2 h-2 rounded-full ${liveStatus.dotClass}`} />
            <span>{liveStatus.label}</span>
            {liveStatus.sublabel && (
              <>
                <span className="opacity-40">•</span>
                <span className="font-normal opacity-90">{liveStatus.sublabel}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Title & Approval Notice */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {resource.name}
            </h3>
            {resource.requiresApproval && (
              <span
                title="This resource requires administrator approval before confirmation"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] font-medium border border-purple-200 dark:border-purple-800/60 shrink-0"
              >
                <ShieldCheck className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                <span>Approval</span>
              </span>
            )}
          </div>

          {/* Location & Capacity Specs */}
          <div className="mt-2.5 flex flex-wrap items-center gap-y-1.5 gap-x-4 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>{resource.location}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>
                {resource.capacity === 1 ? '1 Person' : `Up to ${resource.capacity} people`}
              </span>
            </div>

            {resource.bufferMinutes > 0 && (
              <div
                title="Cleaning and turnover buffer between back-to-back bookings"
                className="flex items-center gap-1.5 text-zinc-400"
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{resource.bufferMinutes}m buffer</span>
              </div>
            )}
          </div>

          {/* Description Excerpt */}
          <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
            {resource.description}
          </p>
        </div>

        {/* Card Actions Footer */}
        <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          <Link
            href={`/schedule?resourceId=${resource.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Timeline</span>
          </Link>

          <button
            onClick={() => onBookClick && onBookClick(resource)}
            disabled={resource.status === 'RETIRED'}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
              resource.status === 'RETIRED'
                ? 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs hover:shadow-emerald-600/20'
            }`}
          >
            <span>Book Slot</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
