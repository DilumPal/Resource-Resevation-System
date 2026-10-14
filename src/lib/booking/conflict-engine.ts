import { Prisma, PrismaClient, ReservationStatus, MaintenanceStatus, ResourceStatus } from '@prisma/client';
import prismaClient from '@/lib/prisma';

export interface ConflictDetail {
  type: 'RESERVATION' | 'MAINTENANCE';
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  status: string;
  reason?: string;
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  canBook: boolean;
  conflictType?: 'PAST_TIME' | 'INVALID_DURATION' | 'RESOURCE_UNAVAILABLE' | 'MAINTENANCE' | 'OVERLAPPING_RESERVATION';
  message?: string;
  conflicts: ConflictDetail[];
  resource?: {
    id: string;
    name: string;
    code: string;
    status: ResourceStatus;
    bufferMinutes: number;
    requiresApproval: boolean;
  };
}

export interface CheckConflictOptions {
  resourceId: string;
  startTime: Date;
  endTime: Date;
  excludeReservationId?: string;
  includePending?: boolean;
  allowPastBooking?: boolean;
}

export interface AtomicReserveOptions extends CheckConflictOptions {
  userId: string;
  title: string;
  purpose?: string;
}

export class BookingConflictError extends Error {
  public readonly code: string;
  public readonly details: ConflictCheckResult;

  constructor(result: ConflictCheckResult) {
    super(result.message || 'The requested reservation has a scheduling conflict.');
    this.name = 'BookingConflictError';
    this.code = result.conflictType || 'SCHEDULING_CONFLICT';
    this.details = result;
  }
}

/**
 * Enterprise Business Rules for SyncSpace Reservations
 */
export const BUSINESS_RULES = {
  MIN_DURATION_MINUTES: 15,    // Minimum reservation session is 15 minutes
  MAX_DURATION_MINUTES: 480,   // Maximum single reservation is 8 hours (480 minutes)
  MAX_ADVANCE_DAYS: 90,        // Maximum advance booking horizon is 90 days
  GRACE_PERIOD_MS: 60 * 1000,  // 60-second grace window for clock skew / network latency
} as const;

/**
 * Validates business rules for time ranges:
 * 1. Valid date formatting.
 * 2. Start time must be strictly before end time.
 * 3. Minimum duration limit (15 minutes).
 * 4. Maximum duration limit (8 hours / 480 minutes).
 * 5. Maximum advance booking limit (90 days).
 * 6. No past bookings (with 60-second clock skew grace period).
 */
export function validateTimeRange(
  startTime: Date,
  endTime: Date,
  allowPast: boolean = false
): {
  valid: boolean;
  errorType?: 'INVALID_DURATION' | 'PAST_TIME';
  message?: string;
  durationMinutes?: number;
} {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = Date.now();

  if (isNaN(start) || isNaN(end)) {
    return {
      valid: false,
      errorType: 'INVALID_DURATION',
      message: 'Invalid start or end date format provided.',
    };
  }

  if (start >= end) {
    return {
      valid: false,
      errorType: 'INVALID_DURATION',
      message: 'Reservation start time must be strictly before end time.',
    };
  }

  // 1. No past bookings rule (with 60s grace allowance for clock skew)
  if (!allowPast && start < now - BUSINESS_RULES.GRACE_PERIOD_MS) {
    return {
      valid: false,
      errorType: 'PAST_TIME',
      message: 'Cannot schedule a reservation in the past.',
    };
  }

  const durationMinutes = Math.round((end - start) / (1000 * 60));

  // 2. Minimum duration rule (15 min)
  if (durationMinutes < BUSINESS_RULES.MIN_DURATION_MINUTES) {
    return {
      valid: false,
      errorType: 'INVALID_DURATION',
      message: `Reservation duration must be at least ${BUSINESS_RULES.MIN_DURATION_MINUTES} minutes.`,
      durationMinutes,
    };
  }

  // 3. Maximum duration rule (8 hours / 480 min)
  if (durationMinutes > BUSINESS_RULES.MAX_DURATION_MINUTES) {
    return {
      valid: false,
      errorType: 'INVALID_DURATION',
      message: `Single reservation duration cannot exceed ${BUSINESS_RULES.MAX_DURATION_MINUTES / 60} hours (${BUSINESS_RULES.MAX_DURATION_MINUTES} minutes).`,
      durationMinutes,
    };
  }

  // 4. Maximum advance booking horizon rule (90 days)
  const maxAdvanceMs = BUSINESS_RULES.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000;
  if (start > now + maxAdvanceMs) {
    return {
      valid: false,
      errorType: 'INVALID_DURATION',
      message: `Reservations cannot be booked more than ${BUSINESS_RULES.MAX_ADVANCE_DAYS} days in advance.`,
      durationMinutes,
    };
  }

  return { valid: true, durationMinutes };
}

/**
 * Core overlap detection function.
 * Evaluates whether [reqStart, reqEnd] conflicts with existing reservations or maintenance.
 * Takes into account resource turnaround buffer minutes.
 * Can be run against a standard PrismaClient or an active Prisma transaction client.
 */
export async function checkReservationConflict(
  client: PrismaClient | Prisma.TransactionClient,
  options: CheckConflictOptions
): Promise<ConflictCheckResult> {
  const {
    resourceId,
    startTime,
    endTime,
    excludeReservationId,
    includePending = true,
    allowPastBooking = false,
  } = options;

  // 1. Time range validity
  const rangeValidation = validateTimeRange(startTime, endTime, allowPastBooking);
  if (!rangeValidation.valid) {
    return {
      hasConflict: true,
      canBook: false,
      conflictType: rangeValidation.errorType,
      message: rangeValidation.message,
      conflicts: [],
    };
  }

  // 2. Fetch resource details
  const resource = await client.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      name: true,
      code: true,
      status: true,
      bufferMinutes: true,
      requiresApproval: true,
    },
  });

  if (!resource) {
    return {
      hasConflict: true,
      canBook: false,
      conflictType: 'RESOURCE_UNAVAILABLE',
      message: `Resource with ID '${resourceId}' was not found.`,
      conflicts: [],
    };
  }

  if (resource.status === ResourceStatus.RETIRED) {
    return {
      hasConflict: true,
      canBook: false,
      conflictType: 'RESOURCE_UNAVAILABLE',
      message: `Resource '${resource.name}' (${resource.code}) is retired and no longer available for booking.`,
      conflicts: [],
      resource,
    };
  }

  const reqStart = new Date(startTime);
  const reqEnd = new Date(endTime);
  const bufferMs = (resource.bufferMinutes || 0) * 60 * 1000;

  // 3. Check for overlapping maintenance windows
  const maintenanceWindows = await client.maintenanceLog.findMany({
    where: {
      resourceId,
      status: {
        in: [MaintenanceStatus.SCHEDULED, MaintenanceStatus.IN_PROGRESS],
      },
      startTime: {
        lt: reqEnd,
      },
      OR: [
        { endTime: null },
        { endTime: { gt: reqStart } },
      ],
    },
    select: {
      id: true,
      reason: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  if (maintenanceWindows.length > 0) {
    const conflicts: ConflictDetail[] = maintenanceWindows.map((m) => ({
      type: 'MAINTENANCE',
      id: m.id,
      title: `Maintenance: ${m.reason}`,
      startTime: m.startTime,
      endTime: m.endTime || reqEnd,
      status: m.status,
      reason: m.reason,
    }));

    return {
      hasConflict: true,
      canBook: false,
      conflictType: 'MAINTENANCE',
      message: `Resource '${resource.name}' has scheduled maintenance during the requested period.`,
      conflicts,
      resource,
    };
  }

  // 4. Check for overlapping reservations
  // A collision occurs between reservation [S1, E1] and [S2, E2] with buffer B when:
  // S1 < E2 + B  AND  S2 < E1 + B
  const activeStatuses: ReservationStatus[] = includePending
    ? [ReservationStatus.CONFIRMED, ReservationStatus.PENDING]
    : [ReservationStatus.CONFIRMED];

  // Pre-filter candidate reservations in PostgreSQL
  const searchMinStart = new Date(reqStart.getTime() - bufferMs);
  const searchMaxEnd = new Date(reqEnd.getTime() + bufferMs);

  const candidateReservations = await client.reservation.findMany({
    where: {
      resourceId,
      status: { in: activeStatuses },
      id: excludeReservationId ? { not: excludeReservationId } : undefined,
      startTime: { lt: searchMaxEnd },
      endTime: { gt: searchMinStart },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      status: true,
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  // Verify exact collision conditions including buffer minutes
  const conflictingReservations: ConflictDetail[] = [];

  for (const existing of candidateReservations) {
    const existStart = existing.startTime.getTime();
    const existEnd = existing.endTime.getTime();
    const requestedStart = reqStart.getTime();
    const requestedEnd = reqEnd.getTime();

    // S_exist < E_req + buffer AND S_req < E_exist + buffer
    const isOverlapping =
      existStart < requestedEnd + bufferMs && requestedStart < existEnd + bufferMs;

    if (isOverlapping) {
      conflictingReservations.push({
        type: 'RESERVATION',
        id: existing.id,
        title: existing.title,
        startTime: existing.startTime,
        endTime: existing.endTime,
        status: existing.status,
        reason:
          bufferMs > 0
            ? `Conflicts with existing booking (including ${resource.bufferMinutes}m turnaround buffer)`
            : 'Directly overlaps with an existing booking slot',
      });
    }
  }

  if (conflictingReservations.length > 0) {
    return {
      hasConflict: true,
      canBook: false,
      conflictType: 'OVERLAPPING_RESERVATION',
      message: `The selected time slot conflicts with ${conflictingReservations.length} existing reservation(s) or buffer period(s).`,
      conflicts: conflictingReservations,
      resource,
    };
  }

  return {
    hasConflict: false,
    canBook: true,
    conflicts: [],
    resource,
  };
}

/**
 * Executes atomic check and reservation insertion inside a PostgreSQL transaction
 * with row-level locking on the Resource row to eliminate concurrency race conditions.
 */
export async function atomicCheckAndReserve(
  options: AtomicReserveOptions,
  customPrisma: PrismaClient = prismaClient
) {
  return await customPrisma.$transaction(
    async (tx) => {
      // 1. Acquire row-level lock on Resource to serialize concurrent bookings for this resource
      const lockedResources = await tx.$queryRaw<
        Array<{
          id: string;
          name: string;
          code: string;
          status: string;
          bufferMinutes: number;
          requiresApproval: boolean;
        }>
      >`
        SELECT id, name, code, status, "bufferMinutes", "requiresApproval"
        FROM "Resource"
        WHERE id = ${options.resourceId}
        FOR UPDATE
      `;

      if (!lockedResources || lockedResources.length === 0) {
        throw new BookingConflictError({
          hasConflict: true,
          canBook: false,
          conflictType: 'RESOURCE_UNAVAILABLE',
          message: `Resource '${options.resourceId}' not found.`,
          conflicts: [],
        });
      }

      // 2. Perform comprehensive conflict check inside the locked transaction
      const conflictResult = await checkReservationConflict(tx, options);

      if (conflictResult.hasConflict || !conflictResult.canBook) {
        throw new BookingConflictError(conflictResult);
      }

      // 3. Determine initial reservation status based on resource approval requirements
      const initialStatus = conflictResult.resource?.requiresApproval
        ? ReservationStatus.PENDING
        : ReservationStatus.CONFIRMED;

      // 4. Create the reservation atomically
      const newReservation = await tx.reservation.create({
        data: {
          resourceId: options.resourceId,
          userId: options.userId,
          title: options.title.trim(),
          purpose: options.purpose?.trim() || null,
          startTime: new Date(options.startTime),
          endTime: new Date(options.endTime),
          status: initialStatus,
        },
        include: {
          resource: {
            select: {
              id: true,
              name: true,
              code: true,
              location: true,
              requiresApproval: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });

      return {
        reservation: newReservation,
        status: initialStatus,
        requiresApproval: conflictResult.resource?.requiresApproval ?? false,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    }
  );
}
