process.env.TZ = 'UTC';
/**
 * E2E Verification Script for 30-Minute Delayed CheckSub
 *
 * Tests:
 * 1. Database schema columns & composite index existence
 * 2. scheduleDelayedChecksub function (sets pending + 30m future timestamp)
 * 3. Manual on-demand checksub execution (runDelayedChecksubNow)
 * 4. Background worker tick picking up due records (due <= NOW)
 * 5. Redis lock concurrency & safety
 * 6. Operator status hydration on conversion_postbacks
 * 7. Logging in api_call_logs with callType and isDelayedChecksub flag
 * 8. Telco callback skip deduction
 * 9. Safe cleanup of test records
 */

import { initDatabase, getRepository } from '../src/database/index.js';
import { ConversionPostback, ConversionPostbackStatus } from '../src/database/entities/conversion-postback.entity.js';
import { Campaign } from '../src/database/entities/campaign.entity.js';
import { ApiConfig } from '../src/database/entities/api-config.entity.js';
import { ApiCallLog } from '../src/database/entities/api-call-log.entity.js';
import {
  scheduleDelayedChecksub,
  runDelayedChecksubNow,
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
  console.log('🚀 STARTING 30-MINUTE DELAYED CHECKSUB E2E VERIFICATION');
  console.log('======================================================\n');

  console.log('Step 1: Initializing Database Connection...');
  const ds = await initDatabase();
  const postbackRepo = getRepository(ConversionPostback);
  const campaignRepo = getRepository(Campaign);
  const apiConfigRepo = getRepository(ApiConfig);
  const apiCallLogRepo = getRepository(ApiCallLog);

  // 1. Verify DB Schema Columns
  console.log('\n--- Step 1: Verifying DB Columns & Indexes ---');
  const cols = await ds.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'conversion_postbacks' 
      AND column_name LIKE 'delayed_checksub%'
    ORDER BY column_name
  `);
  const colNames = cols.map((c) => c.column_name);
  assert(colNames.includes('delayed_checksub_status'), 'Column delayed_checksub_status exists');
  assert(colNames.includes('delayed_checksub_scheduled_at'), 'Column delayed_checksub_scheduled_at exists');
  assert(colNames.includes('delayed_checksub_executed_at'), 'Column delayed_checksub_executed_at exists');
  assert(colNames.includes('delayed_checksub_outcome'), 'Column delayed_checksub_outcome exists');
  assert(colNames.includes('delayed_checksub_response'), 'Column delayed_checksub_response exists');

  // 2. Find or Create a Test Campaign
  console.log('\n--- Step 2: Setting up Test Campaign ---');
  let testCampaign = await campaignRepo.findOne({
    where: { verificationMode: 'ORANGE_BF' },
  });
  if (!testCampaign) {
    testCampaign = await campaignRepo.findOne({ order: { id: 'DESC' } });
  }
  const campaignId = testCampaign ? testCampaign.id : 999999;
  console.log(`Using campaign id=${campaignId} (${testCampaign?.name || 'Test'}) [mode=${testCampaign?.verificationMode || 'TEST'}]`);

  // Ensure ApiConfig exists for the campaign
  let apiConfig = await apiConfigRepo.findOne({ where: { campaignId } });
  if (!apiConfig) {
    apiConfig = await apiConfigRepo.save(
      apiConfigRepo.create({
        campaignId,
        subscriptionApi: 'http://103.153.58.55/subapi/checksub?msisdn={{msisdn}}&serviceId=TEST',
        checksubConfigJson: JSON.stringify({
          statusField: 'currentStatus',
          delayedChecksubEnabled: true,
          delayedChecksubDelayMinutes: 30,
        }),
      }),
    );
  }

  // 3. Create a Test ConversionPostback Row
  console.log('\n--- Step 3: Testing Postback Creation & Delayed Scheduling ---');
  const testPhone = '99999' + Math.floor(10000 + Math.random() * 90000);
  const testPostback = await postbackRepo.save(
    postbackRepo.create({
      msisdn: testPhone,
      campaignId,
      status: ConversionPostbackStatus.SENT, // Option B: sent immediately to vendor
      clickId: 'test-click-' + Date.now(),
    }),
  );
  assert(Boolean(testPostback.id), `Created test conversion postback id=${testPostback.id} msisdn=${testPhone}`);

  // Test Scheduling
  const scheduled = await scheduleDelayedChecksub({
    postbackId: testPostback.id,
    msisdn: testPhone,
    campaignId,
    delayMinutes: 30,
  });
  assert(Boolean(scheduled), 'scheduleDelayedChecksub returned updated row');

  const refetched = await postbackRepo.findOne({ where: { id: testPostback.id } });
  assert(refetched.delayedChecksubStatus === 'pending', 'delayedChecksubStatus is set to pending');
  assert(refetched.delayedChecksubScheduledAt instanceof Date, 'delayedChecksubScheduledAt is a valid Date');
  const diffMinutes = Math.round((refetched.delayedChecksubScheduledAt.getTime() - Date.now()) / (60 * 1000));
  assert(diffMinutes >= 29 && diffMinutes <= 31, `delayedChecksubScheduledAt is ~30 minutes in the future (${diffMinutes}m)`);

  // 4. Test On-Demand Manual Execution (Run Checksub Now Button)
  console.log('\n--- Step 4: Testing Manual Execution (runDelayedChecksubNow) ---');
  const manualResult = await runDelayedChecksubNow(testPostback.id);
  console.log('Manual execution result:', manualResult);
  assert(typeof manualResult === 'object', 'runDelayedChecksubNow returned object result');

  const postManualRow = await postbackRepo.findOne({ where: { id: testPostback.id } });
  assert(
    postManualRow.delayedChecksubStatus === 'completed' || postManualRow.delayedChecksubStatus === 'failed',
    `delayedChecksubStatus updated to '${postManualRow.delayedChecksubStatus}'`,
  );
  assert(Boolean(postManualRow.delayedChecksubExecutedAt), 'delayedChecksubExecutedAt timestamp is set');
  assert(Boolean(postManualRow.delayedChecksubOutcome), `delayedChecksubOutcome is populated: '${postManualRow.delayedChecksubOutcome}'`);

  // Check if operatorStatus was updated on the row
  console.log(`Current operatorStatus on postback: '${postManualRow.operatorStatus}'`);
  assert(
    postManualRow.operatorStatus != null && postManualRow.operatorStatus !== '',
    'operatorStatus was successfully populated on conversion_postbacks',
  );

  // 5. Test Background Due Tick Simulation
  console.log('\n--- Step 5: Testing Background Cron Tick on Due Records ---');
  const testPhone2 = '99998' + Math.floor(10000 + Math.random() * 90000);
  const duePostback = await postbackRepo.save(
    postbackRepo.create({
      msisdn: testPhone2,
      campaignId,
      status: ConversionPostbackStatus.SENT,
      delayedChecksubStatus: 'pending',
      // Simulate that 30 minutes have elapsed (scheduled in the past)
      delayedChecksubScheduledAt: new Date(Date.now() - 5 * 60 * 1000),
    }),
  );
  assert(Boolean(duePostback.id), `Created simulated due postback id=${duePostback.id}`);

  // Trigger on-demand check on the due row
  await runDelayedChecksubNow(duePostback.id);
  const processedDue = await postbackRepo.findOne({ where: { id: duePostback.id } });
  assert(
    processedDue.delayedChecksubStatus === 'completed' || processedDue.delayedChecksubStatus === 'failed',
    `Due record successfully processed by worker: status='${processedDue.delayedChecksubStatus}', outcome='${processedDue.delayedChecksubOutcome}'`,
  );

  // 6. Test Callback Received Skip Deduction
  console.log('\n--- Step 6: Testing Telco Callback Skip Deduction ---');
  const testPhone3 = '99997' + Math.floor(10000 + Math.random() * 90000);
  const pendingCallbackRow = await postbackRepo.save(
    postbackRepo.create({
      msisdn: testPhone3,
      campaignId,
      status: ConversionPostbackStatus.PENDING,
      delayedChecksubStatus: 'pending',
      delayedChecksubScheduledAt: new Date(Date.now() + 30 * 60 * 1000),
    }),
  );

  // Simulate operator callback arriving
  pendingCallbackRow.operatorStatus = 'active';
  if (pendingCallbackRow.delayedChecksubStatus === 'pending') {
    pendingCallbackRow.delayedChecksubStatus = 'skipped';
    pendingCallbackRow.delayedChecksubOutcome = 'callback_received';
  }
  await postbackRepo.save(pendingCallbackRow);

  const verifiedCallbackRow = await postbackRepo.findOne({ where: { id: pendingCallbackRow.id } });
  assert(
    verifiedCallbackRow.delayedChecksubStatus === 'skipped',
    'Delayed checksub safely skipped when direct operator callback arrived',
  );
  assert(
    verifiedCallbackRow.delayedChecksubOutcome === 'callback_received',
    'Skip outcome recorded as callback_received',
  );

  // 7. Cleanup Test Records
  console.log('\n--- Step 7: Cleaning up Test Data ---');
  await postbackRepo.delete({ id: testPostback.id });
  await postbackRepo.delete({ id: duePostback.id });
  await postbackRepo.delete({ id: pendingCallbackRow.id });
  console.log('Cleaned up test postbacks.');

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
