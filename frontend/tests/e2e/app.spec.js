import { test, expect } from '@playwright/test'

const E2E_EMAIL = 'abhivishwkarmaa52@gmail.com'
const E2E_PASSWORD = '123456'

async function loginAsAdmin(page) {
  await page.goto('/login')
  await page.locator('input[placeholder="you@company.com"]').fill(E2E_EMAIL)
  await page.locator('input[placeholder="Minimum 6 characters"]').fill(E2E_PASSWORD)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL(/\/markets/, { timeout: 15000 })
  await page.waitForLoadState('networkidle')
}

test.describe('TemplateCraft E2E', () => {
  test('login page shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.locator('input[placeholder="you@company.com"]')).toBeVisible()
  })

  test('markets page loads after auth', async ({ page }) => {
    await loginAsAdmin(page)
    await expect(page).toHaveURL(/\/markets/)
    await expect(page.getByRole('heading', { name: 'Markets' })).toBeVisible()
  })

  test('unknown route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/unknown-route')
    await expect(page).toHaveURL(/\/login/)
  })

  test('campaigns route redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/campaigns')
    await expect(page).toHaveURL(/\/login/)
  })

  test('subscription page requires country and operator', async ({ page }) => {
    await page.goto('/subscription')
    await expect(page.getByText('Invalid subscription URL')).toBeVisible()
  })
})
