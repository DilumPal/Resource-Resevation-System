'use client';

import React, { useState, useEffect } from 'react';
import { Globe, Clock, ShieldCheck, Info } from 'lucide-react';
import { getTimezoneInfo, TimezoneInfo } from '@/lib/date-utils';

interface TimezoneBadgeProps {
  className?: string;
  variant?: 'compact' | 'detailed' | 'pill';
  showUtcNotice?: boolean;
}

export function TimezoneBadge({
  className = '',
  variant = 'compact',
  showUtcNotice = true,
}: TimezoneBadgeProps) {
  const [mounted, setMounted] = useState(false);
  const [info, setInfo] = useState<TimezoneInfo>({
    timeZone: 'UTC',
    offsetMinutes: 0,
    offsetString: 'GMT+00:00',
    label: 'UTC (GMT+00:00)',
  });

  useEffect(() => {
    setMounted(true);
    setInfo(getTimezoneInfo());
  }, []);

  if (!mounted) {
    // Render static placeholder matching SSR dimensions to prevent layout shift
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800/70 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60 animate-pulse ${className}`}
      >
        <Globe className="w-3 h-3 text-zinc-400" />
        <span>Detecting local timezone...</span>
      </div>
    );
  }

  if (variant === 'pill') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 ${className}`}
        title={`Times displayed in ${info.timeZone} (${info.offsetString}). Persisted in UTC.`}
      >
        <Globe className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="font-semibold text-zinc-700 dark:text-zinc-200">{info.timeZone}</span>
        <span className="text-zinc-400 dark:text-zinc-500">{info.offsetString}</span>
      </div>
    );
  }

  if (variant === 'detailed') {
    return (
      <div
        className={`p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-between gap-3 text-xs ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                Local Timezone: {info.timeZone}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                {info.offsetString}
              </span>
            </div>
            {showUtcNotice && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                All schedules displayed in your local time and synchronized as UTC in PostgreSQL.
              </p>
            )}
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>UTC Synchronized</span>
        </div>
      </div>
    );
  }

  // Default: Compact badge
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-50 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 ${className}`}
      title={`All schedule slots are displayed in ${info.timeZone} (${info.offsetString}). Database stores standard UTC.`}
    >
      <Globe className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="truncate max-w-[150px] sm:max-w-none text-zinc-800 dark:text-zinc-200 font-medium">
        {info.timeZone}
      </span>
      <span className="text-[11px] text-zinc-400 dark:text-zinc-500 border-l border-zinc-200 dark:border-zinc-700 pl-1.5">
        {info.offsetString}
      </span>
      {showUtcNotice && (
        <span className="hidden md:inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-200 dark:border-emerald-800/60">
          UTC Store
        </span>
      )}
    </div>
  );
}
