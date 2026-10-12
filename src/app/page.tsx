"use client";

import React from "react";
import Link from "next/link";
import { useUserRole } from "@/context/UserRoleContext";
import { useNotification } from "@/context/NotificationContext";
import {
  Building2,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Layers,
  Clock,
  Laptop,
  Car,
  Bell,
  Cpu,
} from "lucide-react";

export default function HomePage() {
  const { currentUser, role, isAdmin } = useUserRole();
  const { showToast } = useNotification();

  const handleTestToast = () => {
    showToast({
      type: "success",
      title: "Notification System Working!",
      message: "Toasts automatically stack and auto-dismiss after 4 seconds.",
    });
  };

  return (
    <div className="flex-1 w-full">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/30 dark:from-zinc-950 dark:via-zinc-900/40 dark:to-zinc-950 py-16 sm:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] dark:opacity-[0.12] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Enterprise Resource Platform</span>
              <span className="text-emerald-400 dark:text-emerald-600">•</span>
              <span className="font-normal">Unified Facility & Asset Scheduling</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-white leading-[1.12]">
              Coordinating Shared Resources with{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500">
                Zero Friction
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
              A centralized, conflict-free reservation platform for meeting rooms, lab equipment,
              workstations, and company vehicles. Built with Next.js App Router, TypeScript, and PostgreSQL.
            </p>

            {/* CTA Buttons */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/schedule"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <CalendarDays className="w-4 h-4" />
                <span>View Timeline Schedule</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>

              <button
                onClick={handleTestToast}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 font-medium text-sm transition-all"
              >
                <Bell className="w-4 h-4 text-emerald-500" />
                <span>Test Notification Toast</span>
              </button>
            </div>

            {/* Active User Context Banner */}
            <div className="mt-8 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                    isAdmin ? "bg-purple-600" : "bg-emerald-600"
                  }`}
                >
                  {currentUser.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Active User: {currentUser.name}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isAdmin
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300"
                          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300"
                      }`}
                    >
                      {role}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Department: {currentUser.department} • Click &ldquo;Switch&rdquo; in the header anytime to test Admin or Member mode.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Architected for Operational Integrity
          </h2>
          <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Engineered to address scheduling confusion, overlapping bookings, and lack of visibility.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-5">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Zero-Conflict Booking Engine
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Atomic database transactions guarantee no two reservations can overlap on the same resource. Includes turnaround buffer times.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 flex items-center justify-center text-teal-600 dark:text-teal-400 mb-5">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Multi-Resource Catalog
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Organized categories for Meeting Spaces, Testing Hardware, Workstation Pods, and Company Vehicles with live availability badges.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400 mb-5">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
              Dual-Role Governance
            </h3>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Administrators have full approval queues, maintenance mode toggles, and usage insights, while members enjoy streamlined 1-click booking.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
