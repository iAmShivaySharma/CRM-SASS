export const API_URL = process.env.E2E_API_URL || 'http://localhost:8000'
export const APP_URL = process.env.E2E_BASE_URL || 'http://localhost:3000'

export const TEST_USER = {
  email: process.env.E2E_EMAIL || 'e2e.runner@clearcrm.test',
  password: process.env.E2E_PASSWORD || 'E2eRunner!2026',
  fullName: 'E2E Runner',
  workspaceName: 'E2E Workspace',
}

export const AUTH_CONTAINER = process.env.E2E_AUTH_CONTAINER || 'crm-platform-auth-service-1'

export const stamp = () => Date.now().toString(36)
