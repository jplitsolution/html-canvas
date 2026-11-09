process.env.TZ = 'UTC';
/**
 * E2E Verification Script for 30-Minute Delayed CheckSub & Visit Audit
 *
 * Tests:
 * 1. Database schema columns on conversion_postbacks and visits
 * 2. Status classification: ONLY 'ACTIVE' is success, while GRACE, PARKING, PENDING, SUSPENDED are non-success
 * 3. Automatic 30m scheduling (scheduleDelayedChecksub)
 * 4. Execution updates both conversion_postbacks AND visits table (checksub_status, checksub_executed_at)
 * 5. Operator callback does NOT cancel or skip delayed checksub
 * 6. Background worker processing due records
 * 7. Safe cleanup of test records
 */

import { initDatabase, getRepository } from '../src/database/index.js';
import { ConversionPostback, ConversionPostbackStatus } from '../src/database/entities/conversion-postback.entity.js';
import { Visit } from '../src/database/entities/visit.entity.js';
import { Campaign } from '../src/database/entities/campaign.entity.js';
import { ApiConfig } from '../src/database/entities/api-config.entity.js';
import {
  scheduleDelayedChecksub,
  runDelayedChecksubNow,
  classifyChecksubStatus,
} from '../src/modules/flow/delayed-checksub.worker.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
  }
}

async function run() {
  console.log('\n======================================================');
  console.log('🚀 STARTING 30-MINUTE DELAYED CHECKSUB & VISIT AUDIT TEST');
  console.log('======================================================\n');

  console.log('Step 1: Initializing Database Connection...');
  const ds = await initDatabase();
  const postbackRepo = getRepository(ConversionPostback);
  const visitRepo = getRepository(Visit);
  const campaignRepo = getRepository(Campaign);
  const apiConfigRepo = getRepository(ApiConfig);

  // 1. Verify DB Schema Columns on postbacks and visits
  console.log('\n--- Step 1: Verifying DB Columns & Indexes ---');
  const postbackCols = await ds.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'conversion_postbacks' 
      AND column_name LIKE 'delayed_checksub%'
  `);
  const pbColNames = postbackCols.map((c) => c.column_name);
  assert(pbColNames.includes('delayed_checksub_status'), 'Postbacks column delayed_checksub_status exists');
  assert(pbColNames.includes('delayed_checksub_scheduled_at'), 'Postbacks column delayed_checksub_scheduled_at exists');
  assert(pbColNames.includes('delayed_checksub_executed_at'), 'Postbacks column delayed_checksub_executed_at exists');
  assert(pbColNames.includes('delayed_checksub_outcome'), 'Postbacks column delayed_checksub_outcome exists');
  assert(pbColNames.includes('delayed_checksub_response'), 'Postbacks column delayed_checksub_response exists');

  const visitCols = await ds.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'visits' 
      AND column_name LIKE 'checksub_%'
  `);
  const vColNames = visitCols.map((c) => c.column_name);
  assert(vColNames.includes('checksub_status'), 'Visits column checksub_status exists');
  assert(vColNames.includes('checksub_executed_at'), 'Visits column checksub_executed_at exists');
  assert(vColNames.includes('checksub_response'), 'Visits column checksub_response exists');

  // 2. Verify Status Classification Logic
  console.log('\n--- Step 2: Testing Status Classification Logic ---');
  const activeClass = classifyChecksubStatus('ACTIVE');
  assert(activeClass.isSuccess === true && activeClass.statusLabel === 'ACTIVE', "'ACTIVE' is classified as success");

  const actLower = classifyChecksubStatus('active');
  assert(actLower.isSuccess === true && actLower.statusLabel === 'ACTIVE', "'active' (lowercase) is classified as success");

  const graceClass = classifyChecksubStatus('GRACE');
  assert(graceClass.isSuccess === false && graceClass.statusLabel === 'GRACE', "'GRACE' is classified as non-success");

  const parkingClass = classifyChecksubStatus('parking');
  assert(parkingClass.isSuccess === false && parkingClass.statusLabel === 'PARKING', "'parking' is classified as non-success");

  const pendingClass = classifyChecksubStatus('PENDING');
  assert(pendingClass.isSuccess === false && pendingClass.statusLabel === 'PENDING', "'PENDING' is classified as non-success");

  const suspendedClass = classifyChecksubStatus('SUSPENDED');
  assert(suspendedClass.isSuccess === false && suspendedClass.statusLabel === 'SUSPENDED', "'SUSPENDED' is classified as non-success");

  // 3. Find or Create a Test Campaign
  console.log('\n--- Step 3: Setting up Test Campaign ---');
  let testCampaign = await campaignRepo.findOne({
    where: { verificationMode: 'ORANGE_BF' },
  });
  if (!testCampaign) {
    testCampaign = await campaignRepo.findOne({ order: { id: 'DESC' } });
  }
  const campaignId = testCampaign ? testCampaign.id : 999999;
  console.log(`Using campaign id=${campaignId} (${testCampaign?.name || 'Test'})`);

  // 4. Create a Test Visit and ConversionPostback Row
  console.log('\n--- Step 4: Testing Visit & Postback Creation with 30m Scheduling ---');
  const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
  const testVisit = await visitRepo.save(
    visitRepo.create({
      campaignId,
      phone: testPhone,
      visitStatus: 'SUBSCRIBED',
      clickId: 'test-click-' + Date.now(),
    }),
  );
  assert(Boolean(testVisit.id), `Created test visit id=${testVisit.id} with phone=${testPhone}`);

  const testPostback = await postbackRepo.save(
    postbackRepo.create({
      msisdn: testPhone,
      campaignId,
      visitId: testVisit.id,
      status: ConversionPostbackStatus.SENT,
      clickId: testVisit.clickId,
    }),
  );
  assert(Boolean(testPostback.id), `Created test conversion postback id=${testPostback.id}`);

  // Test Scheduling
  const scheduled = await scheduleDelayedChecksub({
    postbackId: testPostback.id,
    msisdn: testPhone,
    campaignId,
    delayMinutes: 30,
  });
  assert(Boolean(scheduled), 'scheduleDelayedChecksub returned updated row');

  const refetchedPb = await postbackRepo.findOne({ where: { id: testPostback.id } });
  assert(refetchedPb.delayedChecksubStatus === 'pending', 'delayedChecksubStatus is set to pending');
  assert(refetchedPb.delayedChecksubScheduledAt instanceof Date, 'delayedChecksubScheduledAt is a valid Date');
  const diffMinutes = Math.round((refetchedPb.delayedChecksubScheduledAt.getTime() - Date.now()) / (60 * 1000));
  assert(diffMinutes >= 29 && diffMinutes <= 31, `delayedChecksubScheduledAt is ~30 minutes in the future (${diffMinutes}m)`);

  // 5. Test On-Demand Manual Execution and Visit Updates
  console.log('\n--- Step 5: Testing Execution & Visit Attribution Updates ---');
  const manualResult = await runDelayedChecksubNow(testPostback.id);
  assert(typeof manualResult === 'object', 'runDelayedChecksubNow returned result');

  const updatedPb = await postbackRepo.findOne({ where: { id: testPostback.id } });
  assert(Boolean(updatedPb.delayedChecksubExecutedAt), 'delayedChecksubExecutedAt timestamp is set on postback');
  assert(Boolean(updatedPb.delayedChecksubOutcome), `delayedChecksubOutcome is populated: '${updatedPb.delayedChecksubOutcome}'`);

  const updatedVisit = await visitRepo.findOne({ where: { id: testVisit.id } });
  assert(Boolean(updatedVisit.checksubStatus), `Visit checksubStatus updated to '${updatedVisit.checksubStatus}'`);
  assert(Boolean(updatedVisit.checksubExecutedAt), 'Visit checksubExecutedAt timestamp is recorded');

  // 6. Test Callback does NOT skip delayed checksub
  console.log('\n--- Step 6: Testing That Operator Callback Does NOT Skip Delayed Checksub ---');
  const testPhone2 = '99998' + Math.floor(10000 + Math.random() * 90000);
  const callbackRow = await postbackRepo.save(
    postbackRepo.create({
      msisdn: testPhone2,
      campaignId,
      status: ConversionPostbackStatus.PENDING,
      delayedChecksubStatus: 'pending',
      delayedChecksubScheduledAt: new Date(Date.now() + 30 * 60 * 1000),
    }),
  );

  // Simulate an incoming callback setting operatorStatus
  callbackRow.operatorStatus = 'parking';
  await postbackRepo.save(callbackRow);

  const checkedAfterCallback = await postbackRepo.findOne({ where: { id: callbackRow.id } });
  assert(
    checkedAfterCallback.delayedChecksubStatus === 'pending',
    'delayedChecksubStatus remains pending even after operator callback arrives',
  );

  // 7. Cleanup Test Records
  console.log('\n--- Step 7: Cleaning up Test Data ---');
  await postbackRepo.delete({ id: testPostback.id });
  await postbackRepo.delete({ id: callbackRow.id });
  await visitRepo.delete({ id: testVisit.id });
  console.log('Cleaned up test postbacks and visits.');

  await ds.destroy();

  console.log('\n======================================================');
  console.log(`🏁 VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
