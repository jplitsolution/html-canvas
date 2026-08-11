/**
 * E2E: flowConfig.startConfig gates HE / checksub / blocklist on detect-msisdn.
 *
 * Run (API must be up):
 *   node backend/scripts/e2e-start-config-flow.mjs
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { initDatabase } from '../src/database/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });

const API = process.env.E2E_API_BASE || 'http://localhost:3000/api';
const EMAIL = process.env.E2E_EMAIL || 'abhivishwkarmaa52@gmail.com';
const PASSWORD = process.env.E2E_PASSWORD || '123456';
const CAMPAIGN_ID = process.env.E2E_CAMPAIGN_ID || '8';

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (!data.accessToken) throw new Error('login missing accessToken');
  return data.accessToken;
}

async function getFlow(token) {
  const res = await fetch(`${API}/campaigns/${CAMPAIGN_ID}/flow`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`getFlow failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function putFlow(token, body) {
  const res = await fetch(`${API}/campaigns/${CAMPAIGN_ID}/flow`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`putFlow failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function detect(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/flow/detect-msisdn?${qs}`);
  if (!res.ok) throw new Error(`detect failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function logsForVisit(ds, visitId) {
  return ds.query(
    `SELECT call_type, success, error_message
     FROM api_call_logs WHERE visit_id = $1 ORDER BY id ASC`,
    [visitId],
  );
}

function countTypes(rows) {
  const counts = {};
  for (const r of rows) {
    counts[r.call_type] = (counts[r.call_type] || 0) + 1;
  }
  return counts;
}

function withStartConfig(flowPayload, startConfig, mode = 'BOTH') {
  const flowConfig = {
    ...(flowPayload.flowConfig || flowPayload),
    startConfig,
  };
  // Drop accidental meta nodes if UI saved them somehow
  flowConfig.nodes = (flowConfig.nodes || []).filter(
    (n) => n.pageType !== 'START' && n.pageType !== 'END',
  );
  return {
    verificationMode: mode,
    flowConfig,
  };
}

async function main() {
  const ds = await initDatabase();
  const token = await login();
  const original = await getFlow(token);
  const baseFlow = original.data || original;
  const results = [];

  const country = 'Saudi Arabia';
  const operator = 'ZAIN';
  const campid = String(CAMPAIGN_ID);

  console.log(`\nUsing campaign ${CAMPAIGN_ID} (${country}/${operator})`);

  try {
    // ── 1: Persist startConfig via PUT /flow ──
    console.log('\n[Test 1] PUT flow with startConfig (checksub/blocklist off)');
    try {
      const saved = await putFlow(
        token,
        withStartConfig(
          baseFlow,
          { runHe: true, runBlocklist: false, runChecksub: false },
          'BOTH',
        ),
      );
      const cfg = (saved.data || saved).flowConfig;
      assert(cfg.startConfig?.runChecksub === false, 'saved runChecksub=false');
      assert(cfg.startConfig?.runBlocklist === false, 'saved runBlocklist=false');
      assert(cfg.startConfig?.runHe === true, 'saved runHe=true');
      results.push({ test: 1, pass: true });
    } catch (e) {
      results.push({ test: 1, pass: false, error: e.message });
      console.error('  ✗', e.message);
    }

    // ── 2: Detect with MSISDN → phone ok, checksub NOT called ──
    console.log('\n[Test 2] Detect with MSISDN + runChecksub=false → no checksub log');
    try {
      const msisdn = `9665${String(Date.now()).slice(-8)}`;
      const r = await detect({ country, operator, campid, msisdn });
      const logs = await logsForVisit(ds, r.visitId);
      const c = countTypes(logs);
      assert(r.phone === msisdn, `phone resolved (${r.phone})`);
      assert((c.checksub || 0) === 0, 'checksub NOT called when startConfig.runChecksub=false');
      assert((c.blocklist || 0) === 0, 'blocklist NOT called when startConfig.runBlocklist=false');
      results.push({ test: 2, pass: true, visitId: r.visitId, counts: c });
    } catch (e) {
      results.push({ test: 2, pass: false, error: e.message });
      console.error('  ✗', e.message);
    }

    // ── 3: Re-enable checksub → detect calls it ──
    console.log('\n[Test 3] Detect with runChecksub=true → checksub runs');
    try {
      await putFlow(
        token,
        withStartConfig(
          baseFlow,
          { runHe: true, runBlocklist: false, runChecksub: true },
          'BOTH',
        ),
      );
      const msisdn = `9665${String(Date.now()).slice(-8)}`;
      const r = await detect({ country, operator, campid, msisdn });
      const logs = await logsForVisit(ds, r.visitId);
      const c = countTypes(logs);
      assert(r.phone === msisdn, 'phone resolved');
      assert((c.checksub || 0) >= 1, 'checksub called when startConfig.runChecksub=true');
      results.push({
        test: 3,
        pass: true,
        visitId: r.visitId,
        status: r.subscriptionStatus,
        counts: c,
      });
    } catch (e) {
      results.push({ test: 3, pass: false, error: e.message });
      console.error('  ✗', e.message);
    }

    // ── 4: runHe=false → no phone from query (HE gate closed) ──
    console.log('\n[Test 4] startConfig.runHe=false → MSISDN ignored on detect');
    try {
      await putFlow(
        token,
        withStartConfig(
          baseFlow,
          { runHe: false, runBlocklist: false, runChecksub: false },
          'BOTH',
        ),
      );
      const msisdn = `9665${String(Date.now()).slice(-8)}`;
      const r = await detect({ country, operator, campid, msisdn });
      assert(!r.phone, `phone empty when runHe=false (got "${r.phone || ''}")`);
      assert(r.hasMsisdn === false || !r.hasMsisdn, 'hasMsisdn false');
      const logs = await logsForVisit(ds, r.visitId);
      const c = countTypes(logs);
      assert((c.checksub || 0) === 0, 'no checksub without phone');
      results.push({ test: 4, pass: true, visitId: r.visitId, counts: c });
    } catch (e) {
      results.push({ test: 4, pass: false, error: e.message });
      console.error('  ✗', e.message);
    }

    // ── 5: OTP_ONLY + startConfig.runHe=true still skips HE (mode wins) ──
    console.log('\n[Test 5] OTP_ONLY mode ignores startConfig.runHe=true');
    try {
      const otpFlow = {
        version: 1,
        entryPage: 'HOME',
        startConfig: { runHe: true, runBlocklist: false, runChecksub: false },
        nodes: [
          { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
          { id: 'OTP', pageType: 'OTP', position: { x: 320, y: 60 } },
          { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
          { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 40 } },
          { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 520 } },
        ],
        edges: [
          { id: 'HOME-DEFAULT-OTP', source: 'HOME', target: 'OTP', condition: 'DEFAULT' },
          {
            id: 'OTP-OTP_VERIFIED-CONFIRM',
            source: 'OTP',
            target: 'CONFIRM',
            condition: 'OTP_VERIFIED',
          },
          {
            id: 'CONFIRM-SUBSCRIBED-THANKYOU',
            source: 'CONFIRM',
            target: 'THANKYOU',
            condition: 'SUBSCRIBED',
          },
        ],
      };
      await putFlow(token, { verificationMode: 'OTP_ONLY', flowConfig: otpFlow });
      const msisdn = `9665${String(Date.now()).slice(-8)}`;
      const r = await detect({ country, operator, campid, msisdn });
      assert(!r.phone, 'OTP_ONLY does not adopt MSISDN via HE path');
      results.push({ test: 5, pass: true, visitId: r.visitId });
    } catch (e) {
      results.push({ test: 5, pass: false, error: e.message });
      console.error('  ✗', e.message);
    }
  } finally {
    console.log('\n[Cleanup] Restoring original flow');
    try {
      await putFlow(token, {
        verificationMode: baseFlow.verificationMode,
        flowConfig: baseFlow.flowConfig,
      });
      console.log('  ✓ original flow restored');
    } catch (e) {
      console.error('  ✗ restore failed:', e.message);
      results.push({ test: 'cleanup', pass: false, error: e.message });
    }
    await ds.destroy();
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log('\n══════════════════════════════════════');
  console.log(`startConfig E2E: ${passed} passed, ${failed} failed`);
  console.log(JSON.stringify(results, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
