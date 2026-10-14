import prisma from '../lib/prisma';
import { updateReservationStatus, getApprovalQueueData } from './reservations';
import { ResourceStatus, ReservationStatus, Role } from '@prisma/client';

async function testApprovalHub() {
  console.log('[TEST] Starting Approval Hub & Review Queue Verification Suite...');

  // 1. Fetch test users
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const member = await prisma.user.findFirst({ where: { role: Role.MEMBER } });
  if (!admin || !member) throw new Error('Missing admin or member user in database.');

  // 2. Fetch a resource requiring approval
  let approvalResource = await prisma.resource.findFirst({
    where: { requiresApproval: true, status: ResourceStatus.AVAILABLE },
  });

  if (!approvalResource) {
    // If none exists, fetch any available resource
    approvalResource = await prisma.resource.findFirst({
      where: { status: ResourceStatus.AVAILABLE },
    });
  }

  if (!approvalResource) throw new Error('No available resource found for test.');

  console.log(`[TEST 1] Using resource "${approvalResource.name}" (${approvalResource.code})...`);

  // Create unique future time slots for test
  const futureBase = new Date();
  futureBase.setDate(futureBase.getDate() + 14); // 2 weeks out

  const slot1Start = new Date(futureBase);
  slot1Start.setHours(10, 0, 0, 0);
  const slot1End = new Date(futureBase);
  slot1End.setHours(11, 30, 0, 0);

  // 3. Create a test pending reservation directly
  const pendingReservation = await prisma.reservation.create({
    data: {
      resourceId: approvalResource.id,
      userId: member.id,
      title: 'Automated Approval Hub Test - Request 1',
      purpose: 'Validation test for one-click approval flow.',
      startTime: slot1Start,
      endTime: slot1End,
      status: ReservationStatus.PENDING,
    },
    include: { resource: true, user: true },
  });

  console.log(`[TEST 2] Created PENDING reservation ${pendingReservation.id}.`);

  // 4. Test unauthorized approval attempt by a MEMBER
  console.log('[TEST 3] Testing non-admin authorization guard on approval...');
  const unauthorizedRes = await updateReservationStatus(
    pendingReservation.id,
    ReservationStatus.CONFIRMED,
    undefined,
    member.id
  );

  if (unauthorizedRes.success) {
    throw new Error('Expected member to be rejected with 403 authorization error.');
  }
  console.log('[PASS 1] Member blocked from updating reservation approval status.');

  // 5. Test queue data fetch
  console.log('[TEST 4] Testing getApprovalQueueData...');
  const queueData = await getApprovalQueueData();
  if (!queueData.success) {
    throw new Error(`getApprovalQueueData failed: ${queueData.error}`);
  }
  const foundInQueue = queueData.pending.some((p) => p.id === pendingReservation.id);
  if (!foundInQueue) {
    throw new Error('Expected created pending reservation to appear in approval queue.');
  }
  console.log(`[PASS 2] Pending reservation verified in queue (Total pending: ${queueData.pending.length}).`);

  // 6. Test one-click approve as ADMIN
  console.log('[TEST 5] Testing one-click approve as Administrator...');
  const approveRes = await updateReservationStatus(
    pendingReservation.id,
    ReservationStatus.CONFIRMED,
    undefined,
    admin.id
  );

  if (!approveRes.success) {
    throw new Error(`Admin approval failed: ${approveRes.error}`);
  }

  const checkApproved = await prisma.reservation.findUnique({
    where: { id: pendingReservation.id },
  });

  if (checkApproved?.status !== ReservationStatus.CONFIRMED) {
    throw new Error(`Expected status CONFIRMED, got: ${checkApproved?.status}`);
  }
  console.log('[PASS 3] One-click approval succeeded. Status is now CONFIRMED.');

  // 7. Test reject with feedback note
  console.log('[TEST 6] Testing reject with feedback note...');
  const slot2Start = new Date(futureBase);
  slot2Start.setHours(14, 0, 0, 0);
  const slot2End = new Date(futureBase);
  slot2End.setHours(16, 0, 0, 0);

  const pendingReject = await prisma.reservation.create({
    data: {
      resourceId: approvalResource.id,
      userId: member.id,
      title: 'Automated Approval Hub Test - Request 2 (Reject)',
      purpose: 'Validation test for reject flow with feedback note.',
      startTime: slot2Start,
      endTime: slot2End,
      status: ReservationStatus.PENDING,
    },
  });

  const feedbackReason = 'Schedule conflict with priority executive board meeting in central wing.';
  const rejectRes = await updateReservationStatus(
    pendingReject.id,
    ReservationStatus.REJECTED,
    feedbackReason,
    admin.id
  );

  if (!rejectRes.success) {
    throw new Error(`Admin rejection failed: ${rejectRes.error}`);
  }

  const checkRejected = await prisma.reservation.findUnique({
    where: { id: pendingReject.id },
  });

  if (checkRejected?.status !== ReservationStatus.REJECTED) {
    throw new Error(`Expected status REJECTED, got: ${checkRejected?.status}`);
  }

  if (checkRejected?.rejectionReason !== feedbackReason) {
    throw new Error(`Expected rejectionReason "${feedbackReason}", got: "${checkRejected?.rejectionReason}"`);
  }
  console.log('[PASS 4] Rejection succeeded with feedback note properly recorded in database.');

  // Clean up test records
  await prisma.reservation.deleteMany({
    where: {
      id: { in: [pendingReservation.id, pendingReject.id] },
    },
  });

  console.log('[PASS 5] Test records cleaned up successfully.');
  console.log('--- ALL APPROVAL HUB TESTS PASSED (5/5) ---');
}

testApprovalHub()
  .catch((e) => {
    console.error('[FAIL] Approval Hub test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
