'use client';

import React, { useState, useEffect } from 'react';
import {
  formatLocalDate,
  formatLocalTime,
  formatLocalDateTime,
  formatLocalTimeRange,
  formatFullWithTimezone,
} from '@/lib/date-utils';

interface TimeDisplayProps {
  date: Date | string | number;
  endDate?: Date | string | number;
  mode?: 'time' | 'date' | 'datetime' | 'range' | 'fullRange' | 'fullWithTz';
  className?: string;
  timeZone?: string;
  fallback?: string;
}

export function TimeDisplay({
  date,
  endDate,
  mode = 'datetime',
  className = '',
  timeZone,
  fallback = '—',
}: TimeDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!date) return <span className={className}>{fallback}</span>;

  // Initial SSR render uses UTC to maintain deterministic output
  const effectiveTz = mounted ? timeZone : 'UTC';

  let text = '';
  try {
    switch (mode) {
      case 'time':
        text = formatLocalTime(date, effectiveTz);
        break;
      case 'date':
        text = formatLocalDate(date, effectiveTz);
        break;
      case 'datetime':
        text = formatLocalDateTime(date, effectiveTz);
        break;
      case 'range':
        if (!endDate) {
          text = formatLocalTime(date, effectiveTz);
        } else {
          text = formatLocalTimeRange(date, endDate, effectiveTz);
        }
        break;
      case 'fullRange':
        if (!endDate) {
          text = formatLocalDateTime(date, effectiveTz);
        } else {
          const dStr = formatLocalDate(date, effectiveTz, {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          });
          const tStr = formatLocalTimeRange(date, endDate, effectiveTz);
          text = `${dStr} · ${tStr}`;
        }
        break;
      case 'fullWithTz':
        text = formatFullWithTimezone(date, effectiveTz);
        break;
      default:
        text = formatLocalDateTime(date, effectiveTz);
    }
  } catch {
    text = fallback;
  }

  return (
    <span className={className} suppressHydrationWarning>
      {text}
    </span>
  );
}
