import { POST as loginHandler } from '../../app/api/auth/login/route'
import { POST as signupHandler } from '../../app/api/auth/signup/route'
import { POST as verifyHandler } from '../..//app/api/auth/verify/route'
import { POST as logoutHandler } from '../..//app/api/auth/logout/route'
import {
  testApiRoute,
  validateApiResponse,
  apiResponseStructures,
  expectAsyncError,
} from '../helpers/apiHelpers'
import {
  generateTestJWT,
  generateExpiredJWT,
  generateInvalidJWT,
  createAuthHeaders,
  hashTestPassword,
  verifyJWTStructure,
} from '../helpers/authHelpers'

// Mock dependencies
jest.mock('@/lib/mongodb/connection')
jest.mock('@/lib/mongodb/auth')
jest.mock('@/lib/mongodb/models')

describe('Authentication API Endpoints', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('POST /api/auth/signup', () => {
    const validSignupData = {
      email: 'newuser@example.com',
      password: 'Password123!',
      fullName: 'New User',
      timezone: 'America/New_York',
    }

    it('should create new user with valid data', async () => {
      // Mock User.findOne to return null (user doesn't exist)
      const mockUserFindOne = jest.fn().mockResolvedValue(null)
      const mockUserCreate = jest.fn().mockResolvedValue({
        _id: 'new-user-id',
        email: validSignupData.email,
        fullName: validSignupData.fullName,
        toJSON: () => ({
          _id: 'new-user-id',
          email: validSignupData.email,
          fullName: validSignupData.fullName,
        }),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        User: {
          findOne: mockUserFindOne,
          create: mockUserCreate,
        },
      }))

      const result = await testApiRoute(signupHandler, {
        method: 'POST',
        body: validSignupData,
      })

      expect(result.status).toBe(201)
      expect(result.data.success).toBe(true)
      expect(result.data.user).toBeDefined()
      expect(result.data.user.email).toBe(validSignupData.email)
      expect(result.data.token).toBeDefined()
      expect(verifyJWTStructure(result.data.token)).toBe(true)
    })

    it('should reject duplicate email', async () => {
      const mockUserFindOne = jest.fn().mockResolvedValue({
        email: validSignupData.email,
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        User: {
          findOne: mockUserFindOne,
        },
      }))

      const result = await testApiRoute(signupHandler, {
        method: 'POST',
        body: validSignupData,
      })

      expect(result.status).toBe(409)
      expect(result.data.success).toBe(false)
      expect(result.data.message).toContain('already exists')
    })

    it('should validate required fields', async () => {
      const invalidData = { email: 'test@example.com' } // Missing required fields

      const result = await testApiRoute(signupHandler, {
        method: 'POST',
        body: invalidData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
      expect(result.data.errors).toBeDefined()
    })

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validSignupData,
        email: 'invalid-email-format',
      }

      const result = await testApiRoute(signupHandler, {
        method: 'POST',
        body: invalidEmailData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
      expect(result.data.errors).toBeDefined()
    })

    it('should validate password strength', async () => {
      const weakPasswordData = {
        ...validSignupData,
        password: '123', // Too weak
      }

      const result = await testApiRoute(signupHandler, {
        method: 'POST',
        body: weakPasswordData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
    })
  })

  describe('POST /api/auth/login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'Password123!',
    }

    it('should authenticate user with correct credentials', async () => {
      const mockUser = {
        _id: 'user-id',
        email: validLoginData.email,
        password: await hashTestPassword(validLoginData.password),
        fullName: 'Test User',
        toJSON: () => ({
          _id: 'user-id',
          email: validLoginData.email,
          fullName: 'Test User',
        }),
      }

      const mockUserFindOne = jest.fn().mockResolvedValue(mockUser)
      const mockBcryptCompare = jest.fn().mockResolvedValue(true)

      jest.doMock('@/lib/mongodb/models', () => ({
        User: { findOne: mockUserFindOne },
      }))
      jest.doMock('bcryptjs', () => ({
        compare: mockBcryptCompare,
      }))

      const result = await testApiRoute(loginHandler, {
        method: 'POST',
        body: validLoginData,
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.token).toBeDefined()
      expect(result.data.user).toBeDefined()
      expect(verifyJWTStructure(result.data.token)).toBe(true)
    })

    it('should reject invalid email', async () => {
      const mockUserFindOne = jest.fn().mockResolvedValue(null)

      jest.doMock('@/lib/mongodb/models', () => ({
        User: { findOne: mockUserFindOne },
      }))

      const result = await testApiRoute(loginHandler, {
        method: 'POST',
        body: validLoginData,
      })

      expect(result.status).toBe(401)
      expect(result.data.success).toBe(false)
      expect(result.data.message).toContain('Invalid credentials')
    })

    it('should reject invalid password', async () => {
      const mockUser = {
        _id: 'user-id',
        email: validLoginData.email,
        password: await hashTestPassword('different-password'),
      }

      const mockUserFindOne = jest.fn().mockResolvedValue(mockUser)
      const mockBcryptCompare = jest.fn().mockResolvedValue(false)

      jest.doMock('@/lib/mongodb/models', () => ({
        User: { findOne: mockUserFindOne },
      }))
      jest.doMock('bcryptjs', () => ({
        compare: mockBcryptCompare,
      }))

      const result = await testApiRoute(loginHandler, {
        method: 'POST',
        body: validLoginData,
      })

      expect(result.status).toBe(401)
      expect(result.data.success).toBe(false)
    })

    it('should validate request body', async () => {
      const result = await testApiRoute(loginHandler, {
        method: 'POST',
        body: { email: 'test@example.com' }, // Missing password
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
    })
  })

  describe('POST /api/auth/verify', () => {
    it('should verify valid JWT token', async () => {
      const validToken = generateTestJWT()

      const result = await testApiRoute(verifyHandler, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.user).toBeDefined()
    })

    it('should reject expired token', async () => {
      const expiredToken = generateExpiredJWT()

      const result = await testApiRoute(verifyHandler, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${expiredToken}`,
        },
      })

      expect(result.status).toBe(401)
      expect(result.data.success).toBe(false)
    })

    it('should reject invalid token', async () => {
      const invalidToken = generateInvalidJWT()

      const result = await testApiRoute(verifyHandler, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${invalidToken}`,
        },
      })

      expect(result.status).toBe(401)
      expect(result.data.success).toBe(false)
    })

    it('should require authorization header', async () => {
      const result = await testApiRoute(verifyHandler, {
        method: 'POST',
      })

      expect(result.status).toBe(401)
      expect(result.data.success).toBe(false)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const validToken = generateTestJWT()

      const result = await testApiRoute(logoutHandler, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${validToken}`,
        },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.message).toContain('Logged out')
    })

    it('should handle logout without token', async () => {
      const result = await testApiRoute(logoutHandler, {
        method: 'POST',
      })

      // Should still return success even without token
      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
    })
  })

  describe('Response Structure Validation', () => {
    it('should return properly structured success responses', async () => {
      const validToken = generateTestJWT()

      const result = await testApiRoute(verifyHandler, {
        method: 'POST',
        headers: { Authorization: `Bearer ${validToken}` },
      })

      const validation = validateApiResponse(result.data, {
        success: 'boolean',
        user: 'object',
      })

      expect(validation.isValid).toBe(true)
    })

    it('should return properly structured error responses', async () => {
      const result = await testApiRoute(verifyHandler, {
        method: 'POST',
      })

      const validation = validateApiResponse(
        result.data,
        apiResponseStructures.error
      )
      expect(validation.isValid).toBe(true)
    })
  })
})
