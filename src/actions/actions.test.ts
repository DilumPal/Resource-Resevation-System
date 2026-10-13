import prisma from '@/lib/prisma';
import {
  getAvailableSlots,
  createReservation,
  cancelReservation,
  updateReservationStatus,
  getUserReservations,
} from './reservations';
import {
  toggleResourceMaintenance,
  getResources,
  getCategories,
  getAdminDashboardStats,
} from './resources';
import { ResourceStatus, ReservationStatus } from '@prisma/client';

async function testServerActions() {
  console.log('[TEST] Starting Server Actions Verification Suite...');

  // 1. Test getCategories & getResources
  console.log('[TEST 1] Testing getCategories and getResources...');
  const catRes = await getCategories();
  if (!catRes.success || catRes.categories.length === 0) {
    throw new Error('Expected categories to load successfully');
  }

  const resourcesRes = await getResources();
  if (!resourcesRes.success || resourcesRes.resources.length === 0) {
    throw new Error('Expected resources to load successfully');
  }
  console.log(`[PASS 1] Loaded ${catRes.categories.length} categories and ${resourcesRes.resources.length} resources.`);

  const testResource = resourcesRes.resources.find((r) => r.code === 'CR-01') || resourcesRes.resources[0];
  const testUser = await prisma.user.findFirstOrThrow({ where: { role: 'MEMBER' } });
  const adminUser = await prisma.user.findFirstOrThrow({ where: { role: 'ADMIN' } });

  // 2. Test getAvailableSlots
  console.log('[TEST 2] Testing getAvailableSlots for resource...');
  const todayStr = new Date().toISOString().split('T')[0];
  const slotsRes = await getAvailableSlots(testResource.id, todayStr);
  if (!slotsRes.success || slotsRes.slots.length === 0) {
    throw new Error(`Expected getAvailableSlots to succeed: ${slotsRes.error}`);
  }
  console.log(`[PASS 2] getAvailableSlots generated ${slotsRes.slots.length} intervals for ${testResource.name}.`);

  // Pre-cleanup test reservations for idempotency
  await prisma.reservation.deleteMany({
    where: {
      title: { in: ['Server Action Test Meeting', 'Approval Required Action Test'] },
    },
  });

  // 3. Test createReservation
  console.log('[TEST 3] Testing createReservation action...');
  const testDate = new Date();
  testDate.setDate(testDate.getDate() + 4);
  testDate.setHours(14, 0, 0, 0);

  const startIso = testDate.toISOString();
  const endIso = new Date(testDate.getTime() + 60 * 60 * 1000).toISOString();

  const createRes = await createReservation({
    resourceId: testResource.id,
    userId: testUser.id,
    title: 'Server Action Test Meeting',
    purpose: 'Verifying createReservation server action pipeline',
    startTime: startIso,
    endTime: endIso,
  });

  if (!createRes.success || !createRes.reservation) {
    throw new Error(`Expected createReservation to succeed: ${createRes.error}`);
  }
  const createdId = createRes.reservation.id;
  console.log(`[PASS 3] createReservation succeeded: created ID ${createdId}.`);

  // 4. Test getUserReservations
  console.log('[TEST 4] Testing getUserReservations...');
  const userResList = await getUserReservations(testUser.id);
  if (!userResList.success) {
    throw new Error('Expected getUserReservations to succeed');
  }
  const found = userResList.all.some((r) => r.id === createdId);
  if (!found) {
    throw new Error('Expected newly created reservation to be present in user reservations');
  }
  console.log(`[PASS 4] getUserReservations found created reservation in active lists.`);

  // 5. Test cancelReservation
  console.log('[TEST 5] Testing cancelReservation action...');
  const cancelRes = await cancelReservation(createdId, testUser.id, 'Unit test cleanup');
  if (!cancelRes.success) {
    throw new Error(`Expected cancelReservation to succeed: ${cancelRes.error}`);
  }

  const verifyCancelled = await prisma.reservation.findUnique({ where: { id: createdId } });
  if (verifyCancelled?.status !== ReservationStatus.CANCELLED) {
    throw new Error('Expected status to be CANCELLED');
  }
  console.log('[PASS 5] cancelReservation successfully updated status to CANCELLED.');

  // 6. Test updateReservationStatus (Admin workflow)
  console.log('[TEST 6] Testing updateReservationStatus (Admin approval flow)...');
  // Create a pending reservation on an approval-required resource
  const approvalResource = resourcesRes.resources.find((r) => r.requiresApproval) || testResource;
  const pendingStart = new Date(testDate.getTime() + 3 * 3600 * 1000).toISOString();
  const pendingEnd = new Date(testDate.getTime() + 4 * 3600 * 1000).toISOString();

  const pendingCreate = await createReservation({
    resourceId: approvalResource.id,
    userId: testUser.id,
    title: 'Approval Required Action Test',
    startTime: pendingStart,
    endTime: pendingEnd,
  });

  if (!pendingCreate.success || !pendingCreate.reservation) {
    throw new Error(`Expected pending creation to succeed: ${pendingCreate.error}`);
  }
  const pendingId = pendingCreate.reservation.id;

  // Approve as Admin
  const approveRes = await updateReservationStatus(
    pendingId,
    ReservationStatus.CONFIRMED,
    'Approved by Admin in automated test',
    adminUser.id
  );
  if (!approveRes.success) {
    throw new Error(`Expected updateReservationStatus to succeed: ${approveRes.error}`);
  }
  console.log(`[PASS 6] updateReservationStatus successfully approved reservation ${pendingId}.`);

  // 7. Test toggleResourceMaintenance
  console.log('[TEST 7] Testing toggleResourceMaintenance...');
  // Place into maintenance
  const maintRes = await toggleResourceMaintenance(
    testResource.id,
    ResourceStatus.MAINTENANCE,
    {
      reason: 'Automated test filter replacement',
      performedBy: 'Test Runner',
    },
    adminUser.id
  );
  if (!maintRes.success) {
    throw new Error(`Expected toggleResourceMaintenance to succeed: ${maintRes.error}`);
  }

  const checkMaint = await prisma.resource.findUnique({ where: { id: testResource.id } });
  if (checkMaint?.status !== ResourceStatus.MAINTENANCE) {
    throw new Error('Expected resource status to be MAINTENANCE');
  }

  // Restore to AVAILABLE
  const restoreRes = await toggleResourceMaintenance(
    testResource.id,
    ResourceStatus.AVAILABLE,
    undefined,
    adminUser.id
  );
  if (!restoreRes.success) {
    throw new Error(`Expected restoring resource to AVAILABLE to succeed: ${restoreRes.error}`);
  }

  const checkAvailable = await prisma.resource.findUnique({ where: { id: testResource.id } });
  if (checkAvailable?.status !== ResourceStatus.AVAILABLE) {
    throw new Error('Expected resource status to be restored to AVAILABLE');
  }
  console.log('[PASS 7] toggleResourceMaintenance successfully switched to MAINTENANCE and back to AVAILABLE.');

  // 8. Test getAdminDashboardStats
  console.log('[TEST 8] Testing getAdminDashboardStats...');
  const statsRes = await getAdminDashboardStats();
  if (!statsRes.success || statsRes.stats.totalResources === 0) {
    throw new Error('Expected getAdminDashboardStats to return valid stats');
  }
  console.log(`[PASS 8] getAdminDashboardStats returned ${statsRes.stats.totalResources} total resources and ${statsRes.stats.availableCount} available.`);

  // Cleanup test reservations
  await prisma.reservation.deleteMany({
    where: { id: { in: [createdId, pendingId] } },
  });
  console.log('[INFO] Test records cleaned up successfully.');
  console.log('[SUCCESS] All Server Actions Verification Tests Passed!');
}

testServerActions()
  .catch((err) => {
    console.error('[ERROR] Server Actions verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
