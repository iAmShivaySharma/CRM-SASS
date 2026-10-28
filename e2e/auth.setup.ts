import { test as setup, expect } from '@playwright/test'
import { ensureTestUser, resetDailyState } from './helpers/bootstrap'
import { TEST_USER } from './helpers/env'

const authFile = 'e2e/.auth/user.json'

setup('bootstrap user and log in', async ({ page }) => {
  await ensureTestUser()
  resetDailyState(TEST_USER.email)

  await page.goto('/login')
  await page.evaluate(() => localStorage.setItem('crm_tour_done', 'true'))
  await page.locator('#email').fill(TEST_USER.email)
  await page.locator('#password').fill(TEST_USER.password)
  await page.locator('form button[type="submit"]').first().click()

  await page.waitForURL(/\/dashboard/, { timeout: 30000 })
  await expect(page.getByRole('link', { name: /dashboard/i }).first()).toBeVisible({ timeout: 30000 })
  await page.evaluate(() => localStorage.setItem('crm_tour_done', 'true'))

  await page.context().storageState({ path: authFile })
})
