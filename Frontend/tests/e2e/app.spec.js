import { test, expect } from '@playwright/test'

test.describe('TemplateCraft E2E', () => {
  test('dashboard loads and shows projects', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('TemplateCraft')).toBeVisible()
    await expect(page.getByText('Projects')).toBeVisible()
  })

  test('navigates to templates page', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: 'Templates' }).click()
    await expect(page.getByText('Template Library')).toBeVisible()
  })

  test('builder shows manual save status', async ({ page }) => {
    await page.goto('/dashboard')
    const projectCard = page.locator('[class*="cursor-pointer"]').first()
    await projectCard.click()
    await expect(page.getByText('Saved')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  test('login page shows coming soon', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Sign in coming soon')).toBeVisible()
  })

  test('unknown route redirects to dashboard', async ({ page }) => {
    await page.goto('/unknown-route')
    await expect(page).toHaveURL(/\/dashboard/)
  })
})
