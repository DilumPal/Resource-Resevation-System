'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Layers,
  Building2,
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  Check,
  Sparkles,
  Image as ImageIcon,
  AlertTriangle,
  FileText,
} from 'lucide-react';
import { ResourceStatus } from '@prisma/client';
import { ResourceData, getCategoryIcon } from '../resources/ResourceCard';
import { createResource, updateResource } from '@/actions/resources';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  iconName: string;
}

interface ResourceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceToEdit?: ResourceData | null;
  categories: CategoryItem[];
  onSuccess: () => void;
}

// Curated stock photos for each category to help administrators populate realistic photos
const PRESET_IMAGES: Record<string, string[]> = {
  'meeting-spaces': [
    'https://images.unsplash.com/photo-1517502884422-41eaead166d4?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80',
  ],
  'workstations-pods': [
    'https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80',
  ],
  'lab-hardware': [
    'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=800&q=80',
  ],
  'company-vehicles': [
    'https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1559297434-fae8a1916a79?auto=format&fit=crop&w=800&q=80',
  ],
};

export function ResourceFormModal({
  isOpen,
  onClose,
  resourceToEdit,
  categories,
  onSuccess,
}: ResourceFormModalProps) {
  const { currentUser } = useUserRole();
  const { showToast } = useNotification();

  const isEditMode = !!resourceToEdit;

  // Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [location, setLocation] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [status, setStatus] = useState<ResourceStatus>(ResourceStatus.AVAILABLE);
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form when resourceToEdit changes
  useEffect(() => {
    if (resourceToEdit) {
      setName(resourceToEdit.name);
      setCode(resourceToEdit.code);
      setCategoryId(resourceToEdit.categoryId);
      setLocation(resourceToEdit.location);
      setCapacity(resourceToEdit.capacity);
      setBufferMinutes(resourceToEdit.bufferMinutes || 0);
      setRequiresApproval(resourceToEdit.requiresApproval || false);
      setStatus(resourceToEdit.status);
      setImageUrl(resourceToEdit.imageUrl || '');
      setDescription(resourceToEdit.description);
    } else {
      setName('');
      setCode('');
      setCategoryId(categories[0]?.id || '');
      setLocation('');
      setCapacity(4);
      setBufferMinutes(15);
      setRequiresApproval(false);
      setStatus(ResourceStatus.AVAILABLE);
      setImageUrl('');
      setDescription('');
    }
    setErrorMessage(null);
  }, [resourceToEdit, categories, isOpen]);

  // Selected Category
  const activeCategory = categories.find((c) => c.id === categoryId) || categories[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!name.trim() || !code.trim() || !categoryId || !location.trim() || !description.trim()) {
      setErrorMessage('Please fill in all required asset fields.');
      return;
    }

    if (capacity < 1) {
      setErrorMessage('Capacity must be at least 1 person.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && resourceToEdit) {
        const res = await updateResource(
          resourceToEdit.id,
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            categoryId,
            location: location.trim(),
            capacity: Number(capacity),
            bufferMinutes: Number(bufferMinutes),
            requiresApproval,
            status,
            imageUrl: imageUrl.trim() || null,
            description: description.trim(),
          },
          currentUser.id
        );

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Resource Updated',
            message: `Resource "${name}" was updated successfully.`,
          });
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || 'Failed to update resource.');
        }
      } else {
        const res = await createResource(
          {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            categoryId,
            location: location.trim(),
            capacity: Number(capacity),
            bufferMinutes: Number(bufferMinutes),
            requiresApproval,
            status,
            imageUrl: imageUrl.trim() || null,
            description: description.trim(),
          },
          currentUser.id
        );

        if (res.success) {
          showToast({
            type: 'success',
            title: 'Resource Created',
            message: `Resource "${name}" has been registered in the catalog.`,
          });
          onSuccess();
          onClose();
        } else {
          setErrorMessage(res.error || 'Failed to create resource.');
        }
      }
    } catch (err) {
      console.error('Error saving resource:', err);
      setErrorMessage('An unexpected error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl my-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {isEditMode ? `Edit Resource: ${resourceToEdit.name}` : 'Register New Resource'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isEditMode
                  ? 'Update operational specs, rules, and turnover buffers.'
                  : 'Add a new shared facility, equipment, or fleet asset to SyncSpace.'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Name & Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Resource Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Boardroom Gamma, GPU Server #3"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Asset Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CR-03, LAB-02"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-mono font-bold text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs uppercase"
              />
            </div>
          </div>

          {/* Row 2: Category & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Operational Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ResourceStatus)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer"
              >
                <option value={ResourceStatus.AVAILABLE}>Operational (Available)</option>
                <option value={ResourceStatus.MAINTENANCE}>Maintenance (Out of Service)</option>
                <option value={ResourceStatus.RETIRED}>Archived / Retired</option>
              </select>
            </div>
          </div>

          {/* Row 3: Location, Capacity, Buffer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Location / Floor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Floor 2, East Wing"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Capacity (People) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={500}
                required
                value={capacity}
                onChange={(e) => setCapacity(parseInt(e.target.value, 10) || 1)}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Turnaround Buffer
              </label>
              <select
                value={bufferMinutes}
                onChange={(e) => setBufferMinutes(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs cursor-pointer"
              >
                <option value={0}>0 min (Instant turnaround)</option>
                <option value={10}>10 min buffer</option>
                <option value={15}>15 min buffer (Standard)</option>
                <option value={20}>20 min buffer</option>
                <option value={30}>30 min buffer</option>
                <option value={45}>45 min buffer</option>
                <option value={60}>60 min buffer (Deep clean)</option>
              </select>
            </div>
          </div>

          {/* Row 4: Approval Policy Checkbox */}
          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-start gap-3">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="mt-0.5 rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
            <label htmlFor="requiresApproval" className="text-xs cursor-pointer">
              <span className="font-bold text-zinc-900 dark:text-white block">
                Require Administrator Approval
              </span>
              <span className="text-zinc-500 dark:text-zinc-400 block mt-0.5">
                When enabled, member booking submissions enter the review queue in Pending status
                instead of auto-confirming.
              </span>
            </label>
          </div>

          {/* Row 5: Image URL & Presets */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Image URL (Optional)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/photo-..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs"
            />

            {/* Preset Image Shortcuts */}
            {activeCategory && PRESET_IMAGES[activeCategory.slug] && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-zinc-400">Sample Photos:</span>
                {PRESET_IMAGES[activeCategory.slug].map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImageUrl(img)}
                    className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Photo {idx + 1}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Row 6: Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description & Amenities <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe equipment specifications, screen configurations, video conferencing gear, or special amenities..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-xs resize-none"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-3.5 h-3.5" />
              )}
              <span>{isEditMode ? 'Save Changes' : 'Register Resource'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
