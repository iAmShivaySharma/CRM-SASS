import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')

  try {
    // Clean up test data if needed
    // This could involve clearing test database entries
    // or resetting application state

    console.log('✅ E2E test environment cleaned up')
  } catch (error) {
    console.error('❌ Global teardown failed:', error)
    // Don't throw here as it might mask test failures
  }
}

export default globalTeardown
