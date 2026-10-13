'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ResourceStatus, MaintenanceStatus, Role } from '@prisma/client';
import { z } from 'zod';

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Gracefully handle calls outside of active Next.js HTTP request context (e.g. automated tests)
  }
}

const MaintenanceLogSchema = z.object({
  reason: z.string().min(3, 'Reason must be at least 3 characters'),
  startTime: z.string().or(z.date()).optional(),
  endTime: z.string().or(z.date()).optional().nullable(),
  performedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type MaintenanceLogInput = z.infer<typeof MaintenanceLogSchema>;

const ResourceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters').toUpperCase(),
  categoryId: z.string().min(1, 'Category is required'),
  location: z.string().min(2, 'Location is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1'),
  description: z.string().min(5, 'Description is required'),
  status: z.nativeEnum(ResourceStatus).default(ResourceStatus.AVAILABLE),
  requiresApproval: z.boolean().default(false),
  bufferMinutes: z.number().int().min(0).default(0),
  imageUrl: z.string().url('Must be a valid image URL').optional().nullable(),
});

export type CreateResourceInput = z.infer<typeof ResourceSchema>;

/**
 * Toggles a resource's status between AVAILABLE, MAINTENANCE, or RETIRED.
 * Automatically manages active maintenance logs.
 */
export async function toggleResourceMaintenance(
  resourceId: string,
  targetStatus: ResourceStatus,
  logData?: MaintenanceLogInput,
  adminUserId?: string
) {
  try {
    if (adminUserId) {
      const admin = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });
      if (!admin || admin.role !== Role.ADMIN) {
        return {
          success: false,
          error: 'Only administrators can toggle resource operational status.',
        };
      }
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
    });

    if (!resource) {
      return {
        success: false,
        error: `Resource with ID '${resourceId}' not found.`,
      };
    }

    const now = new Date();

    if (targetStatus === ResourceStatus.MAINTENANCE) {
      const parsedLog = logData ? MaintenanceLogSchema.parse(logData) : null;

      const [updatedResource, newLog] = await prisma.$transaction([
        prisma.resource.update({
          where: { id: resourceId },
          data: { status: ResourceStatus.MAINTENANCE },
        }),
        prisma.maintenanceLog.create({
          data: {
            resourceId,
            reason: parsedLog?.reason || 'Scheduled maintenance and operational inspection',
            startTime: parsedLog?.startTime ? new Date(parsedLog.startTime) : now,
            endTime: parsedLog?.endTime ? new Date(parsedLog.endTime) : null,
            performedBy: parsedLog?.performedBy || 'Internal Facilities Team',
            notes: parsedLog?.notes || null,
            status: MaintenanceStatus.IN_PROGRESS,
          },
        }),
      ]);

      safeRevalidatePath('/');
      safeRevalidatePath('/schedule');
      safeRevalidatePath('/admin');

      return {
        success: true,
        resource: updatedResource,
        maintenanceLog: newLog,
        message: `Resource "${resource.name}" placed in maintenance mode.`,
      };
    }

    if (targetStatus === ResourceStatus.AVAILABLE) {
      const [updatedResource] = await prisma.$transaction([
        prisma.resource.update({
          where: { id: resourceId },
          data: { status: ResourceStatus.AVAILABLE },
        }),
        // Complete any open maintenance logs
        prisma.maintenanceLog.updateMany({
          where: {
            resourceId,
            status: { in: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.SCHEDULED] },
            endTime: null,
          },
          data: {
            status: MaintenanceStatus.COMPLETED,
            endTime: now,
          },
        }),
      ]);

      safeRevalidatePath('/');
      safeRevalidatePath('/schedule');
      safeRevalidatePath('/admin');

      return {
        success: true,
        resource: updatedResource,
        message: `Resource "${resource.name}" restored to available status.`,
      };
    }

    // Default status update (e.g. RETIRED)
    const updated = await prisma.resource.update({
      where: { id: resourceId },
      data: { status: targetStatus },
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/schedule');
    safeRevalidatePath('/admin');

    return {
      success: true,
      resource: updated,
      message: `Resource "${resource.name}" status updated to ${targetStatus}.`,
    };
  } catch (error) {
    console.error('[ERROR] Failed to toggle resource status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update resource operational status.',
    };
  }
}

/**
 * Fetches all resources with optional category, search, and status filters.
 */
export async function getResources(filters?: {
  categoryId?: string;
  search?: string;
  status?: ResourceStatus;
}) {
  try {
    const whereClause: Record<string, unknown> = {};

    if (filters?.categoryId && filters.categoryId !== 'all') {
      whereClause.categoryId = filters.categoryId;
    }

    if (filters?.status) {
      whereClause.status = filters.status;
    }

    if (filters?.search && filters.search.trim() !== '') {
      const query = filters.search.trim();
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { code: { contains: query, mode: 'insensitive' } },
        { location: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
      ];
    }

    const resources = await prisma.resource.findMany({
      where: whereClause,
      include: {
        category: {
          select: { id: true, name: true, slug: true, iconName: true },
        },
        reservations: {
          where: {
            status: { in: ['CONFIRMED', 'PENDING'] },
            endTime: { gte: new Date() },
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            status: true,
            user: { select: { name: true } },
          },
          orderBy: { startTime: 'asc' },
          take: 3,
        },
        maintenanceLogs: {
          where: {
            status: { in: ['IN_PROGRESS', 'SCHEDULED'] },
          },
          select: {
            id: true,
            reason: true,
            startTime: true,
            endTime: true,
            status: true,
          },
          orderBy: { startTime: 'asc' },
          take: 1,
        },
        _count: {
          select: {
            reservations: true,
            maintenanceLogs: true,
          },
        },
      },
      orderBy: [{ categoryId: 'asc' }, { name: 'asc' }],
    });

    return {
      success: true,
      resources,
    };
  } catch (error) {
    console.error('[ERROR] Failed to load resources:', error);
    return {
      success: false,
      resources: [],
      error: 'Failed to fetch resource inventory.',
    };
  }
}

/**
 * Fetches resource categories.
 */
export async function getCategories() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { resources: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      success: true,
      categories,
    };
  } catch (error) {
    console.error('[ERROR] Failed to load categories:', error);
    return {
      success: false,
      categories: [],
      error: 'Failed to fetch categories.',
    };
  }
}

/**
 * Fetches a single resource with recent upcoming reservations and maintenance history.
 */
export async function getResourceById(id: string) {
  try {
    const resource = await prisma.resource.findUnique({
      where: { id },
      include: {
        category: true,
        reservations: {
          where: {
            endTime: { gte: new Date() },
          },
          include: {
            user: { select: { name: true, email: true } },
          },
          orderBy: { startTime: 'asc' },
          take: 5,
        },
        maintenanceLogs: {
          orderBy: { startTime: 'desc' },
          take: 5,
        },
      },
    });

    if (!resource) {
      return {
        success: false,
        resource: null,
        error: 'Resource not found.',
      };
    }

    return {
      success: true,
      resource,
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch resource by ID:', error);
    return {
      success: false,
      resource: null,
      error: 'Failed to load resource details.',
    };
  }
}

/**
 * Admin action to create a new resource.
 */
export async function createResource(input: CreateResourceInput, adminUserId?: string) {
  try {
    if (adminUserId) {
      const admin = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });
      if (!admin || admin.role !== Role.ADMIN) {
        return {
          success: false,
          error: 'Only administrators can add new resources.',
        };
      }
    }

    const validated = ResourceSchema.parse(input);

    // Check code uniqueness
    const existingCode = await prisma.resource.findUnique({
      where: { code: validated.code },
    });

    if (existingCode) {
      return {
        success: false,
        error: `Resource code '${validated.code}' is already in use by another asset.`,
      };
    }

    const newResource = await prisma.resource.create({
      data: validated,
      include: { category: true },
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/schedule');
    safeRevalidatePath('/admin');

    return {
      success: true,
      resource: newResource,
      message: `Resource "${newResource.name}" created successfully.`,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || 'Invalid resource data provided.',
      };
    }

    console.error('[ERROR] Failed to create resource:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create resource.',
    };
  }
}

/**
 * Admin action to update an existing resource.
 */
export async function updateResource(
  id: string,
  input: Partial<CreateResourceInput>,
  adminUserId?: string
) {
  try {
    if (adminUserId) {
      const admin = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true },
      });
      if (!admin || admin.role !== Role.ADMIN) {
        return {
          success: false,
          error: 'Only administrators can update resources.',
        };
      }
    }

    const existing = await prisma.resource.findUnique({ where: { id } });
    if (!existing) {
      return { success: false, error: 'Resource not found.' };
    }

    if (input.code && input.code !== existing.code) {
      const duplicate = await prisma.resource.findUnique({
        where: { code: input.code.toUpperCase() },
      });
      if (duplicate) {
        return {
          success: false,
          error: `Resource code '${input.code}' is already taken.`,
        };
      }
    }

    const updated = await prisma.resource.update({
      where: { id },
      data: {
        ...input,
        code: input.code ? input.code.toUpperCase() : undefined,
      },
      include: { category: true },
    });

    safeRevalidatePath('/');
    safeRevalidatePath('/schedule');
    safeRevalidatePath('/admin');

    return {
      success: true,
      resource: updated,
      message: `Resource "${updated.name}" updated successfully.`,
    };
  } catch (error) {
    console.error('[ERROR] Failed to update resource:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update resource.',
    };
  }
}

/**
 * Calculates operational KPIs and statistics for the Administrator Dashboard.
 */
export async function getAdminDashboardStats() {
  try {
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const [
      totalResources,
      availableCount,
      maintenanceCount,
      todayBookingsCount,
      pendingCount,
      pendingReservations,
      allCategories,
      activeMaintenanceLogs,
      recentReservations,
    ] = await Promise.all([
      prisma.resource.count(),
      prisma.resource.count({ where: { status: ResourceStatus.AVAILABLE } }),
      prisma.resource.count({ where: { status: ResourceStatus.MAINTENANCE } }),
      prisma.reservation.count({
        where: {
          status: 'CONFIRMED',
          startTime: { lt: endOfToday },
          endTime: { gt: startOfToday },
        },
      }),
      prisma.reservation.count({
        where: { status: 'PENDING' },
      }),
      prisma.reservation.findMany({
        where: { status: 'PENDING' },
        include: {
          resource: { select: { id: true, name: true, code: true, location: true } },
          user: { select: { id: true, name: true, email: true, department: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      prisma.category.findMany({
        include: {
          _count: { select: { resources: true } },
          resources: {
            select: {
              id: true,
              name: true,
              code: true,
              _count: {
                select: {
                  reservations: {
                    where: { status: { in: ['CONFIRMED', 'PENDING'] } },
                  },
                },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.maintenanceLog.findMany({
        where: { status: { in: ['IN_PROGRESS', 'SCHEDULED'] } },
        include: { resource: { select: { name: true, code: true } } },
        orderBy: { startTime: 'asc' },
      }),
      prisma.reservation.findMany({
        where: {
          status: { in: ['CONFIRMED', 'PENDING'] },
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          status: true,
          resourceId: true,
          resource: {
            select: {
              id: true,
              name: true,
              code: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    // Approximate utilization rate today across total operating hours (12 hours / resource)
    const totalPotentialSlotHours = Math.max(1, totalResources * 12);
    const utilizationRate = Math.min(100, Math.round((todayBookingsCount * 1.5 / totalPotentialSlotHours) * 100));

    // 1. Category Demand Breakdown
    const totalBookingsAll = Math.max(1, recentReservations.length);
    const categoryDemand = allCategories.map((cat) => {
      const count = cat.resources.reduce((sum, r) => sum + r._count.reservations, 0);
      const percentage = Math.round((count / totalBookingsAll) * 100);
      return {
        id: cat.id,
        name: cat.name,
        count,
        resourceCount: cat.resources.length,
        percentage,
      };
    });

    // 2. 7-Day Demand Horizon Trend (Monday to Sunday)
    const weekStart = new Date(today);
    const dayOfWeek = today.getDay();
    const distToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    weekStart.setDate(today.getDate() + distToMon);
    weekStart.setHours(0, 0, 0, 0);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dailyTrend = dayNames.map((name, idx) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + idx);
      const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
      const dEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();

      const dayReservations = recentReservations.filter((r) => {
        const rStart = new Date(r.startTime).getTime();
        return rStart >= dStart && rStart <= dEnd;
      });

      const confirmed = dayReservations.filter((r) => r.status === 'CONFIRMED').length;
      const pending = dayReservations.filter((r) => r.status === 'PENDING').length;
      const total = confirmed + pending;

      const isCurrentDay =
        today.getDate() === d.getDate() &&
        today.getMonth() === d.getMonth() &&
        today.getFullYear() === d.getFullYear();

      return {
        day: name,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        shortDate: String(d.getDate()),
        confirmed,
        pending,
        total,
        isToday: isCurrentDay,
      };
    });

    // 3. Hourly Distribution Across Operating Hours (08:00 - 20:00 in 2-hour brackets)
    const hourlyBrackets = [
      { slot: '08:00 – 10:00', startH: 8, endH: 10 },
      { slot: '10:00 – 12:00', startH: 10, endH: 12 },
      { slot: '12:00 – 14:00', startH: 12, endH: 14 },
      { slot: '14:00 – 16:00', startH: 14, endH: 16 },
      { slot: '16:00 – 18:00', startH: 16, endH: 18 },
      { slot: '18:00 – 20:00', startH: 18, endH: 20 },
    ];

    const hourlyDistribution = hourlyBrackets.map((bracket) => {
      const count = recentReservations.filter((r) => {
        const s = new Date(r.startTime);
        const hour = s.getHours();
        return hour >= bracket.startH && hour < bracket.endH;
      }).length;

      const maxBracketCount = Math.max(1, ...hourlyBrackets.map((b) => 4));
      const intensityPercent = Math.min(100, Math.round((count / maxBracketCount) * 100));

      return {
        timeSlot: bracket.slot,
        count,
        intensityPercent,
      };
    });

    // 4. Top Demanded Resources Ranking
    const resourceMap: Record<
      string,
      { id: string; name: string; code: string; categoryName: string; bookingsCount: number }
    > = {};

    recentReservations.forEach((r) => {
      if (!resourceMap[r.resourceId]) {
        resourceMap[r.resourceId] = {
          id: r.resource.id,
          name: r.resource.name,
          code: r.resource.code,
          categoryName: r.resource.category.name,
          bookingsCount: 0,
        };
      }
      resourceMap[r.resourceId].bookingsCount += 1;
    });

    const topDemandedResources = Object.values(resourceMap)
      .sort((a, b) => b.bookingsCount - a.bookingsCount)
      .slice(0, 5)
      .map((item) => ({
        ...item,
        utilizationPercent: Math.min(100, Math.round((item.bookingsCount / 5) * 100)),
      }));

    return {
      success: true,
      stats: {
        totalResources,
        availableCount,
        maintenanceCount,
        todayBookingsCount,
        pendingApprovalsCount: pendingCount,
        utilizationRate,
      },
      categoryDemand,
      dailyTrend,
      hourlyDistribution,
      topDemandedResources,
      pendingReservations,
      activeMaintenanceLogs,
      categories: allCategories,
    };
  } catch (error) {
    console.error('[ERROR] Failed to fetch admin dashboard stats:', error);
    return {
      success: false,
      stats: {
        totalResources: 0,
        availableCount: 0,
        maintenanceCount: 0,
        todayBookingsCount: 0,
        pendingApprovalsCount: 0,
        utilizationRate: 0,
      },
      categoryDemand: [],
      dailyTrend: [],
      hourlyDistribution: [],
      topDemandedResources: [],
      pendingReservations: [],
      activeMaintenanceLogs: [],
      categories: [],
      error: 'Failed to load administration analytics.',
    };
  }
}
