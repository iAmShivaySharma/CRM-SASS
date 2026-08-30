const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'CORS_ORIGINS'] as const

const optionalEnvVars = [
  'REDIS_URL',
  'RESEND_API_KEY',
  'N8N_BASE_URL',
  'N8N_API_KEY',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MINIO_ENDPOINT',
  'MINIO_ACCESS_KEY',
  'MINIO_SECRET_KEY',
] as const

export function validateEnv() {
  const missing = requiredEnvVars.filter(key => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  if (
    process.env.JWT_SECRET ===
      'your-super-secret-jwt-key-change-this-in-production' &&
    process.env.NODE_ENV === 'production'
  ) {
    throw new Error(
      'JWT_SECRET must be changed from default value in production'
    )
  }
}
