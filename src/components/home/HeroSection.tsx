'use client';

import React from 'react';
import Link from 'next/link';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';
import {
  CalendarDays,
  Sparkles,
  ArrowRight,
  Layers,
  Bell,
  ArrowDown,
} from 'lucide-react';

export function HeroSection() {
  const { currentUser, role, isAdmin } = useUserRole();
  const { showToast } = useNotification();

  const handleTestToast = () => {
    showToast({
      type: 'success',
      title: 'Notification System Working',
      message: 'Toasts automatically stack and auto-dismiss after 4 seconds.',
    });
  };

  const scrollToCatalog = () => {
    const el = document.getElementById('catalog-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-zinc-200/80 dark:border-zinc-800 bg-gradient-to-b from-white via-slate-50/50 to-slate-100/30 dark:from-zinc-950 dark:via-zinc-900/40 dark:to-zinc-950 py-14 sm:py-20">
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
            Coordinating Shared Resources with{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500">
              Zero Friction
            </span>
          </h1>

          <p className="mt-5 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
            A centralized, conflict-free reservation platform for meeting rooms, lab equipment,
            workstations, and company vehicles. Built with Next.js App Router, TypeScript, and PostgreSQL.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              onClick={scrollToCatalog}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <Layers className="w-4 h-4" />
              <span>Browse Catalog</span>
              <ArrowDown className="w-4 h-4 ml-0.5" />
            </button>

            <Link
              href="/schedule"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 font-semibold text-sm transition-all shadow-xs"
            >
              <CalendarDays className="w-4 h-4 text-emerald-500" />
              <span>Timeline Schedule</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </Link>

            <button
              onClick={handleTestToast}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 text-xs font-medium transition-colors"
            >
              <Bell className="w-3.5 h-3.5 text-zinc-400" />
              <span>Test Toast</span>
            </button>
          </div>

          {/* Active User Context Banner */}
          <div className="mt-8 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white ${
                  isAdmin ? 'bg-purple-600' : 'bg-emerald-600'
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
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300'
                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300'
                    }`}
                  >
                    {role}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Department: {currentUser.department} • Click &ldquo;Switch&rdquo; in the header anytime to toggle Admin or Member view.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
