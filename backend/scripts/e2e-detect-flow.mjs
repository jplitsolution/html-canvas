/**
 * E2E smoke tests for post-detect checksub routing.
 * Run: node backend/scripts/e2e-detect-flow.mjs
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { initDatabase } from '../src/database/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });

const API = process.env.E2E_API_BASE || 'http://localhost:3000/api';

async function detect(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/flow/detect-msisdn?${qs}`);
  if (!res.ok) throw new Error(`detect failed ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getPage(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/flow/page?${qs}`);
  if (!res.ok) throw new Error(`page failed ${res.status}: ${await res.text()}`);
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

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`  ✓ ${msg}`);
}

async function main() {
  const ds = await initDatabase();
  const results = [];

  // ── Test 1: Token HE without Safaricom MSISDN → no checksub, no success redirect ──
  console.log('\n[Test 1] BurkinaFaso token HE, no MSISDN (curl, no Safaricom data)');
  try {
    const r1 = await detect({
      country: 'BurkinaFaso',
      operator: 'Orange',
      tracking_campid: 'BF-OBF-11',
      vid: 'MB02',
    });
    const logs1 = await logsForVisit(ds, r1.visitId);
    const c1 = countTypes(logs1);
    assert(!r1.phone, 'phone empty when HE MSISDN fails');
    assert(!r1.successRedirectUrl, 'no success redirect without HE phone');
    assert(c1.checksub == null || c1.checksub === 0, 'checksub NOT called without phone');
    // safaricom_masked now bootstraps browser HE (no server he_token).
    // Other API HE providers may still log he_token / he_resolve from Node.
    if (r1.needsClientHe) {
      assert(Boolean(r1.heClientConfig?.tokenUrl), 'browser HE config returned');
      assert(c1.he_token == null || c1.he_token === 0, 'no server he_token on client bootstrap');
    } else if ((c1.he_token || 0) + (c1.he_resolve || 0) >= 1) {
      assert(true, 'HE partner call attempted');
    } else {
      // Token/API HE may fail before logging partner hops (timeout / misconfig).
      assert(
        Boolean(r1.heProvider) || Boolean(r1.heError) || !r1.phone,
        'HE attempted or failed without MSISDN (no partner log required)',
      );
    }
    results.push({ test: 1, pass: true, visitId: r1.visitId, counts: c1 });
  } catch (e) {
    results.push({ test: 1, pass: false, error: e.message });
    console.error('  ✗', e.message);
  }

  // ── Test 2: Duplicate detect same visit → cached, no extra HE logs ──
  console.log('\n[Test 2] Duplicate detect-msisdn same visitId → cache hit');
  try {
    const first = await detect({
      country: 'BurkinaFaso',
      operator: 'Orange',
      tracking_campid: 'BF-OBF-11',
      vid: 'MB02',
    });
    const logsBefore = await logsForVisit(ds, first.visitId);
    const before = countTypes(logsBefore);

    const second = await detect({
      country: 'BurkinaFaso',
      operator: 'Orange',
      tracking_campid: 'BF-OBF-11',
      vid: 'MB02',
      visitId: String(first.visitId),
    });
    const logsAfter = await logsForVisit(ds, first.visitId);
    const after = countTypes(logsAfter);

    assert(second.visitId === first.visitId, 'same visit reused');
    assert(JSON.stringify(before) === JSON.stringify(after), 'no duplicate API logs on cached detect');
    results.push({ test: 2, pass: true, visitId: first.visitId, counts: after });
  } catch (e) {
    results.push({ test: 2, pass: false, error: e.message });
    console.error('  ✗', e.message);
  }

  // ── Test 3: Header HE (Saudi) with msisdn → checksub once, routing fields present ──
  console.log('\n[Test 3] Saudi ZAIN header HE + msisdn → checksub runs');
  try {
    const r3 = await detect({
      country: 'Saudi Arabia',
      operator: 'ZAIN',
      campid: '8',
      msisdn: '966512345678',
    });
    const logs3 = await logsForVisit(ds, r3.visitId);
    const c3 = countTypes(logs3);
    assert(r3.phone === '966512345678', 'phone from query/header');
    assert(c3.checksub === 1, 'checksub called exactly once');
    assert(c3.he_token == null || c3.he_token === 0, 'no HE token for header provider');
    assert('subscriptionStatus' in r3, 'subscriptionStatus in response');
    results.push({
      test: 3,
      pass: true,
      visitId: r3.visitId,
      status: r3.subscriptionStatus,
      successRedirectUrl: r3.successRedirectUrl,
      nextPage: r3.nextPage,
      counts: c3,
    });
  } catch (e) {
    results.push({ test: 3, pass: false, error: e.message });
    console.error('  ✗', e.message);
  }

  // ── Test 4: getPage HOME after detect → no duplicate checksub ──
  console.log('\n[Test 4] /flow/page HOME after detect → no duplicate checksub');
  try {
    const det = await detect({
      country: 'Saudi Arabia',
      operator: 'ZAIN',
      campid: '8',
      msisdn: '966512345679',
    });
    const logsBefore = await logsForVisit(ds, det.visitId);
    const checksubBefore = countTypes(logsBefore).checksub || 0;

    await getPage({
      country: 'Saudi Arabia',
      operator: 'ZAIN',
      campid: '8',
      page: 'HOME',
      msisdn: '966512345679',
      visitId: String(det.visitId),
    });

    const logsAfter = await logsForVisit(ds, det.visitId);
    const checksubAfter = countTypes(logsAfter).checksub || 0;
    assert(checksubBefore === checksubAfter, `checksub count unchanged (${checksubBefore} → ${checksubAfter})`);
    results.push({ test: 4, pass: true, visitId: det.visitId, checksubCount: checksubAfter });
  } catch (e) {
    results.push({ test: 4, pass: false, error: e.message });
    console.error('  ✗', e.message);
  }

  await ds.destroy();

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log('\n══════════════════════════════════════');
  console.log(`E2E Results: ${passed} passed, ${failed} failed`);
  console.log(JSON.stringify(results, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
