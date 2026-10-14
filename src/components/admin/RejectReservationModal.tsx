'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  XCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  User,
  Sparkles,
  FileText,
  Check,
} from 'lucide-react';
import { ReservationStatus } from '@prisma/client';

export interface RejectModalItem {
  id: string;
  title: string;
  purpose?: string | null;
  startTime: Date | string;
  endTime: Date | string;
  resource: {
    id: string;
    name: string;
    code: string;
    location?: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
    department?: string | null;
  };
}

interface RejectReservationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservation: RejectModalItem | null;
  onConfirmReject: (reservationId: string, reason: string) => Promise<void>;
}

const PRESET_REASONS = [
  'Schedule conflict with an organizational executive event',
  'Resource is scheduled for urgent maintenance and inspection',
  'Booking duration exceeds maximum department allocation policy',
  'Insufficient business justification provided for high-demand asset',
  'Alternative standard resource is recommended for this activity',
];

export function RejectReservationModal({
  isOpen,
  onClose,
  reservation,
  onConfirmReject,
}: RejectReservationModalProps) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, reservation]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen || !reservation) return null;

  const start = new Date(reservation.startTime);
  const end = new Date(reservation.endTime);

  const formattedDate = start.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = `${start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('A feedback note explaining the rejection reason is required.');
      return;
    }
    if (trimmed.length < 5) {
      setError('Please provide a more descriptive reason (at least 5 characters).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onConfirmReject(reservation.id, trimmed);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject reservation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-2xl border border-zinc-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-2xl overflow-hidden transition-all transform animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reject-modal-title"
      >
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400 shrink-0">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="reject-modal-title"
                className="text-base font-bold text-zinc-900 dark:text-white"
              >
                Decline Reservation Request
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Provide feedback so the requester understands why this reservation cannot be approved.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Context Summary Card */}
          <div className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-800/40 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-zinc-900 dark:text-white">
                  {reservation.resource.name}
                </span>
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                  {reservation.resource.code}
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {reservation.user.name} ({reservation.user.department || 'Member'})
              </span>
            </div>

            <div className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
              &quot;{reservation.title}&quot;
            </div>

            <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedTime}</span>
              </div>
            </div>

            {reservation.purpose && (
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic pt-1">
                Requester Note: &quot;{reservation.purpose}&quot;
              </p>
            )}
          </div>

          {/* Quick Preset Reasons */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              <span>Quick Preset Reasons</span>
              <span className="text-[10px] text-zinc-400 font-normal">Click to populate</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_REASONS.map((preset, index) => {
                const isSelected = reason === preset;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setReason(preset);
                      setError(null);
                    }}
                    className={`text-left text-[11px] px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-medium'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {preset}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Feedback Note Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="rejection-reason"
                className="block text-xs font-bold text-zinc-900 dark:text-white"
              >
                Feedback Note to Requester <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] text-zinc-400">
                {reason.length} / 500 characters
              </span>
            </div>

            <textarea
              id="rejection-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              maxLength={500}
              placeholder="Explain why this request is being declined so the requester can adjust timing or choose another resource..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-900 dark:text-white placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all resize-none"
              disabled={isSubmitting}
            />

            {error && (
              <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 pt-0.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-rose-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording Rejection...' : 'Confirm Rejection'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
