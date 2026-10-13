import prisma from '../lib/prisma';
import { createResource, updateResource, archiveResource } from './resources';
import { ResourceStatus } from '@prisma/client';

async function testResourceCrud() {
  console.log('[TEST] Starting Resource CRUD Verification...');

  // 1. Get an existing category
  const category = await prisma.category.findFirst();
  if (!category) throw new Error('No category found');

  // Admin user
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) throw new Error('No admin user found');

  // 2. Test createResource
  const testCode = 'TEST-UNIT-99';
  // Cleanup if already exists
  await prisma.resource.deleteMany({ where: { code: testCode } });

  console.log('[TEST 1] Creating new resource...');
  const createRes = await createResource({
    name: 'Automated Test Asset',
    code: testCode,
    categoryId: category.id,
    location: 'Floor 9, QA Lab',
    capacity: 6,
    description: 'A test resource created to verify CRUD functionality.',
    bufferMinutes: 20,
    requiresApproval: true,
    status: ResourceStatus.AVAILABLE,
  }, admin.id);

  if (!createRes.success || !createRes.resource) {
    throw new Error(`Failed to create resource: ${createRes.error}`);
  }
  console.log('[PASS 1] Created resource ID:', createRes.resource.id);

  // 3. Test updateResource
  console.log('[TEST 2] Updating resource...');
  const updateRes = await updateResource(createRes.resource.id, {
    name: 'Automated Test Asset (Updated)',
    capacity: 10,
    bufferMinutes: 30,
  }, admin.id);

  if (!updateRes.success || !updateRes.resource) {
    throw new Error(`Failed to update resource: ${updateRes.error}`);
  }
  if (updateRes.resource.name !== 'Automated Test Asset (Updated)' || updateRes.resource.capacity !== 10) {
    throw new Error('Updated fields did not match expected values.');
  }
  console.log('[PASS 2] Successfully updated resource name and capacity.');

  // 4. Test archiveResource (Archive -> RETIRED)
  console.log('[TEST 3] Archiving resource...');
  const archiveRes = await archiveResource(createRes.resource.id, true, admin.id);
  if (!archiveRes.success || !archiveRes.resource || archiveRes.resource.status !== ResourceStatus.RETIRED) {
    throw new Error(`Failed to archive resource: ${archiveRes.error}`);
  }
  console.log('[PASS 3] Successfully archived resource to RETIRED status.');

  // 5. Test archiveResource (Restore -> AVAILABLE)
  console.log('[TEST 4] Restoring resource...');
  const restoreRes = await archiveResource(createRes.resource.id, false, admin.id);
  if (!restoreRes.success || !restoreRes.resource || restoreRes.resource.status !== ResourceStatus.AVAILABLE) {
    throw new Error(`Failed to restore resource: ${restoreRes.error}`);
  }
  console.log('[PASS 4] Successfully restored resource to AVAILABLE status.');

  // Cleanup
  await prisma.resource.delete({ where: { id: createRes.resource.id } });
  console.log('[INFO] Cleaned up test resource.');
  console.log('[SUCCESS] All Resource CRUD Server Actions verified successfully!');
}

testResourceCrud()
  .catch((err) => {
    console.error('[FAIL]', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
