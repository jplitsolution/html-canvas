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
let projectId = null
let templateId = null
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

  // Health
  const health = await request('GET', '/')
  assert('GET /', health.ok, `status ${health.status}`)

  // Register
  const reg = await request('POST', '/auth/register', {
    body: { email: testEmail, password: testPassword, name: testName },
  })
  assert('POST /auth/register', reg.status === 201 || reg.status === 200, JSON.stringify(reg.json))

  // Login
  const login = await request('POST', '/auth/login', {
    body: { email: testEmail, password: testPassword },
  })
  token = login.json?.data?.accessToken || login.json?.accessToken || ''
  assert('POST /auth/login', !!token, JSON.stringify(login.json))

  // Me
  const me = await request('GET', '/auth/me', { token })
  assert('GET /auth/me', me.ok && me.json?.data?.email === testEmail, JSON.stringify(me.json))

  // Prebuilt templates
  const prebuilt = await request('GET', '/templates/prebuilt')
  const templates = prebuilt.json?.data || []
  assert('GET /templates/prebuilt', prebuilt.ok && Array.isArray(templates), `count=${templates.length}`)

  // Get template by id
  if (templates.length > 0) {
    templateId = templates[0].id
    const one = await request('GET', `/templates/${templateId}`)
    assert('GET /templates/:id', one.ok, JSON.stringify(one.json))
  } else {
    assert('GET /templates/:id', false, 'no prebuilt templates seeded')
  }

  // User templates (empty initially)
  const userTpl = await request('GET', '/templates/user', { token })
  assert('GET /templates/user', userTpl.ok, JSON.stringify(userTpl.json))

  // Create project
  const createProj = await request('POST', '/projects', {
    token,
    body: {
      name: 'API Test Project',
      data: { layout: [], version: 1, metadata: { tags: [], description: '' } },
    },
  })
  projectId = createProj.json?.data?.id
  assert('POST /projects', createProj.ok && projectId, JSON.stringify(createProj.json))

  // List projects
  const listProj = await request('GET', '/projects', { token })
  const projects = listProj.json?.data || []
  assert('GET /projects', listProj.ok && projects.length >= 1, `count=${projects.length}`)

  // Get project
  if (projectId) {
    const getProj = await request('GET', `/projects/${projectId}`, { token })
    assert('GET /projects/:id', getProj.ok, JSON.stringify(getProj.json))

    // Update project
    const patch = await request('PATCH', `/projects/${projectId}`, {
      token,
      body: {
        name: 'Updated API Project',
        data: { layout: [{ id: 'b1', type: 'text', content: { text: 'Hello' } }], version: 1 },
      },
    })
    assert('PATCH /projects/:id', patch.ok, JSON.stringify(patch.json))
  }

  // Save user template
  const saveTpl = await request('POST', '/templates', {
    token,
    body: {
      name: 'My Custom Template',
      data: { slug: 'custom-test', layout: [], description: 'test', thumbnail: '' },
    },
  })
  const savedTplId = saveTpl.json?.data?.id
  assert('POST /templates', saveTpl.ok && savedTplId, JSON.stringify(saveTpl.json))

  // Delete user template
  if (savedTplId) {
    const delTpl = await request('DELETE', `/templates/${savedTplId}`, { token })
    assert('DELETE /templates/:id', delTpl.ok, JSON.stringify(delTpl.json))
  }

  // Upload image (1x1 PNG)
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

  // Delete project
  if (projectId) {
    const delProj = await request('DELETE', `/projects/${projectId}`, { token })
    assert('DELETE /projects/:id', delProj.ok, JSON.stringify(delProj.json))
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed\n`)
  process.exit(failed > 0 ? 1 : 0)
}

run().catch((err) => {
  console.error('Test runner failed:', err.message)
  process.exit(1)
})
