import { test, expect } from '@playwright/test'

const E2E_EMAIL = 'abhivishwkarmaa52@gmail.com'
const E2E_PASSWORD = '123456'
const API = 'http://localhost:3000/api'
const CAMPAIGN_ID = '8'
const DETAIL_PATH = '/markets/SA/201/campaigns/8'

async function loginAsAdmin(page) {
  await page.goto('/login')
  await page.locator('input[placeholder="you@company.com"]').fill(E2E_EMAIL)
  await page.locator('input[placeholder="Minimum 6 characters"]').fill(E2E_PASSWORD)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/markets/, { timeout: 15000 })
}

test.describe('Flow START/END + Subscribe CTA', () => {
  test('flow builder shows START/END and persists startConfig', async ({
    page,
    request,
  }) => {
    test.setTimeout(60000)
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    })
    expect(loginRes.ok()).toBe(true)
    const { accessToken } = await loginRes.json()
    const authHeaders = { Authorization: `Bearer ${accessToken}` }

    const beforeRes = await request.get(`${API}/campaigns/${CAMPAIGN_ID}/flow`, {
      headers: authHeaders,
    })
    expect(beforeRes.ok()).toBe(true)
    const before = await beforeRes.json()
    const beforeFlow = before.data || before

    await loginAsAdmin(page)
    await page.goto(`${DETAIL_PATH}#flow`)
    await expect(page.getByRole('heading', { name: 'Flow builder' })).toBeVisible({
      timeout: 15000,
    })

    // START / END nodes rendered in React Flow
    const startNode = page.locator('[data-testid="rf__node-__START__"]')
    const endNode = page.locator('[data-testid="rf__node-__END__"]')
    await expect(startNode).toBeVisible({ timeout: 15000 })
    await expect(endNode).toBeVisible()
    await expect(startNode.getByText('Before first page')).toBeVisible()

    // Landing checks panel is always visible (does not require selecting START node)
    const checks = page.getByTestId('flow-start-checks')
    await expect(checks.getByText('START — before first page')).toBeVisible()

    const heBox = checks.getByRole('checkbox', { name: /Header enrichment/i })
    const blockBox = checks.getByRole('checkbox', { name: /Blocklist check/i })
    const checksubBox = checks.getByRole('checkbox', { name: /Check subscription/i })

    await expect(heBox).toBeVisible()
    await expect(blockBox).toBeVisible()
    await expect(checksubBox).toBeVisible()

    // Toggle checksub off (ensure deterministic state)
    if (await checksubBox.isChecked()) {
      await checksubBox.uncheck()
    }
    if (await blockBox.isChecked()) {
      await blockBox.uncheck()
    }
    if (!(await heBox.isChecked()) && !(await heBox.isDisabled())) {
      await heBox.check()
    }

    await page.getByRole('button', { name: /Save flow/i }).click()
    await expect(
      page.getByText(/Flow saved|Flow settings saved/i).first(),
    ).toBeVisible({ timeout: 10000 })

    const afterRes = await request.get(`${API}/campaigns/${CAMPAIGN_ID}/flow`, {
      headers: authHeaders,
    })
    expect(afterRes.ok()).toBe(true)
    const after = await afterRes.json()
    const flowConfig = (after.data || after).flowConfig
    expect(flowConfig.startConfig).toBeTruthy()
    expect(flowConfig.startConfig.runChecksub).toBe(false)
    expect(flowConfig.startConfig.runBlocklist).toBe(false)

    // Restore prior flow so other e2e stay stable
    await request.put(`${API}/campaigns/${CAMPAIGN_ID}/flow`, {
      headers: authHeaders,
      data: {
        verificationMode: beforeFlow.verificationMode,
        flowConfig: beforeFlow.flowConfig,
      },
    })
  })

  test('editor Subscribe CTA label is Hit Subscribe API', async ({ page, request }) => {
    // Patch HOME with a SUBSCRIBE button, open editor, assert When clicked label
    const loginRes = await request.post(`${API}/auth/login`, {
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    })
    expect(loginRes.ok()).toBe(true)
    const { accessToken } = await loginRes.json()
    const authHeaders = { Authorization: `Bearer ${accessToken}` }

    const html = `<div style="padding:40px;text-align:center;">
      <button data-action="SUBSCRIBE" href="#" style="padding:12px 24px;">Subscribe</button>
    </div>`

    const patchRes = await request.patch(
      `${API}/campaigns/${CAMPAIGN_ID}/pages/HOME`,
      {
        headers: authHeaders,
        data: { html, css: '', projectData: {} },
      },
    )
    expect(patchRes.ok()).toBe(true)

    await loginAsAdmin(page)
    await page.goto(`/markets/SA/201/campaigns/${CAMPAIGN_ID}/edit/HOME`)
    await expect(page.locator('.tc-builder, .gjs-editor-host').first()).toBeVisible({
      timeout: 20000,
    })

    // Click the Subscribe button on canvas (iframe or host)
    const canvas = page.frameLocator('iframe.gjs-frame').first()
    const btnInFrame = canvas.locator('[data-action="SUBSCRIBE"], button').first()
    if (await btnInFrame.count().catch(() => 0)) {
      await btnInFrame.click({ timeout: 10000 }).catch(() => {})
    } else {
      // Fallback: select via grapes component click in host
      await page.locator('.gjs-cv-canvas, .gjs-frame-wrapper').first().click({
        position: { x: 200, y: 120 },
        timeout: 5000,
      }).catch(() => {})
    }

    // Properties panel: When clicked should offer Hit Subscribe API
    const whenClicked = page.locator('select').filter({
      has: page.locator('option[value="flow"]'),
    }).first()
    await expect(whenClicked).toBeVisible({ timeout: 15000 })
    await expect(whenClicked.locator('option[value="flow"]')).toHaveText(
      /Hit Subscribe API/i,
    )
  })
})
