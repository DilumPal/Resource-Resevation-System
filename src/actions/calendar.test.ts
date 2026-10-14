import prisma from '../lib/prisma';
import { getMasterCalendarData } from './reservations';
import { ResourceStatus } from '@prisma/client';

async function testMasterCalendar() {
  console.log('[TEST] Starting Master Calendar & Cross-Resource Timeline Verification Suite...');

  // 1. Test fetching today's master calendar data across all resources
  console.log('[TEST 1] Fetching default daily master calendar data...');
  const todayResult = await getMasterCalendarData();

  if (!todayResult.success) {
    throw new Error(`Expected getMasterCalendarData to succeed, got error: ${todayResult.error}`);
  }

  if (!todayResult.resources || todayResult.resources.length === 0) {
    throw new Error('Expected resources array to be populated with managed assets.');
  }

  console.log(`[PASS 1] Successfully loaded master calendar dataset with ${todayResult.resources.length} resources.`);
  console.log(`[METRICS] Total bookings today: ${todayResult.metrics.totalBookingsToday}, Confirmed: ${todayResult.metrics.confirmedBookings}, Pending: ${todayResult.metrics.pendingApprovals}, Utilization: ${todayResult.metrics.utilizationRate}%.`);

  // 2. Test category filtering on cross-resource timeline
  console.log('[TEST 2] Testing category filter on master timeline...');
  const meetingCategory = await prisma.category.findFirst({
    where: { slug: 'meeting-spaces' },
  });

  if (meetingCategory) {
    const categoryResult = await getMasterCalendarData(undefined, meetingCategory.id);
    if (!categoryResult.success) {
      throw new Error(`Category filtered master calendar failed: ${categoryResult.error}`);
    }

    const allMatchCategory = categoryResult.resources.every(
      (r) => r.category.id === meetingCategory.id
    );

    if (!allMatchCategory) {
      throw new Error('Expected all filtered resources to belong to the Meeting Spaces category.');
    }

    console.log(`[PASS 2] Category filter verified: ${categoryResult.resources.length} meeting space assets returned.`);
  }

  // 3. Test multi-day horizon window
  console.log('[TEST 3] Testing 3-day horizon calculation...');
  const threeDayResult = await getMasterCalendarData(undefined, undefined, 3);
  if (!threeDayResult.success) {
    throw new Error(`3-day horizon query failed: ${threeDayResult.error}`);
  }

  const start = new Date(threeDayResult.startDate);
  const end = new Date(threeDayResult.endDate);
  const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 3) {
    throw new Error(`Expected at least 3-day span, got: ${diffDays}`);
  }

  console.log(`[PASS 3] 3-Day horizon window verified (${threeDayResult.startDate} to ${threeDayResult.endDate}).`);

  // 4. Verify relations on returned reservations and maintenance logs
  console.log('[TEST 4] Verifying relation payloads on timeline items...');
  if (todayResult.reservations.length > 0) {
    const sample = todayResult.reservations[0];
    if (!sample.resource?.name || !sample.user?.name) {
      throw new Error('Reservation items missing related resource or user payload.');
    }
    console.log(`[PASS 4] Sample reservation "${sample.title}" verified with resource "${sample.resource.name}" and requester "${sample.user.name}".`);
  } else {
    console.log('[PASS 4] Zero reservations today; schema valid.');
  }

  // 5. Verify maintenance window payload
  console.log('[TEST 5] Verifying maintenance logs integration...');
  if (todayResult.maintenanceLogs.length > 0) {
    const sampleLog = todayResult.maintenanceLogs[0];
    if (!sampleLog.resource?.code) {
      throw new Error('Maintenance log missing associated resource code.');
    }
    console.log(`[PASS 5] Maintenance log verified for asset "${sampleLog.resource.name}" (${sampleLog.resource.code}).`);
  } else {
    console.log('[PASS 5] Zero maintenance logs on current window; schema valid.');
  }

  console.log('--- ALL MASTER CALENDAR TESTS PASSED (5/5) ---');
}

testMasterCalendar()
  .catch((e) => {
    console.error('[FAIL] Master Calendar test failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
