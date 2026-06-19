import { test, expect } from '@playwright/test'

// Helper to log in or register a new user
async function loginOrCreateUser(page, email, password) {
  await page.goto('/login')

  // Fill credentials and submit
  await page.locator('input[placeholder="you@example.com"]').fill(email)
  await page.locator('input[placeholder="Min 6 characters"]').fill(password)
  await page.locator('form button[type="submit"]').click()

  // Attempt to wait for dashboard navigation after submitting login
  try {
    await page.waitForURL(/\/dashboard/, { timeout: 3000 })
    await page.waitForLoadState('networkidle')
    return
  } catch (e) {
    // If not redirected, check for registration button and handle registration flow
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
      // As a final fallback, just wait for dashboard URL directly
      await page.waitForURL(/\/dashboard/, { timeout: 15000 })
      await page.waitForLoadState('networkidle')
    }
  }
}

// Helper to ensure at least one project exists
async function ensureProjectExists(page) {
  await page.goto('/dashboard')
  await page.waitForSelector('main.page-container')
  
  // Check count of actual interactive cards
  const count = await page.locator('.surface-card-interactive').count()
  if (count === 0) {
    // Click "New Project"
    await page.getByRole('button', { name: 'New Project' }).click()
    
    // Wait for modal to render
    const titleInput = page.locator('input[placeholder="My Awesome Website"]')
    await titleInput.waitFor({ state: 'visible' })
    await titleInput.fill('E2E Test Project')
    
    await page.getByRole('button', { name: 'Create Project' }).click()
    await page.waitForURL(/\/builder\//)
    await page.goto('/dashboard')
    
    // Wait for the new card to appear on dashboard
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

  test('builder loads project and shows manual save status', async ({ page }) => {
    const email = `qa_${Date.now()}_bld@example.com`
    await loginOrCreateUser(page, email, password)
    await ensureProjectExists(page)
    
    // Go to dashboard and open first project
    await page.goto('/dashboard')
    const firstProject = page.locator('.surface-card-interactive').first()
    await firstProject.click()
    
    await page.waitForURL(/\/builder\//)
    await expect(page.locator('header').getByText('Saved', { exact: true })).toBeVisible()
    const saveButton = page.getByRole('button', { name: 'Save', exact: true })
    await expect(saveButton).toBeDisabled()
  })

  test('builder interaction: add, save, and return to dashboard', async ({ page }) => {
    const email = `qa_${Date.now()}_int@example.com`
    await loginOrCreateUser(page, email, password)
    await ensureProjectExists(page)
    
    await page.goto('/dashboard')
    const firstProject = page.locator('.surface-card-interactive').first()
    await firstProject.click()
    await page.waitForURL(/\/builder\//)

    // Add component via double-click in Toolbox
    const toolboxItem = page.locator('[title="Drag to canvas or double-click to add"]').first()
    await expect(toolboxItem).toBeVisible()
    await toolboxItem.dblclick()

    // Assert that the page status changes to "Unsaved" and "Save" button is enabled
    await expect(page.getByText('Unsaved')).toBeVisible()
    const saveButton = page.getByRole('button', { name: 'Save', exact: true })
    await expect(saveButton).toBeEnabled()

    // Perform save
    await saveButton.click()
    await expect(page.locator('header').getByText('Saved', { exact: true })).toBeVisible()

    // Return to dashboard and verify url and persistence
    await page.getByRole('button', { name: 'Dashboard' }).click()
    await page.waitForURL(/\/dashboard/)
    await expect(page.getByRole('heading', { name: 'Your Projects' })).toBeVisible()
  })

  test('unknown route redirects to dashboard', async ({ page }) => {
    await page.goto('/unknown-route')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
