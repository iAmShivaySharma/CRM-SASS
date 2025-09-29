# CRM-X-SHIVAY Documentation

## Volume 6: Testing & Troubleshooting

---

### 📖 Navigation

- [← Volume 5: Deployment & Security](./05-DEPLOYMENT-SECURITY.md)
- [→ Volume 1: Introduction](./01-INTRODUCTION.md) (Back to start)

---

## 🧪 Testing Guide

### Testing Strategy Overview

CRM-X-SHIVAY uses a comprehensive testing approach:

1. **Unit Tests** - Individual functions and components
2. **Integration Tests** - API endpoints and database operations
3. **E2E Tests** - Complete user workflows
4. **Manual Testing** - User acceptance testing
5. **Performance Tests** - Load and stress testing
6. **Security Tests** - Vulnerability assessment

### Test Environment Setup

#### Prerequisites

```bash
# Install testing dependencies
npm install --save-dev \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  jest \
  jest-environment-jsdom \
  supertest \
  mongodb-memory-server \
  cypress
```

#### Jest Configuration

```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/cypress/',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

#### Jest Setup

```javascript
// jest.setup.js
import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: '',
      asPath: '',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'
process.env.MONGODB_URI = 'mongodb://localhost:27017/crm_test'
```

---

## 🔧 Unit Testing

### Component Testing

#### Basic Component Test

```typescript
// components/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../ui/button';

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies correct variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');
  });

  it('is disabled when loading', () => {
    render(<Button disabled>Loading...</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

#### Form Component Test

```typescript
// components/__tests__/LeadForm.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { store } from '@/lib/store';
import { LeadForm } from '../leads/LeadForm';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <Provider store={store}>
      {component}
    </Provider>
  );
};

describe('LeadForm Component', () => {
  it('submits form with valid data', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    renderWithProviders(<LeadForm onSubmit={onSubmit} />);

    // Fill out form
    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/company/i), 'Example Corp');

    // Submit form
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Example Corp',
      });
    });
  });

  it('shows validation errors for invalid data', async () => {
    const user = userEvent.setup();
    renderWithProviders(<LeadForm />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => {
      expect(screen.getByText(/name is required/i)).toBeInTheDocument();
    });
  });
});
```

### Utility Function Testing

#### Validation Function Test

```typescript
// lib/__tests__/validation.test.ts
import { validateEmail, sanitizeInput, generateSlug } from '../utils'

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('validates correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true)
      expect(validateEmail('user.name+tag@domain.co.uk')).toBe(true)
    })

    it('rejects invalid email addresses', () => {
      expect(validateEmail('invalid-email')).toBe(false)
      expect(validateEmail('test@')).toBe(false)
      expect(validateEmail('@example.com')).toBe(false)
    })
  })

  describe('sanitizeInput', () => {
    it('removes dangerous HTML', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      )
    })

    it('preserves safe content', () => {
      expect(sanitizeInput('Hello World')).toBe('Hello World')
    })
  })

  describe('generateSlug', () => {
    it('creates URL-friendly slugs', () => {
      expect(generateSlug('My Company Name')).toBe('my-company-name')
      expect(generateSlug('Special@#$ Characters')).toBe('special-characters')
    })
  })
})
```

---

## 🔗 Integration Testing

### API Endpoint Testing

#### Authentication API Test

```typescript
// __tests__/api/auth.test.ts
import { createMocks } from 'node-mocks-http'
import { POST as loginHandler } from '@/app/api/auth/login/route'
import { POST as signupHandler } from '@/app/api/auth/signup/route'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { User } from '@/lib/mongodb/models'

// Mock database connection
jest.mock('@/lib/mongodb/connection')

describe('/api/auth', () => {
  beforeEach(async () => {
    // Clear test database
    await User.deleteMany({})
  })

  describe('POST /api/auth/signup', () => {
    it('creates new user with valid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'Test User',
        },
      })

      const response = await signupHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.user.email).toBe('test@example.com')
    })

    it('rejects duplicate email', async () => {
      // Create existing user
      await User.create({
        email: 'test@example.com',
        password: 'hashedpassword',
        fullName: 'Existing User',
      })

      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'Password123!',
          fullName: 'New User',
        },
      })

      const response = await signupHandler(req as any)
      expect(response.status).toBe(409)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await User.create({
        email: 'test@example.com',
        password: await hashPassword('Password123!'),
        fullName: 'Test User',
      })
    })

    it('authenticates user with correct credentials', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'Password123!',
        },
      })

      const response = await loginHandler(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.token).toBeDefined()
    })

    it('rejects invalid credentials', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          email: 'test@example.com',
          password: 'WrongPassword',
        },
      })

      const response = await loginHandler(req as any)
      expect(response.status).toBe(401)
    })
  })
})
```

#### Lead API Test

```typescript
// __tests__/api/leads.test.ts
import { createMocks } from 'node-mocks-http'
import { GET as getLeads, POST as createLead } from '@/app/api/leads/route'
import { generateValidToken } from '../helpers/auth'

describe('/api/leads', () => {
  let validToken: string

  beforeEach(async () => {
    validToken = await generateValidToken()
  })

  describe('GET /api/leads', () => {
    it('returns leads for authenticated user', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: { authorization: `Bearer ${validToken}` },
        query: { workspaceId: 'valid-workspace-id' },
      })

      const response = await getLeads(req as any)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(Array.isArray(data.leads)).toBe(true)
    })

    it('requires authentication', async () => {
      const { req } = createMocks({
        method: 'GET',
        query: { workspaceId: 'valid-workspace-id' },
      })

      const response = await getLeads(req as any)
      expect(response.status).toBe(401)
    })
  })

  describe('POST /api/leads', () => {
    it('creates lead with valid data', async () => {
      const leadData = {
        workspaceId: 'valid-workspace-id',
        name: 'Test Lead',
        email: 'lead@example.com',
        company: 'Test Company',
      }

      const { req } = createMocks({
        method: 'POST',
        headers: {
          authorization: `Bearer ${validToken}`,
          'content-type': 'application/json',
        },
        body: leadData,
      })

      const response = await createLead(req as any)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.lead.name).toBe('Test Lead')
    })
  })
})
```

### Database Integration Testing

```typescript
// __tests__/integration/database.test.ts
import { MongoMemoryServer } from 'mongodb-memory-server'
import mongoose from 'mongoose'
import { Lead, User, Workspace } from '@/lib/mongodb/models'

describe('Database Integration', () => {
  let mongoServer: MongoMemoryServer

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create()
    const mongoUri = mongoServer.getUri()
    await mongoose.connect(mongoUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
    await mongoServer.stop()
  })

  beforeEach(async () => {
    await Lead.deleteMany({})
    await User.deleteMany({})
    await Workspace.deleteMany({})
  })

  it('creates and retrieves leads correctly', async () => {
    const leadData = {
      workspaceId: new mongoose.Types.ObjectId(),
      name: 'Test Lead',
      email: 'test@example.com',
      source: 'test',
      createdBy: new mongoose.Types.ObjectId(),
    }

    const lead = await Lead.create(leadData)
    expect(lead._id).toBeDefined()
    expect(lead.name).toBe('Test Lead')

    const retrieved = await Lead.findById(lead._id)
    expect(retrieved?.name).toBe('Test Lead')
  })

  it('enforces required fields', async () => {
    await expect(
      Lead.create({
        name: 'Test Lead',
        // Missing required fields
      })
    ).rejects.toThrow()
  })

  it('validates email format', async () => {
    await expect(
      Lead.create({
        workspaceId: new mongoose.Types.ObjectId(),
        name: 'Test Lead',
        email: 'invalid-email',
        source: 'test',
        createdBy: new mongoose.Types.ObjectId(),
      })
    ).rejects.toThrow()
  })
})
```

---

## 🌐 End-to-End Testing

### Cypress Setup

#### Configuration

```javascript
// cypress.config.js
import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
  },
  env: {
    admin_email: 'admin@crm.com',
    admin_password: 'Admin123!@#',
  },
})
```

#### Custom Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
      createLead(leadData: any): Chainable<void>
      deleteLead(leadId: string): Chainable<void>
    }
  }
}

Cypress.Commands.add(
  'login',
  (
    email = Cypress.env('admin_email'),
    password = Cypress.env('admin_password')
  ) => {
    cy.visit('/login')
    cy.get('[data-testid="email-input"]').type(email)
    cy.get('[data-testid="password-input"]').type(password)
    cy.get('[data-testid="login-button"]').click()
    cy.url().should('include', '/dashboard')
  }
)

Cypress.Commands.add('createLead', leadData => {
  cy.get('[data-testid="create-lead-button"]').click()
  cy.get('[data-testid="lead-name-input"]').type(leadData.name)
  cy.get('[data-testid="lead-email-input"]').type(leadData.email)
  if (leadData.company) {
    cy.get('[data-testid="lead-company-input"]').type(leadData.company)
  }
  cy.get('[data-testid="save-lead-button"]').click()
})
```

#### E2E Test Examples

```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  it('allows user to login and logout', () => {
    cy.visit('/login')

    // Login
    cy.get('[data-testid="email-input"]').type(Cypress.env('admin_email'))
    cy.get('[data-testid="password-input"]').type(Cypress.env('admin_password'))
    cy.get('[data-testid="login-button"]').click()

    // Verify dashboard
    cy.url().should('include', '/dashboard')
    cy.get('[data-testid="welcome-message"]').should('be.visible')

    // Logout
    cy.get('[data-testid="user-menu"]').click()
    cy.get('[data-testid="logout-button"]').click()
    cy.url().should('include', '/login')
  })

  it('shows error for invalid credentials', () => {
    cy.visit('/login')
    cy.get('[data-testid="email-input"]').type('invalid@example.com')
    cy.get('[data-testid="password-input"]').type('wrongpassword')
    cy.get('[data-testid="login-button"]').click()

    cy.get('[data-testid="error-message"]').should(
      'contain',
      'Invalid credentials'
    )
  })
})

// cypress/e2e/leads.cy.ts
describe('Lead Management', () => {
  beforeEach(() => {
    cy.login()
    cy.visit('/leads')
  })

  it('creates a new lead', () => {
    const leadData = {
      name: 'Test Lead',
      email: 'test@example.com',
      company: 'Test Company',
    }

    cy.createLead(leadData)

    // Verify lead appears in list
    cy.get('[data-testid="leads-table"]').should('contain', leadData.name)
    cy.get('[data-testid="leads-table"]').should('contain', leadData.email)
  })

  it('edits an existing lead', () => {
    // Create lead first
    cy.createLead({ name: 'Original Name', email: 'original@example.com' })

    // Edit lead
    cy.get('[data-testid="lead-row"]')
      .first()
      .find('[data-testid="edit-button"]')
      .click()
    cy.get('[data-testid="lead-name-input"]').clear().type('Updated Name')
    cy.get('[data-testid="save-lead-button"]').click()

    // Verify update
    cy.get('[data-testid="leads-table"]').should('contain', 'Updated Name')
  })

  it('deletes a lead', () => {
    cy.createLead({ name: 'To Delete', email: 'delete@example.com' })

    cy.get('[data-testid="lead-row"]')
      .first()
      .find('[data-testid="delete-button"]')
      .click()
    cy.get('[data-testid="confirm-delete-button"]').click()

    cy.get('[data-testid="leads-table"]').should('not.contain', 'To Delete')
  })
})
```

---

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

#### 1. Database Connection Issues

**Problem**: "MongoDB connection failed"

```
Error: MongoServerError: Authentication failed
```

**Solutions**:

```bash
# Check MongoDB URI format
MONGODB_URI=mongodb://username:password@host:port/database

# For MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority

# Check network connectivity
ping cluster.mongodb.net

# Verify credentials in MongoDB Atlas dashboard
```

**Problem**: "Connection timeout"

```
Error: Server selection timed out after 30000 ms
```

**Solutions**:

```typescript
// Increase timeout in connection options
const options = {
  serverSelectionTimeoutMS: 10000, // Increase timeout
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
}

// Check firewall and network settings
// Whitelist IP addresses in MongoDB Atlas
```

#### 2. Authentication Issues

**Problem**: "JWT token invalid"

```
Error: JsonWebTokenError: invalid signature
```

**Solutions**:

```bash
# Check JWT_SECRET is set correctly
echo $JWT_SECRET

# Ensure secret is consistent across all instances
# Generate new secret if needed
openssl rand -base64 32
```

**Problem**: "Token expired"

```
Error: TokenExpiredError: jwt expired
```

**Solutions**:

```typescript
// Check token expiration in frontend
const isTokenExpired = (token: string) => {
  try {
    const decoded = JSON.parse(atob(token.split('.')[1]))
    return decoded.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

// Implement token refresh logic
if (isTokenExpired(token)) {
  // Redirect to login or refresh token
}
```

#### 3. Build & Deployment Issues

**Problem**: "Build failed - Type errors"

```
Error: Type 'string | undefined' is not assignable to type 'string'
```

**Solutions**:

```typescript
// Use proper type checking
const value = process.env.SOME_VALUE
if (!value) {
  throw new Error('SOME_VALUE is required')
}

// Or use default values
const value = process.env.SOME_VALUE || 'default'

// Use type assertion carefully
const value = process.env.SOME_VALUE as string
```

**Problem**: "Environment variables not found in production"

```
Error: Cannot read properties of undefined (reading 'MONGODB_URI')
```

**Solutions**:

```bash
# Check environment variables are set in deployment platform
# Vercel: Project Settings → Environment Variables
# Netlify: Site Settings → Environment Variables
# Railway: Variables section

# Add fallback handling
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) {
  throw new Error('MONGODB_URI environment variable is required');
}
```

#### 4. API Response Issues

**Problem**: "CORS errors"

```
Error: Access to fetch at 'API_URL' from origin 'FRONTEND_URL' has been blocked by CORS policy
```

**Solutions**:

```typescript
// Update CORS configuration in middleware.ts
export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin')
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ]

  const response = NextResponse.next()

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    )
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    )
  }

  return response
}
```

**Problem**: "Rate limit exceeded"

```
Error: 429 Too Many Requests
```

**Solutions**:

```typescript
// Check rate limiting configuration
const rateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
}

// Implement exponential backoff in frontend
const retryWithBackoff = async (fn: Function, retries = 3) => {
  try {
    return await fn()
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      await new Promise(resolve =>
        setTimeout(resolve, Math.pow(2, 3 - retries) * 1000)
      )
      return retryWithBackoff(fn, retries - 1)
    }
    throw error
  }
}
```

#### 5. Webhook Issues

**Problem**: "Webhook signature verification failed"

```
Error: Invalid webhook signature
```

**Solutions**:

```typescript
// Verify webhook secret configuration
const webhookSecret = process.env.WEBHOOK_SECRET
if (!webhookSecret) {
  throw new Error('WEBHOOK_SECRET is required')
}

// Check signature calculation
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex')

// Debug signature mismatch
console.log('Received signature:', receivedSignature)
console.log('Expected signature:', expectedSignature)
```

**Problem**: "Webhook not receiving data"

```
No webhook requests received
```

**Solutions**:

```bash
# Check webhook URL is accessible
curl -X POST https://your-domain.com/api/webhooks/receive/webhook-id \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Verify webhook is active in database
# Check firewall settings
# Test with ngrok for local development
npx ngrok http 3000
```

### Performance Issues

#### 1. Slow Database Queries

**Problem**: Long response times

```
Query execution time: 5000ms
```

**Solutions**:

```typescript
// Add proper indexes
// MongoDB shell
db.leads.createIndex({ workspaceId: 1, status: 1 })
db.leads.createIndex({ workspaceId: 1, createdAt: -1 })

// Optimize queries
const leads = await Lead.find({ workspaceId })
  .select('name email company status') // Select only needed fields
  .limit(20) // Limit results
  .sort({ createdAt: -1 }) // Sort efficiently
```

#### 2. Memory Leaks

**Problem**: Increasing memory usage

```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**Solutions**:

```typescript
// Close database connections properly
process.on('SIGINT', async () => {
  await mongoose.connection.close()
  process.exit(0)
})

// Avoid memory leaks in event listeners
useEffect(() => {
  const handler = () => {
    /* handler logic */
  }
  window.addEventListener('resize', handler)

  return () => {
    window.removeEventListener('resize', handler)
  }
}, [])
```

### Debugging Tools

#### 1. Development Debugging

```bash
# Enable debug logging
DEBUG=* npm run dev

# MongoDB query debugging
mongoose.set('debug', true);

# API request debugging
export DEBUG=api:*
```

#### 2. Production Monitoring

```typescript
// Add health check endpoint
// app/api/health/route.ts
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  })
}
```

#### 3. Error Tracking

```typescript
// lib/error-tracking.ts
export function captureError(error: Error, context?: any) {
  console.error('Error captured:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
  })

  // Send to monitoring service (Sentry, LogRocket, etc.)
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context });
  }
}
```

---

## 📊 Testing Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:e2e": "cypress run",
    "test:e2e:open": "cypress open",
    "test:api": "jest --testPathPattern=__tests__/api",
    "test:components": "jest --testPathPattern=components",
    "test:integration": "jest --testPathPattern=integration"
  }
}
```

---

## 🏁 Conclusion

This comprehensive testing and troubleshooting guide provides:

- **Complete testing strategy** for all application layers
- **Practical examples** for unit, integration, and E2E tests
- **Common issues** and their solutions
- **Performance optimization** techniques
- **Debugging tools** and monitoring setup

Regular testing and proactive troubleshooting ensure a robust, reliable CRM system that can scale with your needs.

---

**Navigation**: [← Volume 5: Deployment & Security](./05-DEPLOYMENT-SECURITY.md) | [→ Back to Volume 1](./01-INTRODUCTION.md)

**Last Updated**: 2025-09-23
**Version**: 2.0.0
**Documentation Complete**: ✅
