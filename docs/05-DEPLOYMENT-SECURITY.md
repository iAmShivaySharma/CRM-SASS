# CRM-X-SHIVAY Documentation

## Volume 5: Deployment & Security

---

### 📖 Navigation

- [← Volume 4: Development Guide](./04-DEVELOPMENT-GUIDE.md)
- [→ Volume 6: Testing & Troubleshooting](./06-TESTING-TROUBLESHOOTING.md)

---

## 🚀 Deployment Guide

### Production Checklist

Before deploying to production, ensure the following:

- [ ] **Environment Variables**: All production environment variables are set
- [ ] **Database**: Production MongoDB instance is configured and accessible
- [ ] **Security**: JWT secrets are strong and unique
- [ ] **SSL/HTTPS**: SSL certificates are configured
- [ ] **Domain**: Custom domain is configured
- [ ] **Monitoring**: Logging and monitoring are set up
- [ ] **Backup**: Database backup strategy is in place
- [ ] **Performance**: Application has been performance tested
- [ ] **Security**: Security audit has been completed

### Environment Configuration

#### Production Environment Variables

```env
# Application
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm_production

# JWT Configuration
JWT_SECRET=your-super-secure-production-jwt-secret-min-32-chars
JWT_EXPIRES_IN=7d

# Security
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=https://your-domain.com

# CORS
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Dodo Payments (Optional)
DODO_API_KEY=your_production_dodo_api_key
NEXT_PUBLIC_DODO_PUBLIC_KEY=your_production_dodo_public_key
DODO_WEBHOOK_SECRET=your_production_dodo_webhook_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
ANALYTICS_ID=your_analytics_id
```

---

## ☁️ Deployment Platforms

### 1. Vercel (Recommended)

Vercel provides zero-config deployment with excellent Next.js integration.

#### Setup Steps

1. **Connect Repository**

   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Login and deploy
   vercel login
   vercel --prod
   ```

2. **Environment Variables**
   - Go to Vercel Dashboard → Project → Settings → Environment Variables
   - Add all production environment variables
   - Ensure `NODE_ENV=production`

3. **Custom Domain**
   - Add your domain in Vercel Dashboard
   - Configure DNS records as instructed
   - SSL is automatically handled

4. **MongoDB Atlas Integration**
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/crm_production?retryWrites=true&w=majority
   ```

#### Vercel Configuration (vercel.json)

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### 2. Netlify

Alternative platform with great CI/CD integration.

#### Setup Steps

1. **Deploy from Git**
   - Connect GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `.next`

2. **Environment Variables**
   - Go to Site Settings → Environment Variables
   - Add all production variables

3. **Functions Configuration**

   ```toml
   # netlify.toml
   [build]
     command = "npm run build"
     publish = ".next"

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   ```

### 3. Railway

Full-stack deployment platform.

#### Setup Steps

1. **Deploy from GitHub**

   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login and deploy
   railway login
   railway link
   railway up
   ```

2. **Environment Variables**
   - Set via Railway Dashboard or CLI
   ```bash
   railway variables set NODE_ENV=production
   railway variables set MONGODB_URI=your_mongodb_uri
   ```

### 4. Docker Deployment

For containerized deployment on any platform.

#### Dockerfile

```dockerfile
# Use official Node.js runtime
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/crm_production
      - JWT_SECRET=your-jwt-secret
    depends_on:
      - mongo

  mongo:
    image: mongo:5.0
    restart: always
    volumes:
      - mongo_data:/data/db
    environment:
      - MONGO_INITDB_DATABASE=crm_production

volumes:
  mongo_data:
```

---

## 🔒 Security Implementation

### Authentication Security

#### JWT Configuration

```typescript
// lib/auth.ts
import { SignJWT, jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function signToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    return null
  }
}
```

#### Password Security

```typescript
import bcrypt from 'bcryptjs'

// Hash password with 12 rounds (recommended for production)
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12)
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}
```

### Middleware Security

#### Security Headers

```typescript
// middleware.ts
import { NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')

  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
    ].join('; ')
  )

  return response
}
```

#### Rate Limiting

```typescript
// lib/security/rate-limiter.ts
const rateLimitMap = new Map()

export function rateLimit(identifier: string, limit: number, windowMs: number) {
  const now = Date.now()
  const windowStart = now - windowMs

  const requests = rateLimitMap.get(identifier) || []
  const validRequests = requests.filter((time: number) => time > windowStart)

  if (validRequests.length >= limit) {
    return false
  }

  validRequests.push(now)
  rateLimitMap.set(identifier, validRequests)
  return true
}
```

### Input Validation & Sanitization

#### Comprehensive Validation

```typescript
// lib/security/validation.ts
import { z } from 'zod'
import validator from 'validator'

export const leadValidationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .refine(
      val => validator.isLength(val.trim(), { min: 1 }),
      'Name cannot be empty'
    ),

  email: z
    .string()
    .email('Invalid email format')
    .refine(val => validator.isEmail(val), 'Invalid email')
    .optional(),

  phone: z
    .string()
    .refine(val => !val || validator.isMobilePhone(val), 'Invalid phone number')
    .optional(),

  website: z
    .string()
    .refine(val => !val || validator.isURL(val), 'Invalid URL')
    .optional(),
})

// Sanitize HTML input
export function sanitizeHtml(input: string): string {
  return validator.escape(input)
}
```

### Database Security

#### Connection Security

```typescript
// lib/mongodb/connection.ts
import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI!

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0,
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production',
  sslValidate: process.env.NODE_ENV === 'production',
}
```

#### Query Security

```typescript
// Prevent NoSQL injection
export function sanitizeQuery(query: any): any {
  if (typeof query !== 'object' || query === null) {
    return {}
  }

  const sanitized: any = {}
  for (const [key, value] of Object.entries(query)) {
    // Remove any operators that could be dangerous
    if (typeof key === 'string' && !key.startsWith('$')) {
      if (typeof value === 'string') {
        sanitized[key] = validator.escape(value)
      } else if (typeof value === 'object' && value !== null) {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeQuery(value)
      } else {
        sanitized[key] = value
      }
    }
  }
  return sanitized
}
```

### API Security

#### Request Validation

```typescript
// lib/security/request-validation.ts
import { headers } from 'next/headers'
import { NextRequest } from 'next/server'

export function validateRequest(request: NextRequest) {
  const headersList = headers()

  // Check Content-Type for POST/PUT requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = headersList.get('content-type')
    if (!contentType?.includes('application/json')) {
      throw new Error('Invalid content type')
    }
  }

  // Validate User-Agent
  const userAgent = headersList.get('user-agent')
  if (!userAgent || userAgent.length > 500) {
    throw new Error('Invalid user agent')
  }

  // Check for common attack patterns
  const url = request.url
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:text\/html/i,
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      throw new Error('Suspicious request pattern detected')
    }
  }
}
```

#### Webhook Security

```typescript
// lib/webhooks/security.ts
import crypto from 'crypto'

export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

export function isValidWebhookSource(request: NextRequest): boolean {
  const userAgent = request.headers.get('user-agent') || ''
  const forwardedFor = request.headers.get('x-forwarded-for')

  // Add source validation logic based on webhook provider
  const validSources = ['facebookexternalua', 'Google-Webhooks', 'Zapier']

  return validSources.some(source =>
    userAgent.toLowerCase().includes(source.toLowerCase())
  )
}
```

---

## 🔍 Monitoring & Logging

### Application Logging

#### Winston Configuration

```typescript
// lib/logging/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'crm-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    })
  )
}

export { logger }
```

#### Security Event Logging

```typescript
// lib/logging/security.ts
import { logger } from './logger'

export function logSecurityEvent(
  event: string,
  userId?: string,
  details?: any,
  request?: Request
) {
  logger.warn('Security Event', {
    event,
    userId,
    details,
    ip: request?.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request?.headers.get('user-agent') || 'unknown',
    timestamp: new Date().toISOString(),
  })
}

// Usage examples
logSecurityEvent(
  'failed_login_attempt',
  undefined,
  { email: 'user@example.com' },
  request
)
logSecurityEvent(
  'rate_limit_exceeded',
  userId,
  { endpoint: '/api/leads' },
  request
)
logSecurityEvent(
  'suspicious_activity',
  userId,
  { action: 'bulk_delete' },
  request
)
```

### Performance Monitoring

#### Response Time Tracking

```typescript
// lib/middleware/performance.ts
export function withPerformanceTracking(handler: Function) {
  return async function (request: NextRequest, ...args: any[]) {
    const startTime = Date.now()

    try {
      const response = await handler(request, ...args)
      const duration = Date.now() - startTime

      logger.info('Request completed', {
        method: request.method,
        url: request.url,
        duration,
        status: response.status,
      })

      return response
    } catch (error) {
      const duration = Date.now() - startTime
      logger.error('Request failed', {
        method: request.method,
        url: request.url,
        duration,
        error: error.message,
      })
      throw error
    }
  }
}
```

### Health Check Endpoint

```typescript
// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function GET() {
  try {
    // Check database connection
    await connectToMongoDB()

    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        api: 'healthy',
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV,
    }

    return NextResponse.json(health)
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    )
  }
}
```

---

## 🛡️ Security Best Practices

### 1. Environment Security

- Use strong, unique JWT secrets (minimum 32 characters)
- Never commit secrets to version control
- Use environment-specific configurations
- Regularly rotate API keys and secrets

### 2. Database Security

- Use MongoDB Atlas with encryption at rest
- Enable authentication and authorization
- Use connection string with SSL
- Regular backups and disaster recovery

### 3. API Security

- Implement rate limiting on all endpoints
- Validate and sanitize all inputs
- Use HTTPS in production
- Implement proper CORS policies

### 4. Application Security

- Regular dependency updates
- Security headers implementation
- Input validation and output encoding
- Secure session management

### 5. Infrastructure Security

- Use HTTPS/SSL certificates
- Implement Web Application Firewall (WAF)
- Regular security audits
- Monitor for security vulnerabilities

---

## 📈 Scaling Considerations

### Horizontal Scaling

- Load balancer configuration
- Stateless application design
- Database connection pooling
- CDN implementation

### Database Scaling

- Read replicas for MongoDB
- Database indexing optimization
- Connection pooling
- Caching strategies

### Performance Optimization

- Image optimization
- Bundle size optimization
- Lazy loading implementation
- API response optimization

---

**Next**: [Volume 6: Testing & Troubleshooting](./06-TESTING-TROUBLESHOOTING.md)

**Last Updated**: 2025-09-23
**Version**: 2.0.0
