'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Wrench,
  Clock,
  User,
  FileText,
  AlertTriangle,
  Check,
  ShieldAlert,
  Calendar,
  Sparkles,
} from 'lucide-react';
import { ResourceStatus } from '@prisma/client';
import { ResourceData } from '../resources/ResourceCard';
import { toggleResourceMaintenance } from '@/actions/resources';
import { useUserRole } from '@/context/UserRoleContext';
import { useNotification } from '@/context/NotificationContext';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  resource: ResourceData | null;
  onSuccess: () => void;
}

const PRESET_REASONS = [
  'Routine Inspection & Diagnostics',
  'HVAC & Climate Control Servicing',
  'Hardware Diagnostic & Repair',
  'Deep Cleaning & Sanitization',
  'Firmware & Operating System Upgrade',
  'Emergency Equipment Servicing',
];

export function MaintenanceModal({
  isOpen,
  onClose,
  resource,
  onSuccess,
}: MaintenanceModalProps) {
  const { currentUser } = useUserRole();
  const { showToast } = useNotification();

  // Helper to format Date to YYYY-MM-DDTHH:mm for datetime-local input
  const formatDatetimeLocal = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [performedBy, setPerformedBy] = useState('Internal Facilities Team');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize or reset form when resource changes
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      setStartTime(formatDatetimeLocal(now));

      // Default estimated return time: 4 hours from now
      const defaultEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000);
      setEndTime(formatDatetimeLocal(defaultEnd));

      setReason('');
      setPerformedBy('Internal Facilities Team');
      setNotes('');
      setErrorMessage(null);
    }
  }, [isOpen, resource]);

  // Duration shortcuts
  const handleSetDurationHours = (hours: number) => {
    const base = startTime ? new Date(startTime) : new Date();
    const target = new Date(base.getTime() + hours * 60 * 60 * 1000);
    setEndTime(formatDatetimeLocal(target));
  };

  const handleSetIndefinite = () => {
    setEndTime('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resource) return;

    setErrorMessage(null);

    if (!reason.trim() || reason.trim().length < 3) {
      setErrorMessage('Please provide a valid maintenance reason (minimum 3 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await toggleResourceMaintenance(
        resource.id,
        ResourceStatus.MAINTENANCE,
        {
          reason: reason.trim(),
          startTime: startTime ? new Date(startTime) : new Date(),
          endTime: endTime ? new Date(endTime) : null,
          performedBy: performedBy.trim() || 'Internal Facilities Team',
          notes: notes.trim() || null,
        },
        currentUser.id
      );

      if (res.success) {
        showToast({
          type: 'warning',
          title: 'Maintenance Mode Activated',
          message: `Resource "${resource.name}" has been placed into maintenance mode.`,
        });
        onSuccess();
        onClose();
      } else {
        setErrorMessage(res.error || 'Failed to place resource in maintenance mode.');
      }
    } catch (err) {
      console.error('Error placing resource in maintenance:', err);
      setErrorMessage('An unexpected error occurred while saving maintenance details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !resource) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl my-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Wrench className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                Place in Maintenance Mode
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Take asset out of service and record operational maintenance details.
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
          {/* Resource Summary Card */}
          <div className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-zinc-900 dark:text-white">
                  {resource.name}
                </span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {resource.code}
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {resource.location} &bull; {resource.category.name}
              </p>
            </div>

            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Currently Operational
            </span>
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Operational Warning Callout */}
          <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold block">Downtime Scheduling Effect</span>
              <span className="text-[11px] text-amber-800 dark:text-amber-300/90 block mt-0.5">
                This asset will be immediately flagged as Out of Service across the catalog. The
                conflict engine will automatically block new bookings from overlapping with this
                maintenance window.
              </span>
            </div>
          </div>

          {/* Field 1: Reason */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Maintenance Reason <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. HVAC system servicing and sensor recalibration"
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
            />

            {/* Quick Reason Presets */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReason(p)}
                  className="px-2 py-1 rounded-lg text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Field 2: Downtime Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Estimated End Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs cursor-pointer"
              />
            </div>
          </div>

          {/* Quick End-Time Shortcuts */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-zinc-400">Quick Duration:</span>
            <button
              type="button"
              onClick={() => handleSetDurationHours(2)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              +2 Hours
            </button>
            <button
              type="button"
              onClick={() => handleSetDurationHours(4)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              +4 Hours
            </button>
            <button
              type="button"
              onClick={() => handleSetDurationHours(24)}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              +1 Day
            </button>
            <button
              type="button"
              onClick={handleSetIndefinite}
              className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              Indefinite / TBD
            </button>
          </div>

          {/* Field 3: Performed By */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Assigned Technician / Vendor
            </label>
            <input
              type="text"
              value={performedBy}
              onChange={(e) => setPerformedBy(e.target.value)}
              placeholder="e.g. Internal Facilities Team, Acme HVAC Services"
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs"
            />
          </div>

          {/* Field 4: Notes */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Operational Notes &amp; Instructions
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes regarding parts on order, safety instructions, or contact details..."
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 shadow-xs resize-none"
            />
          </div>

          {/* Actions */}
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
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Wrench className="w-3.5 h-3.5" />
              )}
              <span>Place in Maintenance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
