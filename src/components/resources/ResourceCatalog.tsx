'use client';

import React, { useState, useMemo } from 'react';
import {
  ResourceCard,
  ResourceData,
  getLiveStatus,
} from './ResourceCard';
import {
  ResourceFilters,
  CategoryOption,
  CapacityFilter,
  AvailabilityFilter,
  SortOption,
} from './ResourceFilters';
import {
  Layers,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface ResourceCatalogProps {
  initialResources: ResourceData[];
  initialCategories: CategoryOption[];
  onBookResource?: (resource: ResourceData) => void;
}

export function ResourceCatalog({
  initialResources,
  initialCategories,
  onBookResource,
}: ResourceCatalogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [capacityFilter, setCapacityFilter] = useState<CapacityFilter>('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState<AvailabilityFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DEFAULT');

  // Handle resetting all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setCapacityFilter('ALL');
    setAvailabilityFilter('ALL');
    setSortBy('DEFAULT');
  };

  // Filter and sort resources in real time
  const filteredResources = useMemo(() => {
    return initialResources
      .filter((resource) => {
        // 1. Category filter
        if (selectedCategory !== 'all' && resource.categoryId !== selectedCategory) {
          return false;
        }

        // 2. Search query filter (matches name, code, location, description)
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase().trim();
          const matchesName = resource.name.toLowerCase().includes(q);
          const matchesCode = resource.code.toLowerCase().includes(q);
          const matchesLocation = resource.location.toLowerCase().includes(q);
          const matchesDesc = resource.description.toLowerCase().includes(q);

          if (!matchesName && !matchesCode && !matchesLocation && !matchesDesc) {
            return false;
          }
        }

        // 3. Capacity filter
        if (capacityFilter !== 'ALL') {
          const cap = resource.capacity;
          if (capacityFilter === '1' && cap !== 1) return false;
          if (capacityFilter === '2-4' && (cap < 2 || cap > 4)) return false;
          if (capacityFilter === '5-15' && (cap < 5 || cap > 15)) return false;
          if (capacityFilter === '16+' && cap < 16) return false;
        }

        // 4. Availability status filter
        if (availabilityFilter !== 'ALL') {
          const live = getLiveStatus(resource).status;
          if (availabilityFilter === 'AVAILABLE_NOW' && live !== 'AVAILABLE_NOW') return false;
          if (availabilityFilter === 'IN_USE' && live !== 'IN_USE' && live !== 'BUFFER') return false;
          if (availabilityFilter === 'MAINTENANCE' && live !== 'MAINTENANCE') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'CAPACITY_DESC') {
          return b.capacity - a.capacity;
        }
        if (sortBy === 'CAPACITY_ASC') {
          return a.capacity - b.capacity;
        }
        if (sortBy === 'NAME_ASC') {
          return a.name.localeCompare(b.name);
        }
        return 0; // Default ordering
      });
  }, [
    initialResources,
    selectedCategory,
    searchQuery,
    capacityFilter,
    availabilityFilter,
    sortBy,
  ]);

  // Real-time metric counts
  const availableNowCount = useMemo(() => {
    return initialResources.filter((r) => getLiveStatus(r).status === 'AVAILABLE_NOW').length;
  }, [initialResources]);

  const maintenanceCount = useMemo(() => {
    return initialResources.filter((r) => r.status === 'MAINTENANCE').length;
  }, [initialResources]);

  return (
    <section id="catalog-section" className="py-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      {/* Header and Quick Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Facility & Equipment Directory</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            Explore Resources
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Browse live availability, inspect amenities, and reserve shared assets across the organization.
          </p>
        </div>

        {/* Live Status Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{availableNowCount} Available Now</span>
          </div>

          {maintenanceCount > 0 && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{maintenanceCount} In Maintenance</span>
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-medium">
            <span>{initialResources.length} Total Registered</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs mb-8">
        <ResourceFilters
          categories={initialCategories}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          capacityFilter={capacityFilter}
          onCapacityChange={setCapacityFilter}
          availabilityFilter={availabilityFilter}
          onAvailabilityChange={setAvailabilityFilter}
          sortBy={sortBy}
          onSortChange={setSortBy}
          totalCount={initialResources.length}
          filteredCount={filteredResources.length}
          onResetFilters={handleResetFilters}
        />
      </div>

      {/* Resource Cards Grid */}
      {filteredResources.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredResources.map((resource) => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onBookClick={(res) => {
                if (onBookResource) {
                  onBookResource(res);
                } else {
                  // Direct navigation to schedule view for this resource
                  window.location.href = `/schedule?resourceId=${res.id}`;
                }
              }}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-16 text-center rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-8">
          <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mx-auto mb-4">
            <Layers className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            No resources match your filters
          </h3>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Try adjusting your search query, selecting a different category, or broadening your capacity range.
          </p>
          <div className="mt-5">
            <button
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/60 shadow-xs transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset all filters</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
