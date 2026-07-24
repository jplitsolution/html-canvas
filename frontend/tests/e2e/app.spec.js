import { test, expect } from '@playwright/test'

async function loginOrCreateUser(page, email, password) {
  await page.goto('/login')
  await page.locator('input[placeholder="you@example.com"]').fill(email)
  await page.locator('input[placeholder="Min 6 characters"]').fill(password)
  await page.locator('form button[type="submit"]').click()

  try {
    await page.waitForURL(/\/markets/, { timeout: 3000 })
    await page.waitForLoadState('networkidle')
    return
  } catch {
    const registerBtn = page.getByRole('button', { name: 'Create new account' })
    if (await registerBtn.isVisible()) {
      await registerBtn.click()
      await page.locator('input[placeholder="Your name"]').fill('Test User')
      await page.locator('input[placeholder="you@example.com"]').fill(email)
      await page.locator('input[placeholder="Min 6 characters"]').fill(password)
      await page.getByRole('button', { name: 'Create account' }).click()
      await page.waitForURL(/\/markets/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')
    } else {
      await page.waitForURL(/\/markets/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')
    }
  }
}

test.describe('TemplateCraft E2E', () => {
  const password = 'password123'

  test('login page shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.locator('input[placeholder="you@example.com"]')).toBeVisible()
  })

  test('markets page loads after auth', async ({ page }) => {
    const email = `qa_${Date.now()}_cmp@example.com`
    await loginOrCreateUser(page, email, password)
    await expect(page.getByText('TemplateCraft')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Markets' })).toBeVisible()
  })

  test('unknown route redirects to markets', async ({ page }) => {
    await page.goto('/unknown-route')
    await expect(page).toHaveURL(/\/markets/)
  })

  test('campaigns route redirects to markets', async ({ page }) => {
    await page.goto('/campaigns')
    await expect(page).toHaveURL(/\/markets/)
  })

  test('subscription page requires country and operator', async ({ page }) => {
    await page.goto('/subscription')
    await expect(page.getByText('Invalid subscription URL')).toBeVisible()
  })
})
