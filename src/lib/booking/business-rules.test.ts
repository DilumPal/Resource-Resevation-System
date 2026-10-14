/**
 * SyncSpace Business Rules & Constraints Verification Suite
 *
 * Verifies enterprise rule enforcement:
 * 1. Rejection of past bookings (past time, yesterday, beyond grace period).
 * 2. Clock-skew grace window tolerance (within 60 seconds).
 * 3. Minimum duration enforcement (minimum 15 minutes).
 * 4. Maximum duration enforcement (maximum 8 hours / 480 minutes).
 * 5. Inverted time interval rejection (start >= end).
 * 6. Maximum advance horizon enforcement (maximum 90 days).
 * 7. Server action createReservation atomic enforcement of all business rules.
 */

import prisma from '@/lib/prisma';
import {
  BUSINESS_RULES,
  validateTimeRange,
  atomicCheckAndReserve,
  BookingConflictError,
} from './conflict-engine';
import { createReservation } from '@/actions/reservations';

async function runBusinessRulesTests() {
  console.log('[TEST] Starting SyncSpace Business Rules & Duration Limits Verification Suite...');

  const now = new Date();
  const futureHour = (h: number) => new Date(now.getTime() + h * 3600 * 1000);
  const futureDays = (d: number) => new Date(now.getTime() + d * 24 * 3600 * 1000);

  // -------------------------------------------------------------
  // TEST 1: No Past Bookings Rule
  // -------------------------------------------------------------
  console.log('[TEST 1] Testing past booking rejections...');

  // 1 hour ago
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
  const pastCheck1 = validateTimeRange(oneHourAgo, futureHour(1), false);
  if (pastCheck1.valid || pastCheck1.errorType !== 'PAST_TIME') {
    throw new Error(`[FAIL 1] Expected 1h past booking to be rejected with PAST_TIME, got: ${JSON.stringify(pastCheck1)}`);
  }

  // Yesterday
  const yesterday = new Date(now.getTime() - 24 * 3600 * 1000);
  const pastCheck2 = validateTimeRange(yesterday, now, false);
  if (pastCheck2.valid || pastCheck2.errorType !== 'PAST_TIME') {
    throw new Error(`[FAIL 1] Expected yesterday booking to be rejected with PAST_TIME`);
  }

  // 10 minutes ago
  const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);
  const pastCheck3 = validateTimeRange(tenMinsAgo, futureHour(1), false);
  if (pastCheck3.valid || pastCheck3.errorType !== 'PAST_TIME') {
    throw new Error(`[FAIL 1] Expected 10m past booking to be rejected`);
  }

  // Boundary condition: within 60s grace period is permitted for network latency
  const thirtySecsAgo = new Date(now.getTime() - 30 * 1000);
  const graceCheck = validateTimeRange(thirtySecsAgo, futureHour(1), false);
  if (!graceCheck.valid) {
    throw new Error(`[FAIL 1] Expected 30s clock skew within 60s grace period to pass`);
  }

  // Explicit allowPast flag (for historical audit tests)
  const allowedPastCheck = validateTimeRange(oneHourAgo, futureHour(1), true);
  if (!allowedPastCheck.valid) {
    throw new Error(`[FAIL 1] Expected allowPast=true to bypass past check for admin audits`);
  }

  console.log('[PASS 1] Past booking rejection verified (strict future requirement + clock skew grace window).');

  // -------------------------------------------------------------
  // TEST 2: Minimum Duration Limit (15 Minutes)
  // -------------------------------------------------------------
  console.log('[TEST 2] Testing minimum duration enforcement (15 min)...');

  const startFuture = futureHour(2);

  // 5 minutes
  const fiveMinEnd = new Date(startFuture.getTime() + 5 * 60 * 1000);
  const minCheck5 = validateTimeRange(startFuture, fiveMinEnd, false);
  if (minCheck5.valid || minCheck5.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 2] Expected 5m duration to be rejected, got: ${JSON.stringify(minCheck5)}`);
  }

  // 10 minutes
  const tenMinEnd = new Date(startFuture.getTime() + 10 * 60 * 1000);
  const minCheck10 = validateTimeRange(startFuture, tenMinEnd, false);
  if (minCheck10.valid || minCheck10.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 2] Expected 10m duration to be rejected`);
  }

  // 14 minutes
  const fourteenMinEnd = new Date(startFuture.getTime() + 14 * 60 * 1000);
  const minCheck14 = validateTimeRange(startFuture, fourteenMinEnd, false);
  if (minCheck14.valid || minCheck14.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 2] Expected 14m duration to be rejected`);
  }

  // Exactly 15 minutes (threshold)
  const fifteenMinEnd = new Date(startFuture.getTime() + 15 * 60 * 1000);
  const minCheck15 = validateTimeRange(startFuture, fifteenMinEnd, false);
  if (!minCheck15.valid) {
    throw new Error(`[FAIL 2] Expected 15m duration to pass minimum limit`);
  }

  // 30 minutes standard slot
  const thirtyMinEnd = new Date(startFuture.getTime() + 30 * 60 * 1000);
  const minCheck30 = validateTimeRange(startFuture, thirtyMinEnd, false);
  if (!minCheck30.valid) {
    throw new Error(`[FAIL 2] Expected 30m duration to pass`);
  }

  console.log('[PASS 2] Minimum duration limits enforced: < 15 min rejected, >= 15 min accepted.');

  // -------------------------------------------------------------
  // TEST 3: Inverted Time Ranges (start >= end)
  // -------------------------------------------------------------
  console.log('[TEST 3] Testing inverted time ranges...');

  // start == end (0 duration)
  const zeroDurationCheck = validateTimeRange(startFuture, startFuture, false);
  if (zeroDurationCheck.valid || zeroDurationCheck.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 3] Expected 0-duration reservation to be rejected`);
  }

  // start > end (negative duration)
  const invertedCheck = validateTimeRange(futureHour(3), futureHour(2), false);
  if (invertedCheck.valid || invertedCheck.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 3] Expected inverted start/end to be rejected`);
  }

  console.log('[PASS 3] Inverted and zero-duration intervals strictly rejected.');

  // -------------------------------------------------------------
  // TEST 4: Maximum Duration Limit (8 Hours / 480 Minutes)
  // -------------------------------------------------------------
  console.log('[TEST 4] Testing maximum duration enforcement (8 hours)...');

  // 4 hours (within limit)
  const fourHourEnd = new Date(startFuture.getTime() + 4 * 3600 * 1000);
  const maxCheck4 = validateTimeRange(startFuture, fourHourEnd, false);
  if (!maxCheck4.valid) {
    throw new Error(`[FAIL 4] Expected 4-hour reservation to pass`);
  }

  // Exactly 8 hours (threshold)
  const eightHourEnd = new Date(startFuture.getTime() + 8 * 3600 * 1000);
  const maxCheck8 = validateTimeRange(startFuture, eightHourEnd, false);
  if (!maxCheck8.valid) {
    throw new Error(`[FAIL 4] Expected 8-hour reservation to pass threshold`);
  }

  // 8 hours and 15 minutes (exceeded)
  const eightHourFifteenEnd = new Date(startFuture.getTime() + (8 * 60 + 15) * 60 * 1000);
  const maxCheckOver = validateTimeRange(startFuture, eightHourFifteenEnd, false);
  if (maxCheckOver.valid || maxCheckOver.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 4] Expected 8h 15m to be rejected with INVALID_DURATION, got: ${JSON.stringify(maxCheckOver)}`);
  }

  // 12 hours (exceeded)
  const twelveHourEnd = new Date(startFuture.getTime() + 12 * 3600 * 1000);
  const maxCheck12 = validateTimeRange(startFuture, twelveHourEnd, false);
  if (maxCheck12.valid || maxCheck12.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 4] Expected 12-hour reservation to be rejected`);
  }

  // 24 hours (exceeded)
  const dayEnd = new Date(startFuture.getTime() + 24 * 3600 * 1000);
  const maxCheck24 = validateTimeRange(startFuture, dayEnd, false);
  if (maxCheck24.valid || maxCheck24.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 4] Expected 24-hour reservation to be rejected`);
  }

  console.log('[PASS 4] Maximum duration limits enforced: <= 8 hours permitted, > 8 hours rejected.');

  // -------------------------------------------------------------
  // TEST 5: Maximum Advance Booking Limit (90 Days)
  // -------------------------------------------------------------
  console.log('[TEST 5] Testing maximum advance booking horizon (90 days)...');

  // 30 days in advance (within limit)
  const thirtyDaysStart = futureDays(30);
  const thirtyDaysEnd = new Date(thirtyDaysStart.getTime() + 3600 * 1000);
  const advCheck30 = validateTimeRange(thirtyDaysStart, thirtyDaysEnd, false);
  if (!advCheck30.valid) {
    throw new Error(`[FAIL 5] Expected 30-day advance booking to pass`);
  }

  // 89 days in advance (within limit)
  const eightyNineDaysStart = futureDays(89);
  const eightyNineDaysEnd = new Date(eightyNineDaysStart.getTime() + 3600 * 1000);
  const advCheck89 = validateTimeRange(eightyNineDaysStart, eightyNineDaysEnd, false);
  if (!advCheck89.valid) {
    throw new Error(`[FAIL 5] Expected 89-day advance booking to pass`);
  }

  // 95 days in advance (exceeded)
  const ninetyFiveDaysStart = futureDays(95);
  const ninetyFiveDaysEnd = new Date(ninetyFiveDaysStart.getTime() + 3600 * 1000);
  const advCheck95 = validateTimeRange(ninetyFiveDaysStart, ninetyFiveDaysEnd, false);
  if (advCheck95.valid || advCheck95.errorType !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 5] Expected 95-day advance booking to be rejected, got: ${JSON.stringify(advCheck95)}`);
  }

  console.log('[PASS 5] 90-Day advance booking horizon policy verified.');

  // -------------------------------------------------------------
  // TEST 6: Atomic createReservation Server Action Enforcements
  // -------------------------------------------------------------
  console.log('[TEST 6] Testing atomic createReservation server action enforcement...');

  const anyResource = await prisma.resource.findFirstOrThrow({ select: { id: true, name: true } });
  const anyUser = await prisma.user.findFirstOrThrow({ select: { id: true } });

  // Test 6.1: Direct past booking submission via createReservation
  const pastRes = await createReservation({
    resourceId: anyResource.id,
    userId: anyUser.id,
    title: 'Unauthorized Past Booking Attempt',
    startTime: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
    endTime: new Date(now.getTime() - 3600 * 1000).toISOString(),
  });
  if (pastRes.success || pastRes.conflictCode !== 'PAST_TIME') {
    throw new Error(`[FAIL 6.1] Expected createReservation to reject past booking, got: ${JSON.stringify(pastRes)}`);
  }

  // Test 6.2: 5-minute booking submission via createReservation
  const shortRes = await createReservation({
    resourceId: anyResource.id,
    userId: anyUser.id,
    title: 'Unauthorized Short Booking Attempt',
    startTime: futureDays(1).toISOString(),
    endTime: new Date(futureDays(1).getTime() + 5 * 60 * 1000).toISOString(),
  });
  if (shortRes.success || shortRes.conflictCode !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 6.2] Expected createReservation to reject 5m booking, got: ${JSON.stringify(shortRes)}`);
  }

  // Test 6.3: 10-hour booking submission via createReservation
  const longRes = await createReservation({
    resourceId: anyResource.id,
    userId: anyUser.id,
    title: 'Unauthorized Long Booking Attempt',
    startTime: futureDays(2).toISOString(),
    endTime: new Date(futureDays(2).getTime() + 10 * 3600 * 1000).toISOString(),
  });
  if (longRes.success || longRes.conflictCode !== 'INVALID_DURATION') {
    throw new Error(`[FAIL 6.3] Expected createReservation to reject 10h booking, got: ${JSON.stringify(longRes)}`);
  }

  // Test 6.4: Valid compliant reservation succeeds
  const validStart = new Date(futureDays(4).getTime());
  validStart.setHours(14, 0, 0, 0);
  const validEnd = new Date(validStart.getTime() + 60 * 60 * 1000); // 1 hour

  const validRes = await createReservation({
    resourceId: anyResource.id,
    userId: anyUser.id,
    title: 'Compliant Business Rules Verification Booking',
    startTime: validStart.toISOString(),
    endTime: validEnd.toISOString(),
  });

  if (!validRes.success || !validRes.reservation) {
    throw new Error(`[FAIL 6.4] Expected valid booking to succeed, got: ${JSON.stringify(validRes)}`);
  }

  // Clean up
  await prisma.reservation.delete({ where: { id: validRes.reservation.id } });

  console.log('[PASS 6] createReservation server action enforces all business rules atomically.');

  console.log('--- ALL BUSINESS RULES & DURATION LIMITS TESTS PASSED (6/6) ---');
}

runBusinessRulesTests()
  .catch((err) => {
    console.error('[FATAL ERROR IN BUSINESS RULES TEST SUITE]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
