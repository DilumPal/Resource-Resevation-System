import React from 'react';
import { getResources, getCategories } from '@/actions/resources';
import { VisualSchedule } from '@/components/schedule/VisualSchedule';
import { CalendarDays, Layers } from 'lucide-react';
import { ResourceData } from '@/components/resources/ResourceCard';

export const dynamic = 'force-dynamic';

interface SchedulePageProps {
  searchParams: Promise<{
    resourceId?: string;
    date?: string;
    view?: 'day' | 'week';
  }>;
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const { resourceId, date, view } = await searchParams;

  const [resourcesRes, categoriesRes] = await Promise.all([
    getResources(),
    getCategories(),
  ]);

  const resources = resourcesRes.success
    ? (resourcesRes.resources as unknown as ResourceData[])
    : [];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
            <CalendarDays className="w-4 h-4" />
            <span>Interactive Timeline Schedule</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Resource Timeline & Slot Grid
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Inspect live booked allocations, turnaround cleaning buffers, and reserved slots across daily and weekly horizons.
          </p>
        </div>
      </div>

      {/* Visual Timeline Component */}
      <VisualSchedule
        resources={resources}
        initialResourceId={resourceId}
        initialDate={date}
        initialView={view}
      />
    </div>
  );
}
