import prisma from '../lib/prisma';
import { toggleResourceMaintenance } from './resources';
import { checkSlotConflict } from './reservations';
import { ResourceStatus, MaintenanceStatus, Role } from '@prisma/client';

async function testMaintenanceMode() {
  console.log('[TEST] Starting Maintenance Mode Verification Suite...');

  // 1. Fetch test users
  const admin = await prisma.user.findFirst({ where: { role: Role.ADMIN } });
  const member = await prisma.user.findFirst({ where: { role: Role.MEMBER } });
  if (!admin || !member) throw new Error('Missing admin or member user in database.');

  // 2. Fetch a test resource
  const resource = await prisma.resource.findFirst({
    where: { status: ResourceStatus.AVAILABLE },
  });
  if (!resource) throw new Error('No available resource found for test.');

  console.log(`[TEST 1] Testing non-admin authorization guard on resource "${resource.name}"...`);
  const unauthorizedRes = await toggleResourceMaintenance(
    resource.id,
    ResourceStatus.MAINTENANCE,
    { reason: 'Unauthorized maintenance attempt' },
    member.id
  );

  if (unauthorizedRes.success) {
    throw new Error('Non-admin member should not be permitted to toggle maintenance mode.');
  }
  console.log('[PASS 1] Non-admin authorization guard successfully rejected.');

  console.log(`[TEST 2] Placing resource "${resource.name}" into MAINTENANCE mode with reason logging...`);
  const reasonText = 'HVAC sensor calibration and air duct sterilization';
  const notesText = 'Technician Acme Facilities scheduled on site';
  const startTime = new Date();
  const estimatedEndTime = new Date(startTime.getTime() + 3 * 60 * 60 * 1000); // +3 hours

  const maintRes = await toggleResourceMaintenance(
    resource.id,
    ResourceStatus.MAINTENANCE,
    {
      reason: reasonText,
      startTime,
      endTime: estimatedEndTime,
      performedBy: 'Acme Facilities Team',
      notes: notesText,
    },
    admin.id
  );

  if (!maintRes.success || !maintRes.resource || maintRes.resource.status !== ResourceStatus.MAINTENANCE) {
    throw new Error(`Failed to place resource in maintenance: ${maintRes.error}`);
  }

  // Verify MaintenanceLog record in database
  const activeLog = await prisma.maintenanceLog.findFirst({
    where: {
      resourceId: resource.id,
      status: MaintenanceStatus.IN_PROGRESS,
    },
  });

  if (!activeLog || activeLog.reason !== reasonText) {
    throw new Error('Active maintenance log record was not created with correct reason.');
  }
  console.log('[PASS 2] Resource successfully entered MAINTENANCE mode with active log ID:', activeLog.id);

  console.log('[TEST 3] Testing that conflict detection blocks new reservations during active maintenance window...');
  const slotConflict = await checkSlotConflict({
    resourceId: resource.id,
    startTime: new Date(startTime.getTime() + 30 * 60 * 1000).toISOString(),
    endTime: new Date(startTime.getTime() + 90 * 60 * 1000).toISOString(),
  });

  if (!slotConflict.hasConflict || slotConflict.canBook || slotConflict.conflictType !== 'MAINTENANCE') {
    throw new Error(`Conflict engine failed to block maintenance window! Result: ${JSON.stringify(slotConflict)}`);
  }
  console.log('[PASS 3] Conflict detection successfully blocked reservation during maintenance:', slotConflict.message);

  console.log('[TEST 4] Restoring resource to AVAILABLE status...');
  const restoreRes = await toggleResourceMaintenance(
    resource.id,
    ResourceStatus.AVAILABLE,
    undefined,
    admin.id
  );

  if (!restoreRes.success || !restoreRes.resource || restoreRes.resource.status !== ResourceStatus.AVAILABLE) {
    throw new Error(`Failed to restore resource to available: ${restoreRes.error}`);
  }

  // Verify that the active maintenance log was closed
  const completedLog = await prisma.maintenanceLog.findUnique({
    where: { id: activeLog.id },
  });

  if (!completedLog || completedLog.status !== MaintenanceStatus.COMPLETED || !completedLog.endTime) {
    throw new Error('Active maintenance log was not marked as COMPLETED upon restoring service.');
  }
  console.log('[PASS 4] Resource successfully restored to AVAILABLE, and log marked COMPLETED at:', completedLog.endTime);

  console.log('[SUCCESS] All Maintenance Mode & Logging tests passed!');
}

testMaintenanceMode()
  .catch((err) => {
    console.error('[FAIL]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
