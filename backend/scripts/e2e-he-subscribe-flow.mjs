/**
 * E2E: HE HOME → Hit Subscribe API (transition SUBSCRIBE) with startConfig.
 *
 * Run: node backend/scripts/e2e-he-subscribe-flow.mjs
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

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
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`login ${res.status}`);
  return (await res.json()).accessToken;
}

async function getFlow(token) {
  const res = await fetch(`${API}/campaigns/${CAMPAIGN_ID}/flow`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`getFlow ${res.status}`);
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
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`putFlow ${res.status}: ${await res.text()}`);
  return res.json();
}

async function detect(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/flow/detect-msisdn?${qs}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`detect ${res.status}: ${await res.text()}`);
  return res.json();
}

async function getPage(params) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/flow/page?${qs}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`page ${res.status}: ${await res.text()}`);
  return res.json();
}

async function transition(body) {
  const res = await fetch(`${API}/flow/transition`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`transition ${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  const token = await login();
  const original = await getFlow(token);
  const base = original.data || original;
  const country = 'Saudi Arabia';
  const operator = 'ZAIN';
  const campid = String(CAMPAIGN_ID);
  const results = [];

  const heFlow = {
    version: 1,
    entryPage: 'HOME',
    startConfig: { runHe: true, runBlocklist: false, runChecksub: false },
    nodes: [
      { id: 'HOME', pageType: 'HOME', position: { x: 40, y: 160 } },
      { id: 'CONFIRM', pageType: 'CONFIRM', position: { x: 600, y: 160 } },
      { id: 'THANKYOU', pageType: 'THANKYOU', position: { x: 880, y: 40 } },
      { id: 'ERROR', pageType: 'ERROR', position: { x: 880, y: 520 } },
    ],
    edges: [
      {
        id: 'HOME-HEADER_RESOLVED-CONFIRM',
        source: 'HOME',
        target: 'CONFIRM',
        condition: 'HEADER_RESOLVED',
      },
      {
        id: 'HOME-HEADER_UNRESOLVED-ERROR',
        source: 'HOME',
        target: 'ERROR',
        condition: 'HEADER_UNRESOLVED',
      },
      {
        id: 'CONFIRM-SUBSCRIBED-THANKYOU',
        source: 'CONFIRM',
        target: 'THANKYOU',
        condition: 'SUBSCRIBED',
      },
    ],
  };

  try {
    console.log('\n[Setup] HEADER_INJECTION + startConfig (no checksub on land)');
    await putFlow(token, {
      verificationMode: 'HEADER_INJECTION',
      flowConfig: heFlow,
    });

    console.log('\n[Test 1] Detect → HOME page with MSISDN');
    const msisdn = `9665${String(Date.now()).slice(-8)}`;
    const det = await detect({ country, operator, campid, msisdn });
    assert(det.phone === msisdn, 'detect resolved MSISDN');
    assert(det.visitId, 'visitId present');

    const home = await getPage({
      country,
      operator,
      campid,
      page: 'HOME',
      msisdn,
      visitId: String(det.visitId),
      clickId: det.clickId || '',
    });
    assert(
      String(home.pageType || home.page || '').toUpperCase() === 'HOME' ||
        Boolean(home.html),
      'HOME page payload returned',
    );
    results.push({ test: 1, pass: true, visitId: det.visitId });

    console.log('\n[Test 2] POST /transition SUBSCRIBE (Hit Subscribe API)');
    const next = await transition({
      country,
      operator,
      campid,
      visitId: det.visitId,
      clickId: det.clickId,
      phone: msisdn,
      msisdn,
      fromPage: 'HOME',
      action: 'SUBSCRIBE',
    });
    const nextType = String(
      next.pageType || next.nextPage || next.page || '',
    ).toUpperCase();
    assert(
      ['CONFIRM', 'THANKYOU', 'ERROR', 'BLOCKED', 'INPROGRESS', 'LOW_BALANCE'].includes(
        nextType,
      ) || Boolean(next.html) || Boolean(next.externalRedirect),
      `SUBSCRIBE advanced funnel (got pageType=${nextType || 'n/a'})`,
    );
    console.log(`  → next pageType=${nextType || '(html/redirect)'}`);
    results.push({ test: 2, pass: true, nextType, visitId: det.visitId });
  } catch (e) {
    console.error('  ✗', e.message);
    results.push({ test: 'run', pass: false, error: e.message });
  } finally {
    console.log('\n[Cleanup] Restore original flow');
    try {
      await putFlow(token, {
        verificationMode: base.verificationMode,
        flowConfig: base.flowConfig,
      });
      console.log('  ✓ restored');
    } catch (e) {
      console.error('  ✗ restore failed', e.message);
    }
  }

  const failed = results.filter((r) => !r.pass).length;
  console.log('\n══════════════════════════════════════');
  console.log(
    `HE subscribe E2E: ${results.filter((r) => r.pass).length} passed, ${failed} failed`,
  );
  console.log(JSON.stringify(results, null, 2));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
