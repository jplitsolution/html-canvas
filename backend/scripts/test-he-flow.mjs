#!/usr/bin/env node
/**
 * TemplateCraft — HE (Header Injection) Flow Test Script
 *
 * HOW HE ACTUALLY WORKS (2-step flow):
 *  Step 1: GET /flow/page  → HOME page ka HTML + visitId milta hai
 *           (x-msisdn header yahan backend visit record mein save hota hai)
 *  Step 2: POST /flow/transition  → User ne Subscribe button dabaya
 *           (Backend yahan HE check karta hai aur nextPage decide karta hai)
 *
 * Chalane ka tarika:
 *   cd backend
 *   node scripts/test-he-flow.mjs
 *
 * Custom backend URL:
 *   API_BASE=http://localhost:3000/api node scripts/test-he-flow.mjs
 */

// ─── ANSI Color Codes ─────────────────────────────────────────────────────────
const C = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  dim:     '\x1b[2m',
  red:     '\x1b[31m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  blue:    '\x1b[34m',
  magenta: '\x1b[35m',
  cyan:    '\x1b[36m',
  bgBlue:  '\x1b[44m',
  bgGreen: '\x1b[42m',
  bgRed:   '\x1b[41m',
  bgYellow:'\x1b[43m',
}

const W = 62

function line(char = '─') { return char.repeat(W) }

function box(title, color = C.cyan) {
  console.log(`\n${color}${C.bold}┌${line()}┐${C.reset}`)
  const label = `  🧪  ${title}`
  console.log(`${color}${C.bold}│${label.padEnd(W + 1)}│${C.reset}`)
  console.log(`${color}${C.bold}└${line()}┘${C.reset}`)
}

function subBox(label) {
  console.log(`\n  ${C.magenta}${C.bold}▸ ${label}${C.reset}`)
  console.log(`  ${C.dim}${'·'.repeat(W - 2)}${C.reset}`)
}

function logSent(method, url, headers = {}, body = null) {
  console.log(`\n  ${C.cyan}${C.bold}📤 REQUEST${C.reset}`)
  console.log(`  ${C.bold}Method :${C.reset} ${C.yellow}${method}${C.reset}`)
  console.log(`  ${C.bold}URL    :${C.reset} ${C.blue}${url}${C.reset}`)

  const safeHeaders = {}
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== 'authorization') safeHeaders[k] = v
  }
  if (Object.keys(safeHeaders).length > 0) {
    console.log(`  ${C.bold}Headers:${C.reset}`)
    for (const [k, v] of Object.entries(safeHeaders)) {
      // HE header ko highlight karo
      const isHE = k.toLowerCase().includes('msisdn')
      const valColor = isHE ? C.green + C.bold : C.dim
      const tag = isHE ? ` ${C.yellow}← HE Header${C.reset}` : ''
      console.log(`    ${C.dim}${k}:${C.reset} ${valColor}${v}${C.reset}${tag}`)
    }
  }
  if (body) {
    const pretty = JSON.stringify(body, null, 2)
      .split('\n')
      .map(l => `    ${C.dim}${l}${C.reset}`)
      .join('\n')
    console.log(`  ${C.bold}Body   :${C.reset}\n${pretty}`)
  }
}

function logReceived(status, json, ms) {
  const statusColor = status >= 200 && status < 300 ? C.green : C.red
  console.log(`\n  ${C.magenta}${C.bold}📥 RESPONSE${C.reset}  ${C.dim}(${ms}ms)${C.reset}`)
  console.log(`  ${C.bold}Status :${C.reset} ${statusColor}${C.bold}${status}${C.reset}`)

  if (json) {
    // Saari fields print karo, lekin html/css trim karo
    const display = { ...(json?.data ?? json) }
    if (display.html) display.html = `[${display.html.length} chars — trimmed]`
    if (display.css)  display.css  = `[${display.css.length} chars — trimmed]`

    const pretty = JSON.stringify(display, null, 2)
      .split('\n')
      .map(l => `    ${C.dim}${l}${C.reset}`)
      .join('\n')
    console.log(`  ${C.bold}Data   :${C.reset}\n${pretty}`)
  }
}

function ok(msg, detail = '') {
  console.log(`\n  ${C.bgGreen}${C.bold} PASS ${C.reset} ${C.green}${C.bold}${msg}${C.reset}${detail ? `  ${C.dim}→ ${detail}${C.reset}` : ''}`)
  passed++
}

function fail(msg, detail = '') {
  console.log(`\n  ${C.bgRed}${C.bold} FAIL ${C.reset} ${C.red}${C.bold}${msg}${C.reset}${detail ? `  ${C.dim}→ ${detail}${C.reset}` : ''}`)
  failed++
}

function assert(name, condition, detail = '') {
  condition ? ok(name, detail) : fail(name, detail)
}

function info(msg) {
  console.log(`\n  ${C.bgYellow}\x1b[30m INFO ${C.reset} ${C.yellow}${msg}${C.reset}`)
}

function note(msg) {
  console.log(`  ${C.dim}   ℹ  ${msg}${C.reset}`)
}

// ─── HTTP Helper ──────────────────────────────────────────────────────────────
const BASE = process.env.API_BASE || 'http://localhost:3000/api'

async function request(method, path, { body, authToken, extraHeaders = {}, silent = false } = {}) {
  const headers = { ...extraHeaders }
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (body) headers['Content-Type'] = 'application/json'

  const fullUrl = `${BASE}${path}`

  if (!silent) logSent(method, fullUrl, headers, body)

  const t0 = Date.now()
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })
  const ms = Date.now() - t0

  const text = await res.text()
  let json = null
  try { json = text ? JSON.parse(text) : null } catch { json = { raw: text } }

  if (!silent) logReceived(res.status, json, ms)

  return { status: res.status, ok: res.ok, json, ms }
}

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const DUMMY = {
  email:       `he_test_${Date.now()}@templatecraft.local`,
  password:    'TestPass@1234',
  name:        'HE Flow Tester',
  country:     'IN',
  operator:    'airtel',
  operator2:   'bsnl',
  dummyMsisdn: '919876543210',   // Fake India number
  serviceId:   'svc_he_test_001',
}

// ─── State ────────────────────────────────────────────────────────────────────
let passed = 0
let failed = 0
let token = ''
let campaignIdHI  = null   // HEADER_INJECTION
let campaignIdOTP = null   // OTP_ONLY

// ─── Summary Banner ───────────────────────────────────────────────────────────
function printDummyData() {
  console.log(`\n${C.yellow}${C.bold}  📋 DUMMY DATA (yeh data test mein use hoga)${C.reset}`)
  console.log(`  ${C.dim}${line()}${C.reset}`)
  for (const [k, v] of Object.entries(DUMMY)) {
    console.log(`  ${C.bold}${k.padEnd(16)}${C.reset}: ${C.cyan}${v}${C.reset}`)
  }
  console.log(`  ${C.dim}${line()}${C.reset}`)

  console.log(`\n${C.yellow}${C.bold}  📌 HE FLOW — 2 STEPS KAISE KAAM KARTA HAI${C.reset}`)
  console.log(`  ${C.dim}${line()}${C.reset}`)
  console.log(`  ${C.bold}Step 1:${C.reset} ${C.blue}GET /flow/page${C.reset}  ← x-msisdn header yahan aata hai`)
  console.log(`          Backend visit record mein phone save karta hai`)
  console.log(`          Response mein: ${C.green}visitId${C.reset} + ${C.green}pageType (HOME)${C.reset}`)
  console.log(`  ${C.bold}Step 2:${C.reset} ${C.blue}POST /flow/transition${C.reset}  ← User ne Subscribe dabaya`)
  console.log(`          Backend: visit ka phone check → HE decide → nextPage`)
  console.log(`          Response mein: ${C.green}nextPage${C.reset} (CONFIRM / OTP / ERROR)`)
  console.log(`  ${C.dim}${line()}${C.reset}`)
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 1 — Auth
// ═════════════════════════════════════════════════════════════════════════════
async function setupAuth() {
  box('STEP 1 — Dummy User Register & Login')

  subBox('Register new test user')
  const reg = await request('POST', '/auth/register', {
    body: { email: DUMMY.email, password: DUMMY.password, name: DUMMY.name },
  })
  assert('User registered', reg.status === 201 || reg.status === 200)

  subBox('Login → JWT token lo')
  const login = await request('POST', '/auth/login', {
    body: { email: DUMMY.email, password: DUMMY.password },
  })
  token = login.json?.data?.accessToken || login.json?.accessToken || ''
  assert('JWT token mila', !!token, token ? `...${token.slice(-12)}` : 'MISSING')
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 2 — Campaigns
// ═════════════════════════════════════════════════════════════════════════════
async function setupCampaigns() {
  box('STEP 2 — Dummy Campaigns Banao')

  // ── Campaign A: HEADER_INJECTION ──────────────────────────────────────────
  subBox(`Campaign A → HEADER_INJECTION  [${DUMMY.country} / ${DUMMY.operator}]`)
  const c1 = await request('POST', '/campaigns', {
    authToken: token,
    body: {
      name: `[HE-TEST] ${DUMMY.country} ${DUMMY.operator} Header Injection`,
      country: DUMMY.country,
      operator: DUMMY.operator,
      serviceId: DUMMY.serviceId,
      // verificationMode yahan nahi — CreateCampaignDto mein nahi hota
    },
  })
  campaignIdHI = c1.json?.id || c1.json?.data?.id
  assert('Campaign A (HI) bana', !!campaignIdHI, `id = ${campaignIdHI}`)

  if (campaignIdHI) {
    // Step 1: Default pages banao
    await request('POST', `/campaigns/${campaignIdHI}/apply-defaults`, { authToken: token, silent: true })

    // Step 2: verificationMode SET karo — correct endpoint: PUT /campaigns/:id/flow
    const flowA = await request('PUT', `/campaigns/${campaignIdHI}/flow`, {
      authToken: token,
      body: { verificationMode: 'HEADER_INJECTION' },
    })
    assert('Campaign A verificationMode = HEADER_INJECTION', flowA.ok)

    // Step 3: Active karo
    const actA = await request('PATCH', `/campaigns/${campaignIdHI}`, {
      authToken: token,
      body: { active: true },
      silent: true,
    })
    assert('Campaign A active hua', actA.ok)
    note(`Campaign A — id=${campaignIdHI}, mode=HEADER_INJECTION, active=true`)
  }

  // ── Campaign B: OTP_ONLY ──────────────────────────────────────────────────
  subBox(`Campaign B → OTP_ONLY  [${DUMMY.country} / ${DUMMY.operator2}]`)
  const c2 = await request('POST', '/campaigns', {
    authToken: token,
    body: {
      name: `[HE-TEST] ${DUMMY.country} ${DUMMY.operator2} OTP Only`,
      country: DUMMY.country,
      operator: DUMMY.operator2,
      serviceId: DUMMY.serviceId,
      // verificationMode yahan nahi — CreateCampaignDto mein nahi hota
    },
  })
  campaignIdOTP = c2.json?.id || c2.json?.data?.id
  assert('Campaign B (OTP) bana', !!campaignIdOTP, `id = ${campaignIdOTP}`)

  if (campaignIdOTP) {
    // Step 1: Default pages banao
    await request('POST', `/campaigns/${campaignIdOTP}/apply-defaults`, { authToken: token, silent: true })

    // Step 2: verificationMode SET karo — correct endpoint: PUT /campaigns/:id/flow
    const flowB = await request('PUT', `/campaigns/${campaignIdOTP}/flow`, {
      authToken: token,
      body: { verificationMode: 'OTP_ONLY' },
    })
    assert('Campaign B verificationMode = OTP_ONLY', flowB.ok)

    // Step 3: Active karo
    const actB = await request('PATCH', `/campaigns/${campaignIdOTP}`, {
      authToken: token,
      body: { active: true },
      silent: true,
    })
    assert('Campaign B active hua', actB.ok)
    note(`Campaign B — id=${campaignIdOTP}, mode=OTP_ONLY, active=true`)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 3 — HE Flow Tests (2-step each)
// ═════════════════════════════════════════════════════════════════════════════
async function testHEFlow() {
  if (!campaignIdHI) {
    info('Campaign HI missing — HE tests skip kar rahe hain')
    return
  }

  // ─── TEST A: HE SUCCESS ───────────────────────────────────────────────────
  box('TEST A — HE SUCCESS  (carrier ne x-msisdn inject kiya)', C.green)
  console.log(`\n  ${C.bold}📌 Scenario:${C.reset}`)
  console.log(`     User mobile data pe hai (Airtel SIM)`)
  console.log(`     Airtel ne request mein phone number header inject kiya`)
  console.log(`     Expected nextPage: ${C.green}${C.bold}CONFIRM${C.reset} (1-click subscription!)`)

  // Step 1: Page load — x-msisdn header bhejo
  info('[Step 1] GET /flow/page — x-msisdn header ke saath (carrier simulate)')
  const pageA = await request(
    'GET',
    `/flow/page?country=${DUMMY.country}&operator=${DUMMY.operator}&page=HOME&campid=${campaignIdHI}`,
    {
      extraHeaders: {
        'x-msisdn':   DUMMY.dummyMsisdn,
        'user-agent': 'Mozilla/5.0 (Android; Mobile-HE-Test)',
      },
    },
  )

  const visitIdA = pageA.json?.data?.visitId || pageA.json?.visitId
  const pageTypeA = pageA.json?.data?.pageType || pageA.json?.pageType
  assert('Step 1: HOME page mila', pageTypeA === 'HOME', `pageType=${pageTypeA}`)
  assert('Step 1: visitId mila', !!visitIdA, `visitId=${visitIdA}`)
  note(`visitId = ${visitIdA} (yeh next step mein use hoga)`)

  // Step 2: Transition — Subscribe button click simulate
  info('[Step 2] POST /flow/transition — Subscribe dabaya, HE check hoga')
  const transA = await request('POST', '/flow/transition', {
    body: {
      visitId:  visitIdA,
      country:  DUMMY.country,
      operator: DUMMY.operator,
      fromPage: 'HOME',
      action:   'SUBSCRIBE',
      phone:    DUMMY.dummyMsisdn,   // visit mein already save hai, yahan bhi dete hain
      campid:   String(campaignIdHI),
    },
  })

  const nextPageA = transA.json?.data?.pageType || transA.json?.pageType
  assert(
    'HE SUCCESS → nextPage = CONFIRM',
    nextPageA === 'CONFIRM',
    `nextPage="${nextPageA}"`,
  )

  // ─── TEST B: HE FAIL (Wi-Fi) ──────────────────────────────────────────────
  box('TEST B — HE FAIL  (Wi-Fi user, koi header nahi)', C.red)
  console.log(`\n  ${C.bold}📌 Scenario:${C.reset}`)
  console.log(`     User Wi-Fi pe hai`)
  console.log(`     Koi x-msisdn header nahi aata`)
  console.log(`     HEADER_INJECTION mode mein → Expected: ${C.red}${C.bold}ERROR${C.reset}`)

  // Step 1: Bina header ke page load
  info('[Step 1] GET /flow/page — bina x-msisdn header ke (Wi-Fi simulate)')
  const pageB = await request(
    'GET',
    `/flow/page?country=${DUMMY.country}&operator=${DUMMY.operator}&page=HOME&campid=${campaignIdHI}`,
    {
      extraHeaders: {
        'user-agent': 'Mozilla/5.0 (Windows NT; WiFi-Sim)',
        // x-msisdn nahi bheja
      },
    },
  )

  const visitIdB = pageB.json?.data?.visitId || pageB.json?.visitId
  assert('Step 1: HOME page mila', (pageB.json?.data?.pageType || pageB.json?.pageType) === 'HOME')
  assert('Step 1: visitId mila', !!visitIdB, `visitId=${visitIdB}`)

  // Step 2: Transition — phone nahi hai (koi header nahi tha)
  info('[Step 2] POST /flow/transition — Subscribe dabaya, phone nahi → ERROR expected')
  const transB = await request('POST', '/flow/transition', {
    body: {
      visitId:  visitIdB,
      country:  DUMMY.country,
      operator: DUMMY.operator,
      fromPage: 'HOME',
      action:   'SUBSCRIBE',
      // phone nahi bheja — Wi-Fi user ke paas number nahi
      campid:   String(campaignIdHI),
    },
  })

  const nextPageB = transB.json?.data?.pageType || transB.json?.pageType
  assert(
    'HE FAIL → nextPage = ERROR (phone nahi, HI mode)',
    nextPageB === 'ERROR' || nextPageB === 'OTP',
    `nextPage="${nextPageB}" (ERROR = perfect HI, OTP = flowConfig mein OTP node hai)`,
  )

  // ─── TEST C: msisdn via Query Param ──────────────────────────────────────
  box('TEST C — HE via msisdn= Query Param  (browser dev testing trick)', C.cyan)
  console.log(`\n  ${C.bold}📌 Scenario:${C.reset}`)
  console.log(`     Header inject possible nahi (localhost/Postman)`)
  console.log(`     msisdn= query param se number pass karo`)
  console.log(`     Expected: ${C.green}${C.bold}CONFIRM${C.reset} (same as HE Success)`)

  info('[Step 1] GET /flow/page — msisdn= query param se (header nahi, param se)')
  const pageC = await request(
    'GET',
    `/flow/page?country=${DUMMY.country}&operator=${DUMMY.operator}&page=HOME&campid=${campaignIdHI}&msisdn=${DUMMY.dummyMsisdn}`,
  )

  const visitIdC = pageC.json?.data?.visitId || pageC.json?.visitId
  assert('Step 1: HOME page mila', (pageC.json?.data?.pageType || pageC.json?.pageType) === 'HOME')
  assert('Step 1: visitId mila', !!visitIdC, `visitId=${visitIdC}`)

  info('[Step 2] POST /flow/transition — phone body mein bhejo')
  const transC = await request('POST', '/flow/transition', {
    body: {
      visitId:  visitIdC,
      country:  DUMMY.country,
      operator: DUMMY.operator,
      fromPage: 'HOME',
      action:   'SUBSCRIBE',
      phone:    DUMMY.dummyMsisdn,
      campid:   String(campaignIdHI),
    },
  })

  const nextPageC = transC.json?.data?.pageType || transC.json?.pageType
  assert(
    'Query param MSISDN → nextPage = CONFIRM',
    nextPageC === 'CONFIRM',
    `nextPage="${nextPageC}"`,
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 4 — OTP_ONLY Test
// ═════════════════════════════════════════════════════════════════════════════
async function testOTPOnlyFlow() {
  if (!campaignIdOTP) {
    info('Campaign OTP missing — OTP tests skip kar rahe hain')
    return
  }

  box('TEST D — OTP_ONLY Mode  (header hoga bhi to ignore hoga)', C.yellow)
  console.log(`\n  ${C.bold}📌 Scenario:${C.reset}`)
  console.log(`     Campaign ka mode OTP_ONLY hai`)
  console.log(`     x-msisdn header pass kiya jaata hai`)
  console.log(`     Backend header ko ignore karega`)
  console.log(`     Expected: ${C.yellow}${C.bold}OTP${C.reset} page (user ko number enter karna padega)`)

  info('[Step 1] GET /flow/page — x-msisdn header bhejo (ignore hoga)')
  const pageD = await request(
    'GET',
    `/flow/page?country=${DUMMY.country}&operator=${DUMMY.operator2}&page=HOME&campid=${campaignIdOTP}`,
    {
      extraHeaders: {
        'x-msisdn':   DUMMY.dummyMsisdn,
        'user-agent': 'Mozilla/5.0 (Android; OTP-Mode-Test)',
      },
    },
  )

  const visitIdD = pageD.json?.data?.visitId || pageD.json?.visitId
  assert('Step 1: HOME page mila', (pageD.json?.data?.pageType || pageD.json?.pageType) === 'HOME')
  assert('Step 1: visitId mila', !!visitIdD, `visitId=${visitIdD}`)

  info('[Step 2] POST /flow/transition — OTP_ONLY → OTP page aana chahiye')
  const transD = await request('POST', '/flow/transition', {
    body: {
      visitId:  visitIdD,
      country:  DUMMY.country,
      operator: DUMMY.operator2,
      fromPage: 'HOME',
      action:   'SUBSCRIBE',
      // phone bheja lekin OTP_ONLY mode mein yeh ignored hoga (OTP mandatory)
      campid:   String(campaignIdOTP),
    },
  })

  const nextPageD = transD.json?.data?.pageType || transD.json?.pageType
  assert(
    'OTP_ONLY → nextPage = OTP (header/phone ignore hua)',
    nextPageD === 'OTP',
    `nextPage="${nextPageD}"`,
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// STEP 5 — Cleanup
// ═════════════════════════════════════════════════════════════════════════════
async function cleanup() {
  box('STEP 5 — Cleanup (dummy data delete karna)', C.magenta)

  if (campaignIdHI) {
    const d1 = await request('DELETE', `/campaigns/${campaignIdHI}`, { authToken: token, silent: true })
    assert(`Campaign A (HI, id=${campaignIdHI}) deleted`, d1.ok)
  }
  if (campaignIdOTP) {
    const d2 = await request('DELETE', `/campaigns/${campaignIdOTP}`, { authToken: token, silent: true })
    assert(`Campaign B (OTP, id=${campaignIdOTP}) deleted`, d2.ok)
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
async function run() {
  const startTime = Date.now()

  console.log(`\n${C.bgBlue}${C.bold}${'  TemplateCraft — HE (Header Injection) Full Flow Test  '.padEnd(W + 2)}${C.reset}`)
  console.log(`${C.dim}  Backend : ${BASE}${C.reset}`)
  console.log(`${C.dim}  Started : ${new Date().toLocaleTimeString('en-IN')}${C.reset}`)

  printDummyData()

  await setupAuth()
  await setupCampaigns()
  await testHEFlow()
  await testOTPOnlyFlow()
  await cleanup()

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)

  console.log(`\n${C.bold}${line('═')}${C.reset}`)
  console.log(failed === 0
    ? `${C.green}${C.bold}  ✅  Passed : ${passed}   🎉 Sab tests pass!${C.reset}`
    : `${C.green}${C.bold}  ✅  Passed : ${passed}${C.reset}   ${C.red}${C.bold}❌  Failed : ${failed}${C.reset}`)
  console.log(`${C.dim}  ⏱   Time   : ${elapsed}s${C.reset}`)
  console.log(`${C.bold}${line('═')}${C.reset}\n`)

  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error(`\n${C.bgRed}${C.bold} 💥 CRASH ${C.reset} ${C.red}${err.message}${C.reset}\n`)
  process.exit(1)
})
