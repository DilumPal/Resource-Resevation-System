import React from "react";
import { ShieldCheck, Database, CalendarCheck2, Clock } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                SyncSpace Platform
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                Resource Reservation Management System
              </span>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
              Enterprise Shared Facility & Asset Reservation Solution
            </p>
          </div>

          {/* System status pills */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-medium text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Zero-Conflict Engine</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-medium text-[11px]">
              <Database className="w-3 h-3 text-blue-500" />
              <span>PostgreSQL & Prisma</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium text-[11px]">
              <Clock className="w-3 h-3 text-zinc-400" />
              <span>UTC+05:30 Compatible</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
