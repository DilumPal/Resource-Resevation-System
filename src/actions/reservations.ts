'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import {
  atomicCheckAndReserve,
  checkReservationConflict,
  BookingConflictError,
  ConflictCheckResult,
} from '@/lib/booking/conflict-engine';
import { ReservationStatus, Role } from '@prisma/client';
import { z } from 'zod';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle calls outside of active Next.js HTTP request context (e.g. automated tests)
  }
}

const CreateReservationSchema = z.object({
  resourceId: z.string().min(1, 'Resource ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  title: z.string().min(3, 'Title must be at least 3 characters').max(120, 'Title cannot exceed 120 characters'),
  purpose: z.string().max(500, 'Purpose cannot exceed 500 characters').optional().nullable(),
  startTime: z.string().or(z.date()),
  endTime: z.string().or(z.date()),
});

export type CreateReservationInput = z.infer<typeof CreateReservationSchema>;

export interface TimeSlot {
  startTime: string; // ISO string
  endTime: string;   // ISO string
  formattedTime: string; // e.g. "09:00 - 09:30"
  available: boolean;
  isPast: boolean;
  reason?: string;
  reservationId?: string;
  reservationTitle?: string;
  isBufferPeriod?: boolean;
}

export interface AvailableSlotsResult {
  success: boolean;
  resource?: {
    id: string;
    name: string;
    code: string;
    location: string;
    capacity: number;
    bufferMinutes: number;
    requiresApproval: boolean;
    status: string;
  };
  date?: string;
  slots: TimeSlot[];
  bookedIntervals: Array<{
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    status: string;
    userName?: string;
  }>;
  maintenanceIntervals: Array<{
    id: string;
    reason: string;
    startTime: string;
    endTime: string | null;
  }>;
  error?: string;
}

/**
 * Calculates available and booked time slots for a specific resource and date.
 * Generates structured 30-minute availability intervals across standard operating hours (08:00 - 20:00).
 */
export async function getAvailableSlots(
  resourceId: string,
  dateStr: string
): Promise<AvailableSlotsResult> {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        name: true,
        code: true,
        location: true,
        capacity: true,
        bufferMinutes: true,
        requiresApproval: true,
        status: true,
      },
    });

    if (!resource) {
      return {
        success: false,
        slots: [],
        bookedIntervals: [],
        maintenanceIntervals: [],
        error: `Resource '${resourceId}' not found.`,
      };
    }

    // Parse target date boundaries (00:00:00 to 23:59:59.999)
    const targetDate = new Date(dateStr);
    if (isNaN(targetDate.getTime())) {
      return {
        success: false,
        slots: [],
        bookedIntervals: [],
        maintenanceIntervals: [],
        error: 'Invalid date provided.',
      };
    }

    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();

    const dayStart = new Date(year, month, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

    // Fetch confirmed & pending reservations for this day
    const bufferMs = (resource.bufferMinutes || 0) * 60 * 1000;
    const reservations = await prisma.reservation.findMany({
      where: {
        resourceId,
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        startTime: { lt: dayEnd },
        endTime: { gt: dayStart },
      },
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    // Fetch active maintenance logs for this day
    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: {
        resourceId,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        startTime: { lt: dayEnd },
        OR: [{ endTime: null }, { endTime: { gt: dayStart } }],
      },
      orderBy: { startTime: 'asc' },
    });

    // Map booked and maintenance intervals
    const bookedIntervals = reservations.map((r) => ({
      id: r.id,
      title: r.title,
      startTime: r.startTime.toISOString(),
      endTime: r.endTime.toISOString(),
      status: r.status,
      userName: r.user.name,
    }));

    const maintenanceIntervals = maintenanceLogs.map((m) => ({
      id: m.id,
      reason: m.reason,
      startTime: m.startTime.toISOString(),
      endTime: m.endTime ? m.endTime.toISOString() : null,
    }));

    // Generate 30-minute slots between 08:00 and 20:00
    const slots: TimeSlot[] = [];
    const now = new Date();

    const operatingStartHour = 8;
    const operatingEndHour = 20;

    for (let hour = operatingStartHour; hour < operatingEndHour; hour++) {
      for (const minute of [0, 30]) {
        const slotStart = new Date(year, month, day, hour, minute, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

        const formatHours = (d: Date) =>
          d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        const formattedTime = `${formatHours(slotStart)} - ${formatHours(slotEnd)}`;

        const isPast = slotStart.getTime() < now.getTime();

        // Check if resource is retired
        if (resource.status === 'RETIRED') {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            formattedTime,
            available: false,
            isPast,
            reason: 'Resource is retired',
          });
          continue;
        }

        // Check if covered by maintenance
        const activeMaint = maintenanceLogs.find((m) => {
          const mStart = m.startTime.getTime();
          const mEnd = m.endTime ? m.endTime.getTime() : Infinity;
          return mStart < slotEnd.getTime() && mEnd > slotStart.getTime();
        });

        if (activeMaint) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            formattedTime,
            available: false,
            isPast,
            reason: `Maintenance: ${activeMaint.reason}`,
          });
          continue;
        }

        // Check if covered by existing reservation (or turnaround buffer)
        let slotConflict: { title: string; id: string; isBuffer: boolean } | null = null;

        for (const res of reservations) {
          const rStart = res.startTime.getTime();
          const rEnd = res.endTime.getTime();
          const sStart = slotStart.getTime();
          const sEnd = slotEnd.getTime();

          // Direct booking overlap
          if (rStart < sEnd && rEnd > sStart) {
            slotConflict = { title: res.title, id: res.id, isBuffer: false };
            break;
          }

          // Buffer overlap
          if (bufferMs > 0) {
            const isBufferCollision = rStart < sEnd + bufferMs && sStart < rEnd + bufferMs;
            if (isBufferCollision) {
              slotConflict = {
                title: `Turnaround buffer (${resource.bufferMinutes}m) for "${res.title}"`,
                id: res.id,
                isBuffer: true,
              };
              break;
            }
          }
        }

        if (slotConflict) {
          slots.push({
            startTime: slotStart.toISOString(),
            endTime: slotEnd.toISOString(),
            formattedTime,
            available: false,
            isPast,
            reason: slotConflict.isBuffer ? slotConflict.title : `Reserved: ${slotConflict.title}`,
            reservationId: slotConflict.id,
            reservationTitle: slotConflict.title,
            isBufferPeriod: slotConflict.isBuffer,
          });
          continue;
        }

        // Slot is clean
        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
          formattedTime,
          available: !isPast,
          isPast,
          reason: isPast ? 'Past time' : undefined,
        });
      }
    }

    return {
      success: true,
      resource,
      date: dateStr,
      slots,
      bookedIntervals,
      maintenanceIntervals,
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch available slots:', error);
    return {
      success: false,
      slots: [],
      bookedIntervals: [],
      maintenanceIntervals: [],
      error: error instanceof Error ? error.message : 'Failed to calculate available slots.',
    };
  }
}

/**
 * Creates a new reservation atomically with zero-conflict validation.
 */
export async function createReservation(input: CreateReservationInput) {
  try {
    const parsed = CreateReservationSchema.parse(input);

    const startTime = new Date(parsed.startTime);
    const endTime = new Date(parsed.endTime);

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: parsed.userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return {
        success: false,
        error: `User with ID '${parsed.userId}' does not exist.`,
      };
    }

    // Execute atomic reservation via conflict engine
    const result = await atomicCheckAndReserve({
      resourceId: parsed.resourceId,
      userId: parsed.userId,
      title: parsed.title,
      purpose: parsed.purpose || undefined,
      startTime,
      endTime,
    });

    // Revalidate paths for instant client-side update
    safeRevalidatePath('/');
    safeRevalidatePath('/schedule');
    safeRevalidatePath('/my-reservations');
    safeRevalidatePath('/admin');

    const statusMessage = result.requiresApproval
      ? 'Reservation submitted for administrator approval.'
      : 'Reservation confirmed successfully.';

    return {
      success: true,
      reservation: result.reservation,
      requiresApproval: result.requiresApproval,
      message: statusMessage,
    };
  } catch (error) {
    if (error instanceof BookingConflictError) {
      return {
        success: false,
        error: error.message,
        conflictCode: error.code,
        conflictDetails: error.details,
      };
    }

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Invalid reservation submission data.',
      };
    }

    console.error('[ERROR] Failed to create reservation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred while booking.',
    };
  }
}

/**
 * Cancels an existing reservation.
 * Enforces ownership or administrator privileges.
 */
export async function cancelReservation(
  reservationId: string,
  userId: string,
  reason?: string
) {
  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: {
        resource: { select: { name: true } },
      },
    });

    if (!reservation) {
      return {
        success: false,
        error: 'Reservation not found.',
      };
    }

    if (reservation.status === ReservationStatus.CANCELLED) {
      return {
        success: false,
        error: 'This reservation is already cancelled.',
      };
    }

    // Verify user authorization (must be owner or administrator)
    const actingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!actingUser) {
      return {
        success: false,
        error: 'Acting user profile not found.',
      };
    }

    const isOwner = reservation.userId === userId;
    const isAdmin = actingUser.role === Role.ADMIN;

    if (!isOwner && !isAdmin) {
      return {
        success: false,
        error: 'You do not have permission to cancel this reservation.',
      };
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CANCELLED,
        rejectionReason: reason ? `Cancelled: ${reason}` : 'Cancelled by user',
      },
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/schedule');
    safeRevalidatePath('/my-reservations');
    safeRevalidatePath('/admin');

    return {
      success: true,
      reservation: updated,
      message: `Reservation for "${reservation.resource.name}" has been cancelled.`,
    };
  } catch (error) {
    console.error('[ERROR] Failed to cancel reservation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel reservation.',
    };
  }
}

/**
 * Updates reservation status (Admin approval, rejection, or confirmation).
 */
export async function updateReservationStatus(
  reservationId: string,
  newStatus: ReservationStatus,
  reason?: string,
  adminUserId?: string
) {
  try {
    // If adminUserId is provided, verify admin role
    if (adminUserId) {
      const admin = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });
      if (!admin || admin.role !== Role.ADMIN) {
        return {
          success: false,
          error: 'Only administrators can update reservation approval status.',
        };
      }
    }

    const reservation = await prisma.reservation.findUnique({
      where: { id: reservationId },
      include: { resource: true },
    });

    if (!reservation) {
      return {
        success: false,
        error: 'Reservation not found.',
      };
    }

    // If approving a PENDING reservation to CONFIRMED, re-verify conflict engine
    if (newStatus === ReservationStatus.CONFIRMED && reservation.status === ReservationStatus.PENDING) {
      const conflictCheck = await checkReservationConflict(prisma, {
        resourceId: reservation.resourceId,
        startTime: reservation.startTime,
        endTime: reservation.endTime,
        excludeReservationId: reservation.id,
      });

      if (conflictCheck.hasConflict) {
        return {
          success: false,
          error: `Cannot approve reservation: ${conflictCheck.message}`,
          conflictDetails: conflictCheck,
        };
      }
    }

    const updated = await prisma.reservation.update({
      where: { id: reservationId },
      data: {
        status: newStatus,
        rejectionReason: reason || (newStatus === ReservationStatus.REJECTED ? 'Rejected by administrator' : null),
      },
      include: {
        resource: { select: { name: true, code: true } },
        user: { select: { name: true, email: true } },
      },
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/schedule');
    safeRevalidatePath('/my-reservations');
    safeRevalidatePath('/admin');

    const actionText =
      newStatus === ReservationStatus.CONFIRMED
        ? 'approved'
        : newStatus === ReservationStatus.REJECTED
        ? 'rejected'
        : 'updated';

    return {
      success: true,
      reservation: updated,
      message: `Reservation "${updated.title}" has been ${actionText}.`,
    };
  } catch (error) {
    console.error('[ERROR] Failed to update reservation status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update reservation status.',
    };
  }
}

/**
 * Retrieves reservations associated with a specific user.
 * Organizes results by Upcoming, Pending, Past, and Cancelled.
 */
export async function getUserReservations(userId: string) {
  try {
    const reservations = await prisma.reservation.findMany({
      where: { userId },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true,
            imageUrl: true,
            bufferMinutes: true,
            requiresApproval: true,
            category: { select: { name: true, iconName: true } },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    const now = new Date();

    const upcoming = reservations.filter(
      (r) => r.status === ReservationStatus.CONFIRMED && new Date(r.endTime) >= now
    );

    const pending = reservations.filter(
      (r) => r.status === ReservationStatus.PENDING
    );

    const past = reservations.filter(
      (r) => r.status === ReservationStatus.CONFIRMED && new Date(r.endTime) < now
    );

    const cancelled = reservations.filter(
      (r) => r.status === ReservationStatus.CANCELLED || r.status === ReservationStatus.REJECTED
    );

    return {
      success: true,
      all: reservations,
      upcoming,
      pending,
      past,
      cancelled,
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch user reservations:', error);
    return {
      success: false,
      all: [],
      upcoming: [],
      pending: [],
      past: [],
      cancelled: [],
      error: 'Failed to load user reservations.',
    };
  }
}

/**
 * Fetches reservations within a date range for timeline calendar views.
 */
export async function getScheduleReservations(
  startStr: string,
  endStr: string,
  resourceId?: string
) {
  try {
    const start = new Date(startStr);
    const end = new Date(endStr);

    const reservations = await prisma.reservation.findMany({
      where: {
        resourceId: resourceId || undefined,
        status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
        startTime: { lt: end },
        endTime: { gt: start },
      },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            code: true,
            location: true,
            category: { select: { name: true, slug: true } },
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const maintenanceLogs = await prisma.maintenanceLog.findMany({
      where: {
        resourceId: resourceId || undefined,
        status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
        startTime: { lt: end },
        OR: [{ endTime: null }, { endTime: { gt: start } }],
      },
      include: {
        resource: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return {
      success: true,
      reservations,
      maintenanceLogs,
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch schedule data:', error);
    return {
      success: false,
      reservations: [],
      maintenanceLogs: [],
      error: 'Failed to fetch schedule data.',
    };
  }
}

/**
 * Instant server-side conflict check for smart booking modal.
 * Validates requested time window against active reservations, turnaround buffers, and maintenance.
 */
export async function checkSlotConflict(input: {
  resourceId: string;
  startTime: string | Date;
  endTime: string | Date;
  excludeReservationId?: string;
}) {
  try {
    const start = new Date(input.startTime);
    const end = new Date(input.endTime);

    const result = await checkReservationConflict(prisma, {
      resourceId: input.resourceId,
      startTime: start,
      endTime: end,
      excludeReservationId: input.excludeReservationId,
    });

    return {
      success: true,
      hasConflict: result.hasConflict,
      canBook: result.canBook,
      conflictType: result.conflictType,
      message: result.message,
      conflicts: result.conflicts.map((c) => ({
        type: c.type,
        id: c.id,
        title: c.title,
        startTime: c.startTime.toISOString(),
        endTime: c.endTime.toISOString(),
        status: c.status,
        reason: c.reason,
      })),
      resource: result.resource,
    };
  } catch (error) {
    console.error('[ERROR] Failed to check slot conflict:', error);
    return {
      success: false,
      hasConflict: true,
      canBook: false,
      message: error instanceof Error ? error.message : 'Failed to validate slot availability.',
      conflicts: [],
    };
  }
}

/**
 * Fetches real-time Approval Hub review queue data for administrators.
 * Evaluates conflict status for every pending request against active schedules.
 */
export async function getApprovalQueueData() {
  try {
    const [pending, history] = await Promise.all([
      prisma.reservation.findMany({
        where: { status: ReservationStatus.PENDING },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              code: true,
              location: true,
              capacity: true,
              bufferMinutes: true,
              requiresApproval: true,
              imageUrl: true,
              category: { select: { name: true, iconName: true } },
            },
          },
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.reservation.findMany({
        where: {
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.REJECTED] },
          resource: { requiresApproval: true },
        },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              code: true,
              location: true,
              capacity: true,
              bufferMinutes: true,
              requiresApproval: true,
              imageUrl: true,
              category: { select: { name: true, iconName: true } },
            },
          },
          user: {
            select: { id: true, name: true, email: true, department: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 15,
      }),
    ]);

    // Check conflict status for each pending request
    const pendingWithConflicts = await Promise.all(
      pending.map(async (item) => {
        try {
          const conflict = await checkReservationConflict(prisma, {
            resourceId: item.resourceId,
            startTime: item.startTime,
            endTime: item.endTime,
            excludeReservationId: item.id,
            includePending: false,
            allowPastBooking: true,
          });

          return {
            ...item,
            conflictStatus: {
              hasConflict: conflict.hasConflict,
              message: conflict.hasConflict ? (conflict.message || 'Overlap detected') : 'Conflict-Free',
            },
          };
        } catch {
          return {
            ...item,
            conflictStatus: {
              hasConflict: false,
              message: 'Conflict-Free',
            },
          };
        }
      })
    );

    return {
      success: true,
      pending: pendingWithConflicts,
      history,
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch approval queue data:', error);
    return {
      success: false,
      pending: [],
      history: [],
      error: 'Failed to fetch approval queue data.',
    };
  }
}

/**
 * Retrieves cross-resource timeline data for the Administrator Master Calendar.
 * Supports cross-resource matrix analysis across all facilities, categories, and maintenance logs.
 */
export async function getMasterCalendarData(
  targetDateStr?: string,
  categoryId?: string,
  viewDays: number = 1
) {
  try {
    const baseDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate;

    // Window boundaries: 00:00:00 of start date to 23:59:59 of end date
    const startDate = new Date(
      validBase.getFullYear(),
      validBase.getMonth(),
      validBase.getDate(),
      0,
      0,
      0,
      0
    );

    const endDate = new Date(
      validBase.getFullYear(),
      validBase.getMonth(),
      validBase.getDate() + (viewDays - 1),
      23,
      59,
      59,
      999
    );

    const [resources, reservations, maintenanceLogs, categories] = await Promise.all([
      prisma.resource.findMany({
        where: {
          categoryId: categoryId && categoryId !== 'ALL' ? categoryId : undefined,
        },
        include: {
          category: {
            select: { id: true, name: true, slug: true, iconName: true },
          },
          maintenanceLogs: {
            where: { status: { in: ['IN_PROGRESS', 'SCHEDULED'] } },
            orderBy: { startTime: 'asc' },
          },
        },
        orderBy: [{ category: { name: 'asc' } }, { name: 'asc' }],
      }),
      prisma.reservation.findMany({
        where: {
          resource: {
            categoryId: categoryId && categoryId !== 'ALL' ? categoryId : undefined,
          },
          status: { in: [ReservationStatus.CONFIRMED, ReservationStatus.PENDING] },
          startTime: { lt: endDate },
          endTime: { gt: startDate },
        },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              code: true,
              location: true,
              bufferMinutes: true,
              requiresApproval: true,
              category: { select: { name: true, iconName: true } },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true,
            },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.maintenanceLog.findMany({
        where: {
          resource: {
            categoryId: categoryId && categoryId !== 'ALL' ? categoryId : undefined,
          },
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          startTime: { lt: endDate },
          OR: [{ endTime: null }, { endTime: { gt: startDate } }],
        },
        include: {
          resource: {
            select: { id: true, name: true, code: true, location: true },
          },
        },
        orderBy: { startTime: 'asc' },
      }),
      prisma.category.findMany({
        select: { id: true, name: true, slug: true, iconName: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Calculate daily metrics
    const confirmedCount = reservations.filter(
      (r) => r.status === ReservationStatus.CONFIRMED
    ).length;
    const pendingCount = reservations.filter(
      (r) => r.status === ReservationStatus.PENDING
    ).length;
    const inMaintenanceCount = resources.filter(
      (r) => r.status === 'MAINTENANCE'
    ).length;

    // Calculate booked minutes during operational window (08:00 - 20:00 = 12h per day)
    let totalBookedMinutes = 0;
    reservations.forEach((r) => {
      if (r.status === ReservationStatus.CONFIRMED) {
        const rStart = Math.max(r.startTime.getTime(), startDate.getTime());
        const rEnd = Math.min(r.endTime.getTime(), endDate.getTime());
        if (rEnd > rStart) {
          totalBookedMinutes += (rEnd - rStart) / (1000 * 60);
        }
      }
    });

    const operationalResources = Math.max(1, resources.filter((r) => r.status === 'AVAILABLE').length);
    const totalCapacityMinutes = operationalResources * 12 * 60 * viewDays;
    const utilizationRate = Math.min(100, Math.round((totalBookedMinutes / totalCapacityMinutes) * 100));

    return {
      success: true,
      date: validBase.toISOString().split('T')[0],
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      resources,
      reservations,
      maintenanceLogs,
      categories,
      metrics: {
        totalResources: resources.length,
        totalBookingsToday: reservations.length,
        confirmedBookings: confirmedCount,
        pendingApprovals: pendingCount,
        inMaintenanceCount,
        utilizationRate,
      },
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch master calendar data:', error);
    return {
      success: false,
      date: new Date().toISOString().split('T')[0],
      startDate: new Date().toISOString(),
      endDate: new Date().toISOString(),
      resources: [],
      reservations: [],
      maintenanceLogs: [],
      categories: [],
      metrics: {
        totalResources: 0,
        totalBookingsToday: 0,
        confirmedBookings: 0,
        pendingApprovals: 0,
        inMaintenanceCount: 0,
        utilizationRate: 0,
      },
      error: 'Failed to load master calendar dataset.',
    };
  }
}

