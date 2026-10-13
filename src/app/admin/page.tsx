import React from 'react';
import { getAdminDashboardStats, getResources, getCategories } from '@/actions/resources';
import { AdminDashboard, AdminStatsData } from '@/components/admin/AdminDashboard';
import { ResourceData } from '@/components/resources/ResourceCard';
import { CategoryItem } from '@/components/admin/ResourceFormModal';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Operations Hub & Analytics — SyncSpace',
  description: 'Enterprise operations, resource demand intelligence, and utilization analytics for administrators.',
};

export default async function AdminPage() {
  const [statsResult, resourcesResult, categoriesResult] = await Promise.all([
    getAdminDashboardStats(),
    getResources(),
    getCategories(),
  ]);

  if (!statsResult.success) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto mb-4">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Failed to Load Administration Telemetry
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
          {statsResult.error || 'An error occurred while calculating operational metrics.'}
        </p>
        <div className="mt-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Retry Telemetry Load</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AdminDashboard
      initialData={statsResult as unknown as AdminStatsData}
      initialResources={(resourcesResult.resources || []) as unknown as ResourceData[]}
      categories={(categoriesResult.categories || []) as CategoryItem[]}
    />
  );
}

