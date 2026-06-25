#!/usr/bin/env node
/**
 * End-to-end API smoke test for TemplateCraft backend
 * Usage: node scripts/test-apis.mjs
 */
const BASE = process.env.API_BASE || 'http://localhost:3000/api'
const testEmail = `test_${Date.now()}@templatecraft.local`
const testPassword = 'testpass123'
const testName = 'API Test User'

let token = ''
let campaignId = null
let passed = 0
let failed = 0

async function request(method, path, { body, token: authToken, formData } = {}) {
  const headers = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (body && !formData) headers['Content-Type'] = 'application/json'

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  })

  const text = await res.text()
  let json = null
  try {
    json = text ? JSON.parse(text) : null
  } catch {
    json = { raw: text }
  }

  return { status: res.status, ok: res.ok, json }
}

function assert(name, condition, detail = '') {
  if (condition) {
    console.log(`  ✓ ${name}`)
    passed++
  } else {
    console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function run() {
  console.log(`\nTemplateCraft API tests → ${BASE}\n`)

  const health = await request('GET', '/')
  assert('GET /', health.ok, `status ${health.status}`)

  const reg = await request('POST', '/auth/register', {
    body: { email: testEmail, password: testPassword, name: testName },
  })
  assert('POST /auth/register', reg.status === 201 || reg.status === 200, JSON.stringify(reg.json))

  const login = await request('POST', '/auth/login', {
    body: { email: testEmail, password: testPassword },
  })
  token = login.json?.data?.accessToken || login.json?.accessToken || ''
  assert('POST /auth/login', !!token, JSON.stringify(login.json))

  const me = await request('GET', '/auth/me', { token })
  assert('GET /auth/me', me.ok && me.json?.data?.email === testEmail, JSON.stringify(me.json))

  const prebuilt = await request('GET', '/templates/prebuilt')
  const templates = prebuilt.json?.data || []
  assert('GET /templates/prebuilt', prebuilt.ok && Array.isArray(templates), `count=${templates.length}`)

  const createCampaign = await request('POST', '/campaigns', {
    token,
    body: {
      name: 'API Test India Zain',
      country: 'India',
      operator: 'Zain',
      serviceId: 'test_svc',
    },
  })
  campaignId = createCampaign.json?.data?.id
  assert('POST /campaigns', createCampaign.ok && campaignId, JSON.stringify(createCampaign.json))

  const listCampaigns = await request('GET', '/campaigns', { token })
  const campaigns = listCampaigns.json?.data || []
  assert('GET /campaigns', listCampaigns.ok && campaigns.length >= 1, `count=${campaigns.length}`)

  if (campaignId) {
    const getCampaign = await request('GET', `/campaigns/${campaignId}`, { token })
    assert('GET /campaigns/:id', getCampaign.ok, JSON.stringify(getCampaign.json))

    const applyDefaults = await request('POST', `/campaigns/${campaignId}/apply-defaults`, { token })
    assert('POST /campaigns/:id/apply-defaults', applyDefaults.ok, JSON.stringify(applyDefaults.json))

    const activate = await request('PATCH', `/campaigns/${campaignId}`, {
      token,
      body: { active: true },
    })
    assert('PATCH /campaigns/:id (activate)', activate.ok, JSON.stringify(activate.json))

    const flowPage = await request(
      'GET',
      '/flow/page?country=India&operator=Zain&page=HOME&msisdn=919876543210',
    )
    assert('GET /flow/page', flowPage.ok, JSON.stringify(flowPage.json))
  }

  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  const buffer = Buffer.from(pngBase64, 'base64')
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: 'image/png' }), 'test.png')
  const upload = await request('POST', '/uploads', { token, formData: form })
  assert(
    'POST /uploads',
    upload.ok && upload.json?.data?.url,
    upload.json?.message || JSON.stringify(upload.json),
  )

  if (campaignId) {
    const delCampaign = await request('DELETE', `/campaigns/${campaignId}`, { token })
    assert('DELETE /campaigns/:id', delCampaign.ok, JSON.stringify(delCampaign.json))
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Test runner failed:', err.message)
  process.exit(1)
})
