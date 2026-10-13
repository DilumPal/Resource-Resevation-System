import prisma from '@/lib/prisma';
import {
  checkReservationConflict,
  atomicCheckAndReserve,
  validateTimeRange,
  BookingConflictError,
} from './conflict-engine';

async function runVerification() {
  console.log('[TEST] Beginning Conflict Engine Verification Suite...');

  // 1. Test validateTimeRange
  console.log('[TEST 1] Testing basic time range validation...');
  const now = new Date();
  const past = new Date(now.getTime() - 3600 * 1000);
  const futureStart = new Date(now.getTime() + 3600 * 1000);
  const futureEnd = new Date(now.getTime() + 7200 * 1000);

  const pastCheck = validateTimeRange(past, futureStart, false);
  if (pastCheck.valid || pastCheck.errorType !== 'PAST_TIME') {
    throw new Error('Expected past booking to be rejected');
  }

  const invertedCheck = validateTimeRange(futureEnd, futureStart, true);
  if (invertedCheck.valid || invertedCheck.errorType !== 'INVALID_DURATION') {
    throw new Error('Expected inverted start/end to be rejected');
  }

  const validCheck = validateTimeRange(futureStart, futureEnd, false);
  if (!validCheck.valid) {
    throw new Error('Expected valid time range to pass');
  }
  console.log('[PASS 1] Time range validation passed.');

  // Find Boardroom Alpha (which has bufferMinutes = 15)
  const boardroom = await prisma.resource.findUniqueOrThrow({
    where: { code: 'CR-01' },
  });

  const member = await prisma.user.findFirstOrThrow({
    where: { role: 'MEMBER' },
  });

  // Base slot for testing: tomorrow 10:00 to 11:00
  const tomorrowBase = new Date();
  tomorrowBase.setDate(tomorrowBase.getDate() + 3);
  tomorrowBase.setHours(10, 0, 0, 0);

  const slot1Start = new Date(tomorrowBase);
  const slot1End = new Date(tomorrowBase.getTime() + 60 * 60 * 1000); // 10:00 - 11:00

  // Pre-clean any test reservations for idempotency
  await prisma.reservation.deleteMany({
    where: {
      title: {
        in: ['Automated Test Meeting A', 'Concurrent Attempt 1', 'Concurrent Attempt 2'],
      },
    },
  });

  // 2. Book Slot 1
  console.log('[TEST 2] Testing successful atomic reservation...');
  const res1 = await atomicCheckAndReserve({
    resourceId: boardroom.id,
    userId: member.id,
    title: 'Automated Test Meeting A',
    startTime: slot1Start,
    endTime: slot1End,
  });
  console.log(`[PASS 2] Slot 1 booked successfully: ID ${res1.reservation.id}`);

  // 3. Test Direct Overlap (e.g. 10:30 to 11:30)
  console.log('[TEST 3] Testing direct overlap rejection...');
  const overlapStart = new Date(slot1Start.getTime() + 30 * 60 * 1000);
  const overlapEnd = new Date(slot1End.getTime() + 30 * 60 * 1000);

  const directConflict = await checkReservationConflict(prisma, {
    resourceId: boardroom.id,
    startTime: overlapStart,
    endTime: overlapEnd,
  });

  if (!directConflict.hasConflict || directConflict.conflictType !== 'OVERLAPPING_RESERVATION') {
    throw new Error('Expected direct overlap to be flagged as conflict');
  }
  console.log('[PASS 3] Direct overlap correctly detected and blocked.');

  // 4. Test Buffer Conflict (CR-01 has 15m buffer. Attempting 11:05 to 12:00 should conflict)
  console.log('[TEST 4] Testing turnaround buffer conflict rejection...');
  const bufferConflictStart = new Date(slot1End.getTime() + 5 * 60 * 1000); // 11:05 (within 15m buffer)
  const bufferConflictEnd = new Date(slot1End.getTime() + 60 * 60 * 1000);

  const bufferConflict = await checkReservationConflict(prisma, {
    resourceId: boardroom.id,
    startTime: bufferConflictStart,
    endTime: bufferConflictEnd,
  });

  if (!bufferConflict.hasConflict || bufferConflict.conflictType !== 'OVERLAPPING_RESERVATION') {
    throw new Error('Expected buffer collision to be flagged as conflict');
  }
  console.log('[PASS 4] Buffer violation correctly detected and blocked.');

  // 5. Test Non-Conflicting Slot after Buffer (11:15 to 12:15)
  console.log('[TEST 5] Testing slot immediately after turnaround buffer...');
  const bufferClearStart = new Date(slot1End.getTime() + 15 * 60 * 1000); // 11:15
  const bufferClearEnd = new Date(bufferClearStart.getTime() + 60 * 60 * 1000);

  const bufferClear = await checkReservationConflict(prisma, {
    resourceId: boardroom.id,
    startTime: bufferClearStart,
    endTime: bufferClearEnd,
  });

  if (bufferClear.hasConflict) {
    throw new Error(`Expected clean slot after buffer to be available, but got: ${bufferClear.message}`);
  }
  console.log('[PASS 5] Slot after turnaround buffer is available as expected.');

  // 6. Test Maintenance Conflict
  console.log('[TEST 6] Testing maintenance window collision detection...');
  const shuttle = await prisma.resource.findUniqueOrThrow({
    where: { code: 'VH-02' },
    include: { maintenanceLogs: true },
  });

  if (shuttle.maintenanceLogs.length > 0) {
    const maint = shuttle.maintenanceLogs[0];
    const maintCheck = await checkReservationConflict(prisma, {
      resourceId: shuttle.id,
      startTime: new Date(maint.startTime.getTime() + 3600 * 1000),
      endTime: new Date(maint.startTime.getTime() + 7200 * 1000),
      allowPastBooking: true,
    });

    if (!maintCheck.hasConflict || maintCheck.conflictType !== 'MAINTENANCE') {
      throw new Error('Expected maintenance period to be flagged as conflict');
    }
    console.log('[PASS 6] Maintenance collision correctly detected and blocked.');
  }

  // 7. Test Concurrency / Race Condition Guard
  console.log('[TEST 7] Testing concurrent race condition handling...');
  const concurrentSlotStart = new Date(tomorrowBase.getTime() + 5 * 3600 * 1000);
  const concurrentSlotEnd = new Date(concurrentSlotStart.getTime() + 60 * 60 * 1000);

  const attempt1 = atomicCheckAndReserve({
    resourceId: boardroom.id,
    userId: member.id,
    title: 'Concurrent Attempt 1',
    startTime: concurrentSlotStart,
    endTime: concurrentSlotEnd,
  });

  const attempt2 = atomicCheckAndReserve({
    resourceId: boardroom.id,
    userId: member.id,
    title: 'Concurrent Attempt 2',
    startTime: concurrentSlotStart,
    endTime: concurrentSlotEnd,
  });

  const results = await Promise.allSettled([attempt1, attempt2]);
  const fulfilled = results.filter((r) => r.status === 'fulfilled');
  const rejected = results.filter((r) => r.status === 'rejected');

  if (fulfilled.length !== 1 || rejected.length !== 1) {
    throw new Error(`Expected exactly 1 fulfilled and 1 rejected booking, got ${fulfilled.length} fulfilled and ${rejected.length} rejected.`);
  }

  const rejectedError = (rejected[0] as PromiseRejectedResult).reason;
  if (!(rejectedError instanceof BookingConflictError)) {
    throw new Error(`Expected rejected booking to throw BookingConflictError, got ${rejectedError}`);
  }
  console.log('[PASS 7] Race condition successfully resolved: exactly one reservation committed, the other rejected with BookingConflictError.');

  // Clean up test reservations created during this test run
  const testIds = [
    res1.reservation.id,
    (fulfilled[0] as PromiseFulfilledResult<{ reservation: { id: string } }>).value.reservation.id,
  ];
  await prisma.reservation.deleteMany({
    where: { id: { in: testIds } },
  });
  console.log(`[INFO] Cleaned up ${testIds.length} test reservation records.`);

  console.log('[SUCCESS] All 7 Conflict Engine Verification Tests Passed Successfully!');
}

runVerification()
  .catch((err) => {
    console.error('[ERROR] Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
