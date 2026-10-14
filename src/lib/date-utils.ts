/**
 * SyncSpace Date and Timezone Standardization Utility
 *
 * All dates in PostgreSQL are stored in ISO 8601 UTC.
 * This utility standardizes:
 * 1. UTC conversions and ISO string persistence.
 * 2. Client-side local timezone detection and offset calculations.
 * 3. Consistent, localized rendering across all interfaces without hydration mismatches.
 * 4. Safe day boundary parsing that prevents UTC off-by-one errors across timezones.
 */

export interface TimezoneInfo {
  timeZone: string;
  offsetMinutes: number;
  offsetString: string;
  label: string;
}

/**
 * Returns the detected local timezone IANA identifier.
 * Safe for both server (falls back to UTC) and client execution.
 */
export function getClientTimezone(): string {
  if (typeof window !== 'undefined' && typeof Intl !== 'undefined') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }
  return 'UTC';
}

/**
 * Returns the client's current timezone offset in minutes from UTC.
 * Note: JavaScript getTimezoneOffset returns positive for west of UTC, negative for east.
 * e.g., Colombo (UTC+5:30) returns -330, New York (UTC-4) returns 240.
 */
export function getClientTimezoneOffset(): number {
  if (typeof window !== 'undefined') {
    return new Date().getTimezoneOffset();
  }
  return 0;
}

/**
 * Formats a timezone offset in minutes into GMT format (e.g., "GMT+05:30", "GMT-04:00", "GMT+00:00").
 */
export function formatOffsetString(offsetMinutes: number): string {
  // Invert sign because getTimezoneOffset() is negative for positive UTC offsets
  const totalMinutes = -offsetMinutes;
  const sign = totalMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(totalMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `GMT${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Retrieves comprehensive timezone details for display in badges and tooltips.
 */
export function getTimezoneInfo(timeZone?: string): TimezoneInfo {
  const tz = timeZone || getClientTimezone();
  let offsetMinutes = 0;
  if (typeof window !== 'undefined') {
    offsetMinutes = new Date().getTimezoneOffset();
  }
  const offsetString = formatOffsetString(offsetMinutes);
  return {
    timeZone: tz,
    offsetMinutes,
    offsetString,
    label: `${tz} (${offsetString})`,
  };
}

/**
 * Converts any valid date input (Date object, timestamp number, or ISO string)
 * into a verified ISO 8601 UTC string for storage in PostgreSQL.
 */
export function toUTCISOString(date: Date | string | number): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error(`Invalid date provided to toUTCISOString: ${date}`);
  }
  return d.toISOString();
}

/**
 * Parses a "YYYY-MM-DD" date string and client timezone offset into a strictly bounded 24-hour UTC window.
 * Avoids the default JavaScript Date("YYYY-MM-DD") UTC midnight trap where dates shift by one day
 * depending on runtime local timezone.
 *
 * @param dateStr Date in "YYYY-MM-DD" or ISO string format
 * @param clientOffsetMinutes Optional client timezone offset in minutes (from Date.getTimezoneOffset())
 * @returns { start: Date, end: Date } Strictly bounded UTC dates representing 00:00:00 to 23:59:59.999 in that day
 */
export function parseLocalDateBoundary(
  dateStr: string,
  clientOffsetMinutes?: number
): { start: Date; end: Date; year: number; month: number; day: number } {
  // Extract year, month, day components
  let year: number;
  let month: number;
  let day: number;

  if (dateStr.includes('-')) {
    const parts = dateStr.slice(0, 10).split('-').map(Number);
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    const parsed = new Date(dateStr);
    year = parsed.getFullYear();
    month = parsed.getMonth() + 1;
    day = parsed.getDate();
  }

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    const fallback = new Date();
    year = fallback.getFullYear();
    month = fallback.getMonth() + 1;
    day = fallback.getDate();
  }

  if (clientOffsetMinutes !== undefined) {
    // Client timezone offset provided: calculate exact UTC moment of local midnight
    // localMidnightUTC = UTC midnight + clientOffsetMinutes * 60 * 1000
    const localMidnightUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + (clientOffsetMinutes * 60 * 1000);
    const start = new Date(localMidnightUtcMs);
    const end = new Date(localMidnightUtcMs + 24 * 60 * 60 * 1000 - 1);
    return { start, end, year, month, day };
  }

  // Fallback to runtime local boundaries
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start, end, year, month, day };
}

/**
 * Formats a date into a localized time string (e.g., "9:30 AM", "02:15 PM").
 */
export function formatLocalTime(
  date: Date | string | number,
  timeZone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Time';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Formats a date into a localized date string (e.g., "Oct 14, 2026", "Wednesday, Oct 14").
 */
export function formatLocalDate(
  date: Date | string | number,
  timeZone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {}),
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Formats a date into a combined date and time string (e.g., "Oct 14, 2026, 9:30 AM").
 */
export function formatLocalDateTime(
  date: Date | string | number,
  timeZone?: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(timeZone ? { timeZone } : {}),
    ...options,
  };

  return new Intl.DateTimeFormat('en-US', defaultOptions).format(d);
}

/**
 * Formats a start and end time pair into a clean localized time range (e.g., "9:30 AM - 11:00 AM").
 */
export function formatLocalTimeRange(
  start: Date | string | number,
  end: Date | string | number,
  timeZone?: string
): string {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 'Invalid Time Range';

  const startFormatted = formatLocalTime(s, timeZone);
  const endFormatted = formatLocalTime(e, timeZone);

  return `${startFormatted} - ${endFormatted}`;
}

/**
 * Comprehensive range formatter returning date, time range, duration string, and timezone badge info.
 */
export function formatLocalDateTimeRange(
  start: Date | string | number,
  end: Date | string | number,
  timeZone?: string
): {
  dateStr: string;
  timeStr: string;
  durationLabel: string;
  durationMinutes: number;
} {
  const s = start instanceof Date ? start : new Date(start);
  const e = end instanceof Date ? end : new Date(end);

  if (isNaN(s.getTime()) || isNaN(e.getTime())) {
    return {
      dateStr: 'Invalid Date',
      timeStr: 'Invalid Time',
      durationLabel: 'Invalid Duration',
      durationMinutes: 0,
    };
  }

  const dateStr = formatLocalDate(s, timeZone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = formatLocalTimeRange(s, e, timeZone);

  const durationMinutes = Math.max(0, Math.round((e.getTime() - s.getTime()) / (60 * 1000)));
  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  let durationLabel = '';
  if (hours > 0 && mins > 0) {
    durationLabel = `${hours} hr ${mins} min`;
  } else if (hours > 0) {
    durationLabel = `${hours} hr${hours > 1 ? 's' : ''}`;
  } else {
    durationLabel = `${mins} min`;
  }

  return {
    dateStr,
    timeStr,
    durationLabel,
    durationMinutes,
  };
}

/**
 * Formats a date with explicit timezone label for full auditability and admin confirmation.
 * e.g., "Oct 14, 2026, 09:30 AM (Asia/Colombo, GMT+05:30)"
 */
export function formatFullWithTimezone(
  date: Date | string | number,
  timeZone?: string
): string {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return 'Invalid Date';

  const tzInfo = getTimezoneInfo(timeZone);
  const formatted = formatLocalDateTime(d, tzInfo.timeZone);

  return `${formatted} (${tzInfo.timeZone}, ${tzInfo.offsetString})`;
}
