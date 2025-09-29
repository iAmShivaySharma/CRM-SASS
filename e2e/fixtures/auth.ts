import { test as base, expect } from '@playwright/test'

// Extend basic test with authentication helpers
export const test = base.extend<{
  authenticatedPage: any
  adminPage: any
}>({
  // Authenticated page fixture
  authenticatedPage: async ({ page }, use) => {
    // Login as regular user
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'admin@crm.com')
    await page.fill('[data-testid="password-input"]', 'Admin123!@#')
    await page.click('[data-testid="login-button"]')

    // Wait for successful login
    await page.waitForURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()

    await use(page)
  },

  // Admin page fixture
  adminPage: async ({ page }, use) => {
    // Login as admin user
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'admin@crm.com')
    await page.fill('[data-testid="password-input"]', 'Admin123!@#')
    await page.click('[data-testid="login-button"]')

    // Wait for successful login
    await page.waitForURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()

    await use(page)
  },
})

export { expect } from '@playwright/test'

// Authentication helper functions
export class AuthHelpers {
  constructor(private page: any) {}

  async login(
    email: string = 'admin@crm.com',
    password: string = 'Admin123!@#'
  ) {
    await this.page.goto('/login')
    await this.page.fill('[data-testid="email-input"]', email)
    await this.page.fill('[data-testid="password-input"]', password)
    await this.page.click('[data-testid="login-button"]')
    await this.page.waitForURL('/dashboard')
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]')
    await this.page.click('[data-testid="logout-button"]')
    await this.page.waitForURL('/login')
  }

  async isLoggedIn(): Promise<boolean> {
    try {
      await this.page.waitForSelector('[data-testid="user-menu"]', {
        timeout: 5000,
      })
      return true
    } catch {
      return false
    }
  }

  async ensureLoggedIn(email?: string, password?: string) {
    if (!(await this.isLoggedIn())) {
      await this.login(email, password)
    }
  }
}

// Storage state helpers for session persistence
export async function saveAuthState(page: any, filePath: string) {
  await page.context().storageState({ path: filePath })
}

export async function loadAuthState(context: any, filePath: string) {
  await context.addInitScript(() => {
    // Restore any additional client-side state if needed
  })
}
