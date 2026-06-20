import { test, expect } from '@playwright/test'

async function loginOrCreateUser(page, email, password) {
  await page.goto('/login')
  await page.locator('input[placeholder="you@example.com"]').fill(email)
  await page.locator('input[placeholder="Min 6 characters"]').fill(password)
  await page.locator('form button[type="submit"]').click()

  try {
    await page.waitForURL(/\/dashboard/, { timeout: 3000 })
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
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')
    } else {
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')
    }
  }
}

async function ensureProjectExists(page) {
  await page.goto('/dashboard')
  await page.waitForSelector('main.page-container')

  const count = await page.locator('.surface-card-interactive').count()
  if (count === 0) {
    await page.getByRole('button', { name: 'New Project' }).click()
    const titleInput = page.locator('input[placeholder="My Awesome Website"]')
    await titleInput.waitFor({ state: 'visible' })
    await titleInput.fill('E2E Test Project')
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.waitForURL(/\/builder\//, { timeout: 15000 })
    await page.goto('/dashboard')
    await page.locator('.surface-card-interactive').first().waitFor({ state: 'visible' })
  }
}

test.describe('TemplateCraft E2E', () => {
  const password = 'password123'

  test('login page shows login form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.locator('input[placeholder="you@example.com"]')).toBeVisible()
  })

  test('dashboard loads and shows projects after auth', async ({ page }) => {
    const email = `qa_${Date.now()}_db@example.com`
    await loginOrCreateUser(page, email, password)
    await expect(page.getByText('TemplateCraft')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Your Projects' })).toBeVisible()
  })

  test('navigates to templates page', async ({ page }) => {
    const email = `qa_${Date.now()}_tpl@example.com`
    await loginOrCreateUser(page, email, password)
    await page.getByRole('link', { name: 'Templates' }).click()
    await expect(page.getByText('Template Library')).toBeVisible()
  })

  test('builder loads GrapesJS editor', async ({ page }) => {
    const email = `qa_${Date.now()}_bld@example.com`
    await loginOrCreateUser(page, email, password)
    await ensureProjectExists(page)

    await page.goto('/dashboard')
    await page.locator('.surface-card-interactive').first().click()
    await page.waitForURL(/\/builder\//)

    await expect(page.locator('.tc-builder')).toBeVisible({ timeout: 20000 })
    await expect(page.locator('.gjs-editor-host')).toBeVisible()
  })

  test('builder interaction: add block and save', async ({ page }) => {
    const email = `qa_${Date.now()}_int@example.com`
    await loginOrCreateUser(page, email, password)
    await ensureProjectExists(page)

    await page.goto('/dashboard')
    await page.locator('.surface-card-interactive').first().click()
    await page.waitForURL(/\/builder\//)
    await page.locator('.tc-builder').waitFor({ state: 'visible', timeout: 20000 })

    const heroBlock = page.locator('#tc-blocks-mount .gjs-block').filter({ hasText: 'Hero Section' }).first()
    await heroBlock.waitFor({ state: 'visible', timeout: 10000 })
    await heroBlock.click()

    const saveBtn = page.getByRole('button', { name: /^Save$/ }).first()
    await saveBtn.click()

    await page.getByRole('button', { name: 'Back to dashboard' }).click()
    await page.waitForURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Your Projects' })).toBeVisible()
  })

  test('unknown route redirects to dashboard', async ({ page }) => {
    await page.goto('/unknown-route')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
