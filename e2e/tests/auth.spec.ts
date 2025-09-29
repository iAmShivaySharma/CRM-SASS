import { test, expect } from '../fixtures/auth'
import { AuthHelpers } from '../fixtures/auth'

test.describe('Authentication Flow', () => {
  test('should allow user to login and logout', async ({ page }) => {
    const auth = new AuthHelpers(page)

    // Start at login page
    await page.goto('/login')

    // Verify login page elements
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible()
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible()

    // Login with valid credentials
    await auth.login()

    // Verify successful login
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()

    // Logout
    await auth.logout()

    // Verify successful logout
    await expect(page).toHaveURL('/login')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login')

    // Try to login with invalid credentials
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    await page.click('[data-testid="login-button"]')

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Invalid credentials'
    )

    // Should still be on login page
    await expect(page).toHaveURL('/login')
  })

  test('should validate required fields', async ({ page }) => {
    await page.goto('/login')

    // Try to submit empty form
    await page.click('[data-testid="login-button"]')

    // Check for validation errors
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })

  test('should validate email format', async ({ page }) => {
    await page.goto('/login')

    // Enter invalid email format
    await page.fill('[data-testid="email-input"]', 'invalid-email')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Check for email validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText(
      'Invalid email'
    )
  })

  test('should redirect to dashboard when already logged in', async ({
    authenticatedPage,
  }) => {
    // Try to access login page when already authenticated
    await authenticatedPage.goto('/login')

    // Should redirect to dashboard
    await expect(authenticatedPage).toHaveURL('/dashboard')
  })

  test('should handle session expiry', async ({ page }) => {
    const auth = new AuthHelpers(page)
    await auth.login()

    // Simulate session expiry by clearing storage
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())

    // Try to access protected page
    await page.goto('/leads')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should remember login state across page reloads', async ({ page }) => {
    const auth = new AuthHelpers(page)
    await auth.login()

    // Reload the page
    await page.reload()

    // Should still be logged in
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should protect dashboard routes', async ({ page }) => {
    // Try to access protected route without authentication
    await page.goto('/dashboard')

    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })

  test('should protect API routes', async ({ page }) => {
    // Try to access protected API endpoint
    const response = await page.request.get('/api/leads?workspaceId=test')

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401)
  })

  test.describe('Registration Flow', () => {
    test('should allow new user registration', async ({ page }) => {
      await page.goto('/register')

      // Fill registration form
      await page.fill('[data-testid="email-input"]', 'newuser@example.com')
      await page.fill('[data-testid="password-input"]', 'NewPassword123!')
      await page.fill(
        '[data-testid="confirm-password-input"]',
        'NewPassword123!'
      )
      await page.fill('[data-testid="fullname-input"]', 'New User')
      await page.click('[data-testid="register-button"]')

      // Should redirect to dashboard after successful registration
      await expect(page).toHaveURL('/dashboard')
      await expect(
        page.locator('[data-testid="welcome-message"]')
      ).toBeVisible()
    })

    test('should validate password strength', async ({ page }) => {
      await page.goto('/register')

      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', '123') // Weak password
      await page.click('[data-testid="register-button"]')

      // Should show password strength error
      await expect(
        page.locator('[data-testid="password-error"]')
      ).toContainText('Password too weak')
    })

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/register')

      await page.fill('[data-testid="email-input"]', 'test@example.com')
      await page.fill('[data-testid="password-input"]', 'Password123!')
      await page.fill(
        '[data-testid="confirm-password-input"]',
        'DifferentPassword123!'
      )
      await page.click('[data-testid="register-button"]')

      // Should show password mismatch error
      await expect(
        page.locator('[data-testid="confirm-password-error"]')
      ).toContainText('Passwords do not match')
    })

    test('should prevent duplicate email registration', async ({ page }) => {
      await page.goto('/register')

      // Try to register with existing email
      await page.fill('[data-testid="email-input"]', 'admin@crm.com') // Existing user
      await page.fill('[data-testid="password-input"]', 'Password123!')
      await page.fill('[data-testid="confirm-password-input"]', 'Password123!')
      await page.fill('[data-testid="fullname-input"]', 'Test User')
      await page.click('[data-testid="register-button"]')

      // Should show error for existing email
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Email already exists'
      )
    })
  })

  test.describe('Password Reset Flow', () => {
    test('should allow password reset request', async ({ page }) => {
      await page.goto('/login')
      await page.click('[data-testid="forgot-password-link"]')

      await expect(page).toHaveURL('/auth/forgot-password')

      await page.fill('[data-testid="email-input"]', 'admin@crm.com')
      await page.click('[data-testid="reset-button"]')

      // Should show success message
      await expect(
        page.locator('[data-testid="success-message"]')
      ).toContainText('Password reset email sent')
    })

    test('should validate email for password reset', async ({ page }) => {
      await page.goto('/auth/forgot-password')

      await page.fill('[data-testid="email-input"]', 'nonexistent@example.com')
      await page.click('[data-testid="reset-button"]')

      // Should show error for non-existent email
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Email not found'
      )
    })
  })
})
