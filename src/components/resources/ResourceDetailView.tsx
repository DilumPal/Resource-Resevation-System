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
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Wifi,
  Tv,
  Mic,
  Monitor,
  Zap,
  Layers,
  ChevronRight,
  Shield,
  FileText,
  Calendar,
} from 'lucide-react';
import {
  ResourceData,
  getCategoryIcon,
  getLiveStatus,
} from './ResourceCard';
import { VisualSchedule } from '../schedule/VisualSchedule';

interface ResourceDetailViewProps {
  resource: ResourceData;
  allResources: ResourceData[];
}

export function ResourceDetailView({
  resource,
  allResources,
}: ResourceDetailViewProps) {
  const [imageError, setImageError] = useState(false);
  const liveStatus = getLiveStatus(resource);

  // Derive contextual amenities based on category and description
  const amenities = React.useMemo(() => {
    const list: Array<{ icon: React.ReactNode; label: string; desc: string }> = [];

    // General high speed network
    list.push({
      icon: <Wifi className="w-4 h-4 text-emerald-500" />,
      label: 'Enterprise Wi-Fi 6E',
      desc: 'Gigabit low-latency connectivity',
    });

    if (resource.category.slug === 'meeting-spaces') {
      list.push({
        icon: <Tv className="w-4 h-4 text-emerald-500" />,
        label: '4K Ultra-HD Displays',
        desc: 'Wireless HDMI & AirPlay presentation',
      });
      list.push({
        icon: <Mic className="w-4 h-4 text-emerald-500" />,
        label: 'Conference Audio Array',
        desc: 'Noise-cancelling boundary microphones',
      });
      list.push({
        icon: <Users className="w-4 h-4 text-emerald-500" />,
        label: 'Ergonomic Seating',
        desc: 'Executive conference seating',
      });
    } else if (resource.category.slug === 'lab-hardware') {
      list.push({
        icon: <Zap className="w-4 h-4 text-emerald-500" />,
        label: 'Dedicated High-Power Rail',
        desc: 'Surge-protected isolated circuits',
      });
      list.push({
        icon: <Monitor className="w-4 h-4 text-emerald-500" />,
        label: 'Telemetry & Bench Diagnostic',
        desc: 'Oscilloscopes & digital analyzers',
      });
    } else if (resource.category.slug === 'workstations-pods') {
      list.push({
        icon: <Monitor className="w-4 h-4 text-emerald-500" />,
        label: 'Dual 4K Monitor Arm',
        desc: 'Universal USB-C 100W Power Delivery',
      });
      list.push({
        icon: <Shield className="w-4 h-4 text-emerald-500" />,
        label: 'Acoustic Soundproofing',
        desc: 'Felt acoustic isolation panels',
      });
    } else if (resource.category.slug === 'company-vehicles') {
      list.push({
        icon: <Zap className="w-4 h-4 text-emerald-500" />,
        label: 'Level 2 Fast Charger',
        desc: 'Pre-conditioned battery charging bay',
      });
      list.push({
        icon: <MapPin className="w-4 h-4 text-emerald-500" />,
        label: 'Corporate Toll Pass',
        desc: 'Automated toll gateway access',
      });
    }

    return list;
  }, [resource]);

  const scrollToSchedule = () => {
    const el = document.getElementById('visual-schedule-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8">
      {/* Breadcrumb Bar */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <Link
          href="/"
          className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
        >
          Catalog
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-600 dark:text-zinc-300">{resource.category.name}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-zinc-900 dark:text-white font-medium">{resource.name}</span>
      </nav>

      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {getCategoryIcon(resource.category.iconName)}
              <span>{resource.category.name}</span>
            </span>

            <span className="px-2.5 py-1 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-mono font-bold">
              {resource.code}
            </span>

            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${liveStatus.badgeClass}`}
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

            {resource.requiresApproval && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800/60">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                <span>Approval Required</span>
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            {resource.name}
          </h1>

          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-zinc-400" />
              <span>{resource.location}</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-400" />
              <span>
                {resource.capacity === 1 ? '1 Person capacity' : `Up to ${resource.capacity} people`}
              </span>
            </div>

            {resource.bufferMinutes > 0 && (
              <div className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
                <Clock className="w-4 h-4" />
                <span>{resource.bufferMinutes}-minute cleaning buffer</span>
              </div>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-3">
          <Link
            href="/schedule"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 transition-colors shadow-xs"
          >
            <CalendarDays className="w-4 h-4 text-zinc-400" />
            <span>All Schedules</span>
          </Link>

          <button
            onClick={scrollToSchedule}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
            <span>Select & Book Slot</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Content (2 cols) & Right Sidebar (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Hero Image Showcase */}
          <div className="relative h-72 sm:h-96 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800">
            {resource.imageUrl && !imageError ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resource.imageUrl}
                alt={resource.name}
                onError={() => setImageError(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-400">
                {getCategoryIcon(resource.category.iconName)}
                <span className="text-sm font-semibold mt-3">{resource.name}</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
              <span className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xs font-mono font-medium">
                Asset ID: {resource.id}
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-xs font-medium">
                Standard Turnaround Buffer: {resource.bufferMinutes}m
              </span>
            </div>
          </div>

          {/* Overview & Description */}
          <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Overview & Specifications
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {resource.description}
            </p>

            {/* Spec Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400">Operating Capacity</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {resource.capacity} {resource.capacity === 1 ? 'Person' : 'People'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400">Turnaround Buffer</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {resource.bufferMinutes > 0 ? `${resource.bufferMinutes} Minutes` : 'None'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400">Governance Policy</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {resource.requiresApproval ? 'Admin Approval' : 'Auto-Confirm'}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800">
                <span className="text-[11px] text-zinc-400">Operational State</span>
                <p className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                  {resource.status}
                </p>
              </div>
            </div>
          </div>

          {/* Included Equipment & Amenities */}
          <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-white">
              Included Amenities & Equipment
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {amenities.map((item, index) => (
                <div
                  key={index}
                  className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/40 flex items-start gap-3"
                >
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {item.label}
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Visual Schedule Embedded Section */}
          <div id="visual-schedule-section" className="space-y-4 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                  Visual Availability Schedule
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Inspect booked intervals, turnaround buffer blocks, and click any open slot to reserve.
                </p>
              </div>
            </div>

            <VisualSchedule
              resources={allResources}
              initialResourceId={resource.id}
              hideResourceSelector={true}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Reservation Policy Card */}
          <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs space-y-4 sticky top-24">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Booking Policies & Rules</span>
            </h3>

            <div className="space-y-3 text-xs text-zinc-600 dark:text-zinc-300">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">Zero-Conflict Lock:</strong>{' '}
                  Atomic database transactions prevent concurrent duplicate bookings.
                </div>
              </div>

              {resource.bufferMinutes > 0 && (
                <div className="flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-zinc-800 dark:text-zinc-200">
                      Turnaround Buffer ({resource.bufferMinutes}m):
                    </strong>{' '}
                    Automatically blocked after each booking to accommodate sanitization and setup.
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-zinc-800 dark:text-zinc-200">Operating Hours:</strong>{' '}
                  Standard reservations run between 08:00 AM and 08:00 PM.
                </div>
              </div>

              {resource.requiresApproval && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800/60 text-purple-900 dark:text-purple-300">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Governance Note:</strong> This resource requires administrator approval.
                    Requests enter the review queue upon submission.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={scrollToSchedule}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
              >
                Choose Slot on Timeline
              </button>
            </div>

            {/* Upcoming Reservations List */}
            {resource.reservations && resource.reservations.length > 0 && (
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
                  Upcoming Reservations Today
                </h4>
                <div className="space-y-2">
                  {resource.reservations.map((res) => (
                    <div
                      key={res.id}
                      className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-800 text-xs"
                    >
                      <div className="flex items-center justify-between font-bold text-zinc-900 dark:text-zinc-100">
                        <span className="line-clamp-1">{res.title}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded ${
                            res.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {res.status}
                        </span>
                      </div>
                      <p className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                        {new Date(res.startTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}{' '}
                        –{' '}
                        {new Date(res.endTime).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                      {res.user && (
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          By: {res.user.name}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
