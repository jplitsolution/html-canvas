import { test, expect } from '@playwright/test'

test('Full E2E: Priority Flow Subscribe button navigates to THANKYOU and Stays stably', async ({ page, request }) => {
  // Step 1: Login via backend API
  const loginRes = await request.post('http://localhost:3000/api/auth/login', {
    data: { email: 'qq@gmail.com', password: 'qq1234' }
  })
  expect(loginRes.ok()).toBe(true)
  const loginResult = await loginRes.json()
  const token = loginResult.data.accessToken
  const authHeaders = { Authorization: `Bearer ${token}` }

  // Step 2: Update campaign 8 flow mode to MSISDN_ONLY so OTP route guard allows direct THANKYOU page
  const flowConfigRes = await request.get('http://localhost:3000/api/campaigns/8/flow', { headers: authHeaders })
  if (flowConfigRes.ok()) {
    const flowConfigData = await flowConfigRes.json()
    await request.put('http://localhost:3000/api/campaigns/8/flow', {
      headers: authHeaders,
      data: {
        verificationMode: 'MSISDN_ONLY',
        flowConfig: flowConfigData.data?.flowConfig || flowConfigData.flowConfig
      }
    })
  }

  // Step 3: Prepare valid HTML content with Priority Chain
  const priorityActions = JSON.stringify([
    { type: 'api', url: 'http://localhost:3000/api/flow/entry?country=India&operator=qq&page=HOME' },
    { type: 'page', page: 'THANKYOU' },
    { type: 'page', page: 'ERROR' }
  ])

  const testHtml = `<div style="text-align:center;padding:50px;">
    <button data-action="CHAIN" data-actions='${priorityActions}' style="padding:15px 30px;font-size:18px;background:#7C4DFF;color:#fff;border:none;border-radius:8px;cursor:pointer;">Subscribe Now</button>
  </div>`

  // Step 4: Save updated page content to backend DB for campaign 8 HOME page
  const patchRes = await request.patch('http://localhost:3000/api/campaigns/8/pages/HOME', {
    headers: authHeaders,
    data: {
      html: testHtml,
      css: '',
      projectData: {}
    }
  })
  expect(patchRes.ok()).toBe(true)

  // Step 5: Open live subscription preview page in browser
  await page.goto('http://localhost:5173/subscription?country=India&operator=qq&campid=8&msisdn=919876543210&step=HOME')

  // Step 6: Wait until Shadow DOM content is loaded and rendered
  await page.waitForFunction(() => {
    const host = document.querySelector('.flow-runtime-host')
    return host && host.shadowRoot && host.shadowRoot.querySelector('[data-action], [data-actions], button, a')
  }, { timeout: 15000 })

  // Step 7: Dispatch click on Subscribe button inside Shadow DOM
  const clicked = await page.evaluate(() => {
    const hostEl = document.querySelector('.flow-runtime-host')
    if (!hostEl || !hostEl.shadowRoot) return false
    const shadow = hostEl.shadowRoot
    const target = shadow.querySelector('[data-action], [data-actions], button, a')
    if (target) {
      target.click()
      return true
    }
    return false
  })

  expect(clicked).toBe(true)

  // Step 8: Verify URL changes to step=THANKYOU
  await page.waitForURL(/step=THANKYOU/, { timeout: 10000 })
  expect(page.url()).toContain('step=THANKYOU')

  // Step 9: Wait 3 seconds to confirm page STAYS on THANKYOU and does NOT bounce back to HOME or OTP
  await page.waitForTimeout(3000)
  expect(page.url()).toContain('step=THANKYOU')

  console.log('🎉 FULL AUTOMATED BROWSER E2E TEST PASSED! STAYS ON THANKYOU PAGE!')
})
