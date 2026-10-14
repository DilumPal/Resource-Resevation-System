import React from 'react';
import { getMasterCalendarData } from '@/actions/reservations';
import { MasterCalendar } from '@/components/admin/MasterCalendar';
import { CalendarDays, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Master Scheduling Matrix — SyncSpace Admin',
  description: 'Enterprise cross-resource timeline matrix, live slot allocations, and fleet scheduling calendar.',
};

interface CalendarPageProps {
  searchParams: Promise<{
    date?: string;
    categoryId?: string;
  }>;
}

export default async function AdminCalendarPage({ searchParams }: CalendarPageProps) {
  const { date, categoryId } = await searchParams;

  const calendarData = await getMasterCalendarData(date, categoryId);

  if (!calendarData.success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Failed to Load Master Calendar
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          {calendarData.error || 'Could not retrieve cross-resource timeline data.'}
        </p>
        <div className="mt-6">
          <Link
            href="/admin/calendar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Retry Calendar Load</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <MasterCalendar
        initialDate={calendarData.date}
        resources={calendarData.resources as any}
        reservations={calendarData.reservations as any}
        maintenanceLogs={calendarData.maintenanceLogs as any}
        categories={calendarData.categories}
        metrics={calendarData.metrics}
      />
    </div>
  );
}
