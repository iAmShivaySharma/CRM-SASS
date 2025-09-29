import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up E2E test environment...')

  // Launch browser for setup tasks
  const browser = await chromium.launch()
  const page = await browser.newPage()

  try {
    // Wait for the application to be ready
    await page.goto('http://localhost:3000')
    await page.waitForLoadState('networkidle')

    // Verify the application is running
    const title = await page.title()
    console.log(`✅ Application is running: ${title}`)

    // Set up test database state if needed
    await setupTestData(page)
  } catch (error) {
    console.error('❌ Global setup failed:', error)
    throw error
  } finally {
    await browser.close()
  }

  console.log('✅ E2E test environment ready')
}

async function setupTestData(page: any) {
  // Create admin user and test data via API or direct database access
  // This ensures consistent test state

  try {
    // Check if test user already exists
    const response = await page.request.post(
      'http://localhost:3000/api/auth/login',
      {
        data: {
          email: 'admin@crm.com',
          password: 'Admin123!@#',
        },
      }
    )

    if (response.ok()) {
      console.log('✅ Test admin user is available')
    } else {
      console.log('ℹ️ Creating test data...')
      // Seed the database if needed
      // This would typically call the seeding script
    }
  } catch (error) {
    console.log('ℹ️ Test data setup skipped:', error.message)
  }
}

export default globalSetup
