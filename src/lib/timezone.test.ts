/**
 * SyncSpace Timezone & UTC Standardization Verification Suite
 *
 * Verifies:
 * 1. UTC ISO 8601 formatting and round-trip parsing.
 * 2. Client timezone offset conversions (GMT+05:30, GMT-04:00, UTC).
 * 3. parseLocalDateBoundary accuracy without day-shifting bugs.
 * 4. Localized time and range formatting across varied IANA timezones.
 * 5. getAvailableSlots alignment with client timezone offsets.
 * 6. PostgreSQL UTC persistence integrity.
 */

import {
  toUTCISOString,
  parseLocalDateBoundary,
  formatOffsetString,
  formatLocalTime,
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTimeRange,
  formatLocalDateTimeRange,
  formatFullWithTimezone,
} from './date-utils';
import { getAvailableSlots, createReservation } from '@/actions/reservations';
import prisma from '@/lib/prisma';

async function runTimezoneTests() {
  console.log('[TEST] Starting SyncSpace Timezone & UTC Standardization Verification Suite...');

  // -------------------------------------------------------------
  // TEST 1: UTC ISO 8601 Validation
  // -------------------------------------------------------------
  console.log('[TEST 1] Testing toUTCISOString standardization...');
  const testDate = new Date('2026-10-14T09:30:00.000Z');
  const isoFromDate = toUTCISOString(testDate);
  const isoFromString = toUTCISOString('2026-10-14T09:30:00.000Z');
  const isoFromEpoch = toUTCISOString(testDate.getTime());

  if (isoFromDate !== '2026-10-14T09:30:00.000Z' || isoFromString !== '2026-10-14T09:30:00.000Z' || isoFromEpoch !== '2026-10-14T09:30:00.000Z') {
    throw new Error(`[FAIL 1] toUTCISOString mismatch: got ${isoFromDate}`);
  }

  let errorCaught = false;
  try {
    toUTCISOString('invalid-date-string');
  } catch {
    errorCaught = true;
  }
  if (!errorCaught) {
    throw new Error('[FAIL 1] toUTCISOString failed to reject invalid date.');
  }
  console.log('[PASS 1] UTC ISO standardization verified for Date, string, and epoch number.');

  // -------------------------------------------------------------
  // TEST 2: Timezone Offset String Formatting
  // -------------------------------------------------------------
  console.log('[TEST 2] Testing formatOffsetString for diverse timezones...');
  const offsetColombo = formatOffsetString(-330); // UTC+5:30
  const offsetNewYork = formatOffsetString(240);  // UTC-4:00 (EDT)
  const offsetTokyo = formatOffsetString(-540);   // UTC+9:00
  const offsetUtc = formatOffsetString(0);        // UTC

  if (offsetColombo !== 'GMT+05:30') throw new Error(`[FAIL 2] Expected GMT+05:30, got ${offsetColombo}`);
  if (offsetNewYork !== 'GMT-04:00') throw new Error(`[FAIL 2] Expected GMT-04:00, got ${offsetNewYork}`);
  if (offsetTokyo !== 'GMT+09:00') throw new Error(`[FAIL 2] Expected GMT+09:00, got ${offsetTokyo}`);
  if (offsetUtc !== 'GMT+00:00') throw new Error(`[FAIL 2] Expected GMT+00:00, got ${offsetUtc}`);
  console.log('[PASS 2] Offset string formatting verified across eastern, western, and UTC zones.');

  // -------------------------------------------------------------
  // TEST 3: parseLocalDateBoundary & Zero-Day-Shift Math
  // -------------------------------------------------------------
  console.log('[TEST 3] Testing parseLocalDateBoundary across timezones...');
  
  // Test UTC midnight
  const utcBoundary = parseLocalDateBoundary('2026-10-14', 0);
  if (utcBoundary.start.toISOString() !== '2026-10-14T00:00:00.000Z') {
    throw new Error(`[FAIL 3] UTC start mismatch: got ${utcBoundary.start.toISOString()}`);
  }
  if (utcBoundary.end.toISOString() !== '2026-10-14T23:59:59.999Z') {
    throw new Error(`[FAIL 3] UTC end mismatch: got ${utcBoundary.end.toISOString()}`);
  }

  // Test Colombo (UTC+5:30, offsetMinutes = -330)
  // Local midnight Oct 14 00:00 is Oct 13 18:30 UTC
  const colomboBoundary = parseLocalDateBoundary('2026-10-14', -330);
  if (colomboBoundary.start.toISOString() !== '2026-10-13T18:30:00.000Z') {
    throw new Error(`[FAIL 3] Colombo start mismatch: got ${colomboBoundary.start.toISOString()}`);
  }
  if (colomboBoundary.end.toISOString() !== '2026-10-14T18:29:59.999Z') {
    throw new Error(`[FAIL 3] Colombo end mismatch: got ${colomboBoundary.end.toISOString()}`);
  }

  // Test New York (UTC-4:00, offsetMinutes = 240)
  // Local midnight Oct 14 00:00 is Oct 14 04:00 UTC
  const nyBoundary = parseLocalDateBoundary('2026-10-14', 240);
  if (nyBoundary.start.toISOString() !== '2026-10-14T04:00:00.000Z') {
    throw new Error(`[FAIL 3] New York start mismatch: got ${nyBoundary.start.toISOString()}`);
  }
  if (nyBoundary.end.toISOString() !== '2026-10-15T03:59:59.999Z') {
    throw new Error(`[FAIL 3] New York end mismatch: got ${nyBoundary.end.toISOString()}`);
  }

  // Duration must be exactly 24 hours minus 1 millisecond
  const durationColombo = colomboBoundary.end.getTime() - colomboBoundary.start.getTime();
  if (durationColombo !== 24 * 60 * 60 * 1000 - 1) {
    throw new Error(`[FAIL 3] Boundary duration must be exactly 24h - 1ms`);
  }
  console.log('[PASS 3] parseLocalDateBoundary correctly converts local calendar days to exact UTC spans.');

  // -------------------------------------------------------------
  // TEST 4: Multi-Timezone Display Formatting
  // -------------------------------------------------------------
  console.log('[TEST 4] Testing localized time and range formatting...');
  const sampleUtc = '2026-10-14T03:30:00.000Z'; // 03:30 UTC = 09:00 AM Colombo = 11:30 PM (prev day) NY
  const sampleEndUtc = '2026-10-14T05:00:00.000Z'; // 05:00 UTC = 10:30 AM Colombo

  const formattedColombo = formatLocalTime(sampleUtc, 'Asia/Colombo');
  if (formattedColombo !== '9:00 AM') {
    throw new Error(`[FAIL 4] Expected 9:00 AM in Colombo, got ${formattedColombo}`);
  }

  const formattedUtc = formatLocalTime(sampleUtc, 'UTC');
  if (formattedUtc !== '3:30 AM') {
    throw new Error(`[FAIL 4] Expected 3:30 AM in UTC, got ${formattedUtc}`);
  }

  const formattedRangeColombo = formatLocalTimeRange(sampleUtc, sampleEndUtc, 'Asia/Colombo');
  if (formattedRangeColombo !== '9:00 AM - 10:30 AM') {
    throw new Error(`[FAIL 4] Expected 9:00 AM - 10:30 AM in Colombo, got ${formattedRangeColombo}`);
  }

  const rangeDetails = formatLocalDateTimeRange(sampleUtc, sampleEndUtc, 'Asia/Colombo');
  if (rangeDetails.durationLabel !== '1 hr 30 min') {
    throw new Error(`[FAIL 4] Duration label mismatch: got ${rangeDetails.durationLabel}`);
  }

  const fullAuditString = formatFullWithTimezone(sampleUtc, 'Asia/Colombo');
  if (!fullAuditString.includes('Asia/Colombo') || !fullAuditString.includes('9:00 AM')) {
    throw new Error(`[FAIL 4] Full timezone audit string mismatch: got ${fullAuditString}`);
  }
  console.log('[PASS 4] Multi-timezone formatting outputs verified across Intl engines.');

  // -------------------------------------------------------------
  // TEST 5: getAvailableSlots Client Offset Alignment
  // -------------------------------------------------------------
  console.log('[TEST 5] Testing getAvailableSlots with client timezone offset...');
  const anyResource = await prisma.resource.findFirst({ select: { id: true, name: true } });
  if (!anyResource) throw new Error('[FAIL 5] No resource found in database.');

  // Query slots with Colombo offset (-330)
  const colomboSlots = await getAvailableSlots(anyResource.id, '2026-10-14', -330);
  if (!colomboSlots.success || colomboSlots.slots.length !== 24) {
    throw new Error(`[FAIL 5] Expected 24 operating slots, got ${colomboSlots.slots.length}`);
  }

  const firstSlot = colomboSlots.slots[0];
  // 08:00 AM Colombo is 02:30 AM UTC
  if (firstSlot.startTime !== '2026-10-14T02:30:00.000Z') {
    throw new Error(`[FAIL 5] Expected first slot start to be 2026-10-14T02:30:00.000Z, got ${firstSlot.startTime}`);
  }
  if (firstSlot.formattedTime !== '8:00 AM - 8:30 AM') {
    throw new Error(`[FAIL 5] Expected first slot label to be 8:00 AM - 8:30 AM, got ${firstSlot.formattedTime}`);
  }

  // Query slots with New York offset (240)
  const nySlots = await getAvailableSlots(anyResource.id, '2026-10-14', 240);
  if (!nySlots.success) throw new Error('[FAIL 5] NY slots call failed.');
  const firstNySlot = nySlots.slots[0];
  // 08:00 AM NY is 12:00 PM UTC
  if (firstNySlot.startTime !== '2026-10-14T12:00:00.000Z') {
    throw new Error(`[FAIL 5] Expected first NY slot start to be 2026-10-14T12:00:00.000Z, got ${firstNySlot.startTime}`);
  }
  console.log('[PASS 5] getAvailableSlots correctly aligns operating hours with client timezone offsets.');

  // -------------------------------------------------------------
  // TEST 6: PostgreSQL UTC Persistence Round-Trip
  // -------------------------------------------------------------
  console.log('[TEST 6] Testing PostgreSQL UTC round-trip persistence...');
  const testUser = await prisma.user.findFirst({ select: { id: true } });
  if (!testUser) throw new Error('[FAIL 6] No user found for booking test.');

  const targetUtcStart = '2026-12-01T04:30:00.000Z';
  const targetUtcEnd = '2026-12-01T05:30:00.000Z';

  const bookingRes = await createReservation({
    resourceId: anyResource.id,
    userId: testUser.id,
    title: 'Timezone Integrity Test Reservation',
    purpose: 'Verifying UTC timestamp storage in PostgreSQL',
    startTime: targetUtcStart,
    endTime: targetUtcEnd,
  });

  if (!bookingRes.success || !bookingRes.reservation) {
    throw new Error(`[FAIL 6] Failed to create test reservation: ${bookingRes.error}`);
  }

  // Fetch directly from Prisma without transformation
  const fetched = await prisma.reservation.findUnique({
    where: { id: bookingRes.reservation.id },
  });

  if (!fetched) throw new Error('[FAIL 6] Reservation not found in database.');

  if (fetched.startTime.toISOString() !== targetUtcStart) {
    throw new Error(`[FAIL 6] UTC start mismatch: expected ${targetUtcStart}, got ${fetched.startTime.toISOString()}`);
  }
  if (fetched.endTime.toISOString() !== targetUtcEnd) {
    throw new Error(`[FAIL 6] UTC end mismatch: expected ${targetUtcEnd}, got ${fetched.endTime.toISOString()}`);
  }

  // Cleanup
  await prisma.reservation.delete({ where: { id: fetched.id } });
  console.log('[PASS 6] PostgreSQL verified: timestamps stored and retrieved as exact UTC ISO strings.');

  console.log('--- ALL TIMEZONE & UTC STANDARDIZATION TESTS PASSED (6/6) ---');
}

runTimezoneTests()
  .catch((err) => {
    console.error('[FATAL ERROR IN TIMEZONE TEST SUITE]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
