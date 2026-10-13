import React from 'react';
import { getResources, getCategories } from '@/actions/resources';
import { HeroSection } from '@/components/home/HeroSection';
import { ResourceCatalog } from '@/components/resources/ResourceCatalog';
import { CheckCircle2, Layers, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [resourcesResult, categoriesResult] = await Promise.all([
    getResources(),
    getCategories(),
  ]);

  const resources = resourcesResult.success ? resourcesResult.resources : [];
  const categories = categoriesResult.success ? categoriesResult.categories : [];

  return (
    <div className="flex-1 w-full flex flex-col">
      {/* Interactive Hero Banner with Role Switcher */}
      <HeroSection />

      {/* Main Interactive Resource Catalog: Search, Filters, Live Availability Badges */}
      <ResourceCatalog
        initialResources={resources}
        initialCategories={categories}
      />

      {/* Feature Pillars */}
      <section className="py-16 border-t border-zinc-200/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
        </div>
      </section>
    </div>
  );
}
