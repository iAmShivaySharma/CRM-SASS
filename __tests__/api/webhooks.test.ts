import {
  GET as getWebhooks,
  POST as createWebhook,
} from '@/app/api/webhooks/route'
import { POST as receiveWebhook } from '@/app/api/webhooks/receive/[id]/route'
import {
  PUT as updateWebhook,
  DELETE as deleteWebhook,
} from '@/app/api/webhooks/[id]/route'
import {
  testApiRoute,
  validateApiResponse,
  apiResponseStructures,
  generateMockWebhookSignature,
} from '../helpers/apiHelpers'
import {
  generateTestJWT,
  createAuthHeaders,
  createMockWorkspaceMember,
} from '../helpers/authHelpers'
import { generateTestLead } from '../helpers/testUtils'

// Mock dependencies
jest.mock('@/lib/mongodb/connection')
jest.mock('@/lib/mongodb/auth')
jest.mock('@/lib/mongodb/models')
jest.mock('@/lib/webhooks/processors')

describe('Webhooks API Endpoints', () => {
  const mockWorkspaceId = 'test-workspace-id'
  const mockUserId = 'test-user-id'
  const validToken = generateTestJWT()

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authentication
    const mockVerifyAuth = jest.fn().mockResolvedValue({
      user: {
        id: mockUserId,
        email: 'test@example.com',
        fullName: 'Test User',
      },
    })

    jest.doMock('@/lib/mongodb/auth', () => ({
      verifyAuthToken: mockVerifyAuth,
    }))
  })

  describe('GET /api/webhooks', () => {
    it('should return webhooks for authenticated user', async () => {
      const mockWebhooks = [
        {
          _id: 'webhook-1',
          name: 'Test Webhook',
          webhookType: 'facebook',
          isActive: true,
          workspaceId: mockWorkspaceId,
          totalRequests: 10,
          successfulRequests: 8,
          failedRequests: 2,
        },
      ]

      const mockWebhookFind = jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockWebhooks),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: { find: mockWebhookFind },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(getWebhooks, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
        query: { workspaceId: mockWorkspaceId },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.webhooks).toBeDefined()
      expect(Array.isArray(result.data.webhooks)).toBe(true)
    })

    it('should require workspace ID', async () => {
      const result = await testApiRoute(getWebhooks, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
      })

      expect(result.status).toBe(400)
      expect(result.data.message).toContain('Workspace ID is required')
    })

    it('should require authentication', async () => {
      const result = await testApiRoute(getWebhooks, {
        method: 'GET',
        query: { workspaceId: mockWorkspaceId },
      })

      expect(result.status).toBe(401)
    })
  })

  describe('POST /api/webhooks', () => {
    const validWebhookData = {
      workspaceId: mockWorkspaceId,
      name: 'Test Webhook',
      description: 'Testing webhook creation',
      webhookType: 'facebook',
      events: ['lead.created'],
      isActive: true,
      secret: 'test-webhook-secret',
    }

    it('should create webhook with valid data', async () => {
      const mockCreatedWebhook = {
        _id: 'new-webhook-id',
        ...validWebhookData,
        webhookUrl: 'http://localhost:3000/api/webhooks/receive/new-webhook-id',
        createdAt: new Date().toISOString(),
      }

      const mockWebhookCreate = jest.fn().mockResolvedValue(mockCreatedWebhook)

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: { create: mockWebhookCreate },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(createWebhook, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: validWebhookData,
      })

      expect(result.status).toBe(201)
      expect(result.data.success).toBe(true)
      expect(result.data.webhook).toBeDefined()
      expect(result.data.webhook.name).toBe(validWebhookData.name)
      expect(result.data.webhook.webhookUrl).toContain('/api/webhooks/receive/')

      // Validate response structure
      const validation = validateApiResponse(
        result.data.webhook,
        apiResponseStructures.webhook
      )
      expect(validation.isValid).toBe(true)
    })

    it('should validate required fields', async () => {
      const invalidData = { name: 'Test Webhook' } // Missing required fields

      const result = await testApiRoute(createWebhook, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: invalidData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
      expect(result.data.errors).toBeDefined()
    })

    it('should validate webhook type', async () => {
      const invalidTypeData = {
        ...validWebhookData,
        webhookType: 'invalid-type',
      }

      const result = await testApiRoute(createWebhook, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: invalidTypeData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
    })

    it('should require workspace access', async () => {
      jest.doMock('@/lib/mongodb/models', () => ({
        WorkspaceMember: {
          findOne: jest.fn().mockResolvedValue(null), // No access
        },
      }))

      const result = await testApiRoute(createWebhook, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: validWebhookData,
      })

      expect(result.status).toBe(403)
    })
  })

  describe('POST /api/webhooks/receive/[id]', () => {
    const webhookId = 'test-webhook-id'
    const webhookSecret = 'test-webhook-secret'

    beforeEach(() => {
      // Mock webhook processors
      jest.doMock('@/lib/webhooks/processors', () => ({
        processWebhook: jest.fn().mockResolvedValue({
          leads: [
            {
              name: 'Webhook Lead',
              email: 'webhook@example.com',
              source: 'webhook',
              customFields: {},
            },
          ],
          source: 'webhook',
          provider: 'test',
        }),
        detectWebhookType: jest.fn().mockReturnValue('generic'),
      }))
    })

    it('should process webhook data and create leads', async () => {
      const webhookPayload = {
        name: 'Test Lead from Webhook',
        email: 'webhook@example.com',
        phone: '+1234567890',
        company: 'Webhook Corp',
      }

      const mockWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        name: 'Test Webhook',
        webhookType: 'generic',
        isActive: true,
        secret: webhookSecret,
        createdBy: mockUserId,
      }

      const mockCreatedLead = {
        _id: 'webhook-lead-id',
        ...webhookPayload,
        workspaceId: mockWorkspaceId,
        createdBy: mockUserId,
      }

      const mockWebhookFindById = jest.fn().mockResolvedValue(mockWebhook)
      const mockLeadCreate = jest.fn().mockResolvedValue(mockCreatedLead)
      const mockWebhookFindByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(mockWebhook)
      const mockWebhookLogCreate = jest.fn().mockResolvedValue({})

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: mockWebhookFindById,
          findByIdAndUpdate: mockWebhookFindByIdAndUpdate,
        },
        Lead: { create: mockLeadCreate },
        WebhookLog: { create: mockWebhookLogCreate },
        Tag: {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({ _id: 'tag-id', name: 'test' }),
        },
      }))

      const result = await testApiRoute(receiveWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'TestWebhook/1.0',
        },
        params: { id: webhookId },
        body: webhookPayload,
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.results.created).toBeGreaterThan(0)
      expect(result.data.results.leadIds).toBeDefined()
    })

    it('should verify webhook signature when provided', async () => {
      const webhookPayload = { test: 'data' }
      const payloadString = JSON.stringify(webhookPayload)
      const signature = generateMockWebhookSignature(
        payloadString,
        webhookSecret
      )

      const mockWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        isActive: true,
        secret: webhookSecret,
        createdBy: mockUserId,
      }

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(mockWebhook),
          findByIdAndUpdate: jest.fn().mockResolvedValue(mockWebhook),
        },
        Lead: { create: jest.fn().mockResolvedValue({}) },
        WebhookLog: { create: jest.fn().mockResolvedValue({}) },
      }))

      const result = await testApiRoute(receiveWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${signature}`,
        },
        params: { id: webhookId },
        body: webhookPayload,
      })

      expect(result.status).toBe(200)
    })

    it('should reject invalid webhook signature', async () => {
      const webhookPayload = { test: 'data' }
      const invalidSignature = 'invalid-signature'

      const mockWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        isActive: true,
        secret: webhookSecret,
        createdBy: mockUserId,
      }

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(mockWebhook),
        },
        WebhookLog: { create: jest.fn().mockResolvedValue({}) },
      }))

      const result = await testApiRoute(receiveWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': `sha256=${invalidSignature}`,
        },
        params: { id: webhookId },
        body: webhookPayload,
      })

      expect(result.status).toBe(401)
      expect(result.data.error).toContain('Invalid webhook signature')
    })

    it('should return 404 for non-existent webhook', async () => {
      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(null),
        },
      }))

      const result = await testApiRoute(receiveWebhook, {
        method: 'POST',
        params: { id: 'non-existent-webhook' },
        body: { test: 'data' },
      })

      expect(result.status).toBe(404)
      expect(result.data.error).toContain('not found')
    })

    it('should handle invalid JSON payload', async () => {
      const mockWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        isActive: true,
      }

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(mockWebhook),
        },
        WebhookLog: { create: jest.fn().mockResolvedValue({}) },
      }))

      // Create request with invalid JSON
      const invalidJsonRequest = new Request(
        `http://localhost:3000/api/webhooks/receive/${webhookId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'invalid json{',
        }
      )

      const result = await receiveWebhook(invalidJsonRequest as any, {
        params: { id: webhookId },
      })
      const data = await result.json()

      expect(result.status).toBe(400)
      expect(data.error).toContain('Invalid JSON')
    })

    it('should handle Facebook webhook format', async () => {
      const facebookPayload = {
        object: 'page',
        entry: [
          {
            id: 'page-id',
            time: 1234567890,
            changes: [
              {
                field: 'leadgen',
                value: {
                  leadgen_id: 'lead-123',
                  page_id: 'page-id',
                  form_id: 'form-id',
                  field_data: [
                    { name: 'full_name', values: ['John Doe'] },
                    { name: 'email', values: ['john@example.com'] },
                    { name: 'phone_number', values: ['+1234567890'] },
                  ],
                },
              },
            ],
          },
        ],
      }

      const mockWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        webhookType: 'facebook',
        isActive: true,
        createdBy: mockUserId,
      }

      // Mock Facebook webhook processor
      jest.doMock('@/lib/webhooks/processors', () => ({
        processWebhook: jest.fn().mockResolvedValue({
          leads: [
            {
              name: 'John Doe',
              email: 'john@example.com',
              phone: '+1234567890',
              source: 'facebook',
            },
          ],
          source: 'facebook',
          provider: 'facebook',
        }),
        detectWebhookType: jest.fn().mockReturnValue('facebook'),
      }))

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(mockWebhook),
          findByIdAndUpdate: jest.fn().mockResolvedValue(mockWebhook),
        },
        Lead: { create: jest.fn().mockResolvedValue({ _id: 'lead-id' }) },
        WebhookLog: { create: jest.fn().mockResolvedValue({}) },
      }))

      const result = await testApiRoute(receiveWebhook, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'facebookexternalua',
        },
        params: { id: webhookId },
        body: facebookPayload,
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
    })
  })

  describe('PUT /api/webhooks/[id]', () => {
    const webhookId = 'test-webhook-id'
    const updateData = {
      name: 'Updated Webhook Name',
      description: 'Updated description',
      isActive: false,
    }

    it('should update webhook with valid data', async () => {
      const existingWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        name: 'Original Name',
        isActive: true,
      }

      const updatedWebhook = { ...existingWebhook, ...updateData }

      const mockWebhookFindById = jest.fn().mockResolvedValue(existingWebhook)
      const mockWebhookFindByIdAndUpdate = jest
        .fn()
        .mockResolvedValue(updatedWebhook)

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: mockWebhookFindById,
          findByIdAndUpdate: mockWebhookFindByIdAndUpdate,
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(updateWebhook, {
        method: 'PUT',
        headers: createAuthHeaders(validToken),
        params: { id: webhookId },
        body: updateData,
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.webhook.name).toBe(updateData.name)
    })

    it('should return 404 for non-existent webhook', async () => {
      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(null),
        },
      }))

      const result = await testApiRoute(updateWebhook, {
        method: 'PUT',
        headers: createAuthHeaders(validToken),
        params: { id: 'non-existent-id' },
        body: updateData,
      })

      expect(result.status).toBe(404)
    })
  })

  describe('DELETE /api/webhooks/[id]', () => {
    const webhookId = 'test-webhook-id'

    it('should delete webhook successfully', async () => {
      const existingWebhook = {
        _id: webhookId,
        workspaceId: mockWorkspaceId,
        name: 'Test Webhook',
      }

      const mockWebhookFindById = jest.fn().mockResolvedValue(existingWebhook)
      const mockWebhookFindByIdAndDelete = jest
        .fn()
        .mockResolvedValue(existingWebhook)

      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: mockWebhookFindById,
          findByIdAndDelete: mockWebhookFindByIdAndDelete,
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(deleteWebhook, {
        method: 'DELETE',
        headers: createAuthHeaders(validToken),
        params: { id: webhookId },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.message).toContain('deleted')
    })

    it('should return 404 for non-existent webhook', async () => {
      jest.doMock('@/lib/mongodb/models', () => ({
        Webhook: {
          findById: jest.fn().mockResolvedValue(null),
        },
      }))

      const result = await testApiRoute(deleteWebhook, {
        method: 'DELETE',
        headers: createAuthHeaders(validToken),
        params: { id: 'non-existent-id' },
      })

      expect(result.status).toBe(404)
    })
  })
})
