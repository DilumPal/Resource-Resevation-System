'use client';

import React from 'react';
import {
  Search,
  X,
  Building2,
  Laptop,
  Cpu,
  Car,
  Layers,
  Filter,
  Users,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';

export interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  iconName: string;
  _count?: {
    resources: number;
  };
}

export type CapacityFilter = 'ALL' | '1' | '2-4' | '5-15' | '16+';
export type AvailabilityFilter = 'ALL' | 'AVAILABLE_NOW' | 'IN_USE' | 'MAINTENANCE';
export type SortOption = 'DEFAULT' | 'CAPACITY_DESC' | 'CAPACITY_ASC' | 'NAME_ASC';

interface ResourceFiltersProps {
  categories: CategoryOption[];
  selectedCategory: string; // 'all' or categoryId
  onSelectCategory: (categoryId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  capacityFilter: CapacityFilter;
  onCapacityChange: (cap: CapacityFilter) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityChange: (status: AvailabilityFilter) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  filteredCount: number;
  onResetFilters: () => void;
}

export function ResourceFilters({
  categories,
  selectedCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  capacityFilter,
  onCapacityChange,
  availabilityFilter,
  onAvailabilityChange,
  sortBy,
  onSortChange,
  totalCount,
  filteredCount,
  onResetFilters,
}: ResourceFiltersProps) {
  const isFiltered =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    capacityFilter !== 'ALL' ||
    availabilityFilter !== 'ALL' ||
    sortBy !== 'DEFAULT';

  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Building2':
        return <Building2 className="w-3.5 h-3.5" />;
      case 'Laptop':
        return <Laptop className="w-3.5 h-3.5" />;
      case 'Cpu':
        return <Cpu className="w-3.5 h-3.5" />;
      case 'Car':
        return <Car className="w-3.5 h-3.5" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, code (e.g. CR-01), location, or amenities..."
            className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
              aria-label="Clear search query"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Capacity Selector */}
        <div className="flex items-center gap-2">
          <div className="relative shrink-0">
            <select
              value={capacityFilter}
              onChange={(e) => onCapacityChange(e.target.value as CapacityFilter)}
              aria-label="Filter by capacity"
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">Any Capacity</option>
              <option value="1">1 Person (Solo)</option>
              <option value="2-4">2 - 4 People (Small Team)</option>
              <option value="5-15">5 - 15 People (Medium Team)</option>
              <option value="16+">16+ People (Large Group)</option>
            </select>
            <Users className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Availability Status Selector */}
          <div className="relative shrink-0">
            <select
              value={availabilityFilter}
              onChange={(e) => onAvailabilityChange(e.target.value as AvailabilityFilter)}
              aria-label="Filter by availability status"
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE_NOW">Available Now</option>
              <option value="IN_USE">Currently In Use</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="relative shrink-0">
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              aria-label="Sort resources"
              className="appearance-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 pr-8 text-xs font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer shadow-xs"
            >
              <option value="DEFAULT">Recommended</option>
              <option value="CAPACITY_DESC">Capacity (High to Low)</option>
              <option value="CAPACITY_ASC">Capacity (Low to High)</option>
              <option value="NAME_ASC">Name (A to Z)</option>
            </select>
            <Filter className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Category Pills Bar */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 pt-1 no-scrollbar">
        <div className="flex items-center gap-1.5 shrink-0">
          {/* All Categories Pill */}
          <button
            onClick={() => onSelectCategory('all')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Categories</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                selectedCategory === 'all'
                  ? 'bg-emerald-700 text-emerald-100'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Individual Category Pills */}
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/60'
                }`}
              >
                {getCategoryIcon(cat.iconName)}
                <span>{cat.name}</span>
                {cat._count?.resources !== undefined && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                      isSelected
                        ? 'bg-emerald-700 text-emerald-100'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {cat._count.resources}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Reset Filters CTA if active */}
        {isFiltered && (
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:underline shrink-0 px-2 py-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Results Count & Active Filter Summary */}
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-800/60">
        <div>
          <span>
            Showing <strong className="text-zinc-900 dark:text-zinc-100">{filteredCount}</strong> of{' '}
            {totalCount} resources
          </span>
          {searchQuery && (
            <span>
              {' '}
              matching &ldquo;<span className="text-zinc-700 dark:text-zinc-300 font-medium">{searchQuery}</span>&rdquo;
            </span>
          )}
        </div>

        {isFiltered && (
          <div className="text-[11px] text-zinc-400">
            Filters applied
          </div>
        )}
      </div>
    </div>
  );
}
