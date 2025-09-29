import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Common validation schemas
export const emailSchema = z.string().email('Invalid email format').max(255)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and number'
  )

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone format')
  .max(20)

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format')

// Auth validation schemas
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
})

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(1, 'Full name is required').max(100),
  workspaceName: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100)
    .optional(),
})

// Lead validation schemas
export const createLeadSchema = z.object({
  workspaceId: objectIdSchema,
  name: z.string().min(1, 'Name is required').max(100),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().max(100).optional(),
  status: z.string().optional(),
  source: z.string().max(50),
  value: z.number().min(0).max(1000000),
  notes: z.string().max(1000).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  customFields: z.record(z.any()).optional(),
})

export const updateLeadSchema = createLeadSchema
  .partial()
  .omit({ workspaceId: true })

// Role validation schemas
export const createRoleSchema = z.object({
  workspaceId: objectIdSchema,
  name: z.string().min(1, 'Name is required').max(50),
  description: z.string().max(200).optional(),
  permissions: z
    .array(z.string().regex(/^[a-z_]+:[a-z_*]+$/, 'Invalid permission format'))
    .min(1),
})

// Webhook validation schemas
export const webhookLeadSchema = z.object({
  name: z.string().min(1).max(100),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  company: z.string().max(100).optional(),
  source: z.string().max(50),
  value: z.number().min(0).max(1000000).optional(),
  custom_fields: z.record(z.any()).optional(),
})

export const createWebhookSchema = z.object({
  workspaceId: objectIdSchema,
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  webhookType: z.enum([
    'facebook_leads',
    'google_forms',
    'zapier',
    'custom',
    'mailchimp',
    'hubspot',
    'salesforce',
    'swipepages',
  ]),
  events: z
    .array(
      z.enum([
        'lead.created',
        'lead.updated',
        'lead.deleted',
        'contact.created',
        'contact.updated',
      ])
    )
    .min(1),
  headers: z.record(z.string()).optional(),
  transformationRules: z.record(z.any()).optional(),
  retryConfig: z
    .object({
      maxRetries: z.number().min(0).max(10).optional(),
      retryDelay: z.number().min(100).max(60000).optional(),
    })
    .optional(),
})

export const updateWebhookSchema = createWebhookSchema
  .partial()
  .omit({ workspaceId: true })

// Sanitization functions
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''

  // Remove HTML tags and scripts
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  })

  // Trim whitespace
  return cleaned.trim()
}

export function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }

  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key names to prevent prototype pollution
      const cleanKey = sanitizeString(key)
      if (
        cleanKey &&
        !['__proto__', 'constructor', 'prototype'].includes(cleanKey)
      ) {
        sanitized[cleanKey] = sanitizeObject(value)
      }
    }
    return sanitized
  }

  return obj
}

// MongoDB injection prevention
export function preventNoSQLInjection(obj: any): any {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === 'object' && !Array.isArray(obj)) {
    const cleaned: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // Remove MongoDB operators
      if (!key.startsWith('$') && key !== '__proto__') {
        cleaned[key] = preventNoSQLInjection(value)
      }
    }
    return cleaned
  }

  if (Array.isArray(obj)) {
    return obj.map(preventNoSQLInjection)
  }

  return obj
}

// Validation middleware factory
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (
    request: Request
  ): Promise<
    { success: true; data: T } | { success: false; error: string }
  > => {
    try {
      const body = await request.json()

      // Sanitize input
      const sanitizedBody = sanitizeObject(body)

      // Prevent NoSQL injection
      const cleanBody = preventNoSQLInjection(sanitizedBody)

      // Validate with Zod
      const result = schema.safeParse(cleanBody)

      if (!result.success) {
        const errors = result.error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`
        )
        return { success: false, error: errors.join(', ') }
      }

      return { success: true, data: result.data }
    } catch (error) {
      return { success: false, error: 'Invalid JSON payload' }
    }
  }
}

// IP validation
export function isValidIP(ip: string): boolean {
  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/

  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

// User agent validation
export function isValidUserAgent(userAgent: string): boolean {
  if (!userAgent || userAgent.length > 500) return false

  // Block suspicious user agents
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
    /python/i,
    /php/i,
  ]

  return !suspiciousPatterns.some(pattern => pattern.test(userAgent))
}

// File upload validation (for future use)
export const fileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  mimetype: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf']),
  size: z.number().max(5 * 1024 * 1024), // 5MB max
})

export function validateFileUpload(file: any): {
  success: boolean
  error?: string
} {
  const result = fileUploadSchema.safeParse(file)

  if (!result.success) {
    return { success: false, error: result.error.errors[0].message }
  }

  // Additional security checks
  const filename = result.data.filename.toLowerCase()
  const dangerousExtensions = [
    '.exe',
    '.bat',
    '.cmd',
    '.scr',
    '.pif',
    '.com',
    '.js',
    '.jar',
  ]

  if (dangerousExtensions.some(ext => filename.endsWith(ext))) {
    return { success: false, error: 'File type not allowed' }
  }

  return { success: true }
}

// Export validation helpers
export const validators = {
  email: (email: string) => emailSchema.safeParse(email).success,
  password: (password: string) => passwordSchema.safeParse(password).success,
  phone: (phone: string) => phoneSchema.safeParse(phone).success,
  objectId: (id: string) => objectIdSchema.safeParse(id).success,
}

// Security logging helper
export function logSecurityEvent(
  event: string,
  details: any,
  severity: 'low' | 'medium' | 'high' = 'medium'
) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    severity,
    details: sanitizeObject(details),
  }

  console.log(`[SECURITY-${severity.toUpperCase()}]`, JSON.stringify(logEntry))

  // In production, send to security monitoring service
  if (process.env.NODE_ENV === 'production' && severity === 'high') {
    // TODO: Send to security monitoring service (e.g., Sentry, DataDog)
  }
}
