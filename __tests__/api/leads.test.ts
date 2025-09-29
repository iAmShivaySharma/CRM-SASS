import { GET as getLeads, POST as createLead } from '@/app/api/leads/route'
import {
  GET as getLeadById,
  PUT as updateLead,
  DELETE as deleteLead,
} from '@/app/api/leads/[id]/route'
import { POST as convertLead } from '@/app/api/leads/[id]/convert-to-contact/route'
import {
  testApiRoute,
  validateApiResponse,
  apiResponseStructures,
} from '../helpers/apiHelpers'
import {
  generateTestJWT,
  createAuthHeaders,
  createMockWorkspaceMember,
} from '../helpers/authHelpers'
import { generateTestLead, mockApiResponses } from '../helpers/testUtils'

// Mock dependencies
jest.mock('@/lib/mongodb/connection')
jest.mock('@/lib/mongodb/auth')
jest.mock('@/lib/mongodb/models')

describe('Leads API Endpoints', () => {
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

    // Mock workspace member
    const mockWorkspaceMember = jest
      .fn()
      .mockResolvedValue(createMockWorkspaceMember('admin'))

    jest.doMock('@/lib/mongodb/auth', () => ({
      verifyAuthToken: mockVerifyAuth,
    }))

    jest.doMock('@/lib/mongodb/models', () => ({
      WorkspaceMember: {
        findOne: mockWorkspaceMember,
      },
    }))
  })

  describe('GET /api/leads', () => {
    it('should return leads for authenticated user', async () => {
      const mockLeads = mockApiResponses.leads.leads
      const mockLeadFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockLeads),
              }),
            }),
          }),
        }),
      })
      const mockLeadCount = jest.fn().mockResolvedValue(mockLeads.length)

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: {
          find: mockLeadFind,
          countDocuments: mockLeadCount,
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(getLeads, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
        query: { workspaceId: mockWorkspaceId },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.leads).toBeDefined()
      expect(Array.isArray(result.data.leads)).toBe(true)
      expect(result.data.pagination).toBeDefined()

      // Validate response structure
      const validation = validateApiResponse(
        result.data,
        apiResponseStructures.pagination
      )
      expect(validation.isValid).toBe(true)
    })

    it('should require authentication', async () => {
      const result = await testApiRoute(getLeads, {
        method: 'GET',
        query: { workspaceId: mockWorkspaceId },
      })

      expect(result.status).toBe(401)
      expect(result.data.success).toBe(false)
    })

    it('should require workspaceId parameter', async () => {
      const result = await testApiRoute(getLeads, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
      })

      expect(result.status).toBe(400)
      expect(result.data.message).toContain('Workspace ID is required')
    })

    it('should support pagination', async () => {
      const mockLeads = [generateTestLead({ name: 'Test Lead 1' })]
      const mockLeadFind = jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockLeads),
              }),
            }),
          }),
        }),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: {
          find: mockLeadFind,
          countDocuments: jest.fn().mockResolvedValue(1),
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(getLeads, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
        query: { workspaceId: mockWorkspaceId, page: '2', limit: '10' },
      })

      expect(result.status).toBe(200)
      expect(result.data.pagination.page).toBe(2)
      expect(result.data.pagination.limit).toBe(10)
    })

    it('should support search filtering', async () => {
      const result = await testApiRoute(getLeads, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
        query: {
          workspaceId: mockWorkspaceId,
          search: 'john',
          status: 'new',
          priority: 'high',
        },
      })

      expect(result.status).toBe(200)
      // Verify that the search parameters were processed
    })
  })

  describe('POST /api/leads', () => {
    const validLeadData = generateTestLead()

    it('should create lead with valid data', async () => {
      const mockCreatedLead = {
        _id: 'new-lead-id',
        ...validLeadData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const mockLeadCreate = jest.fn().mockResolvedValue(mockCreatedLead)
      const mockLeadFindById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCreatedLead),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: {
          create: mockLeadCreate,
          findById: mockLeadFindById,
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
        Activity: {
          create: jest.fn().mockResolvedValue({}),
        },
      }))

      const result = await testApiRoute(createLead, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: validLeadData,
      })

      expect(result.status).toBe(201)
      expect(result.data.success).toBe(true)
      expect(result.data.lead).toBeDefined()
      expect(result.data.lead.name).toBe(validLeadData.name)

      // Validate response structure
      const validation = validateApiResponse(
        result.data.lead,
        apiResponseStructures.lead
      )
      expect(validation.isValid).toBe(true)
    })

    it('should validate required fields', async () => {
      const invalidData = { email: 'test@example.com' } // Missing required fields

      const result = await testApiRoute(createLead, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: invalidData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
      expect(result.data.errors).toBeDefined()
    })

    it('should validate email format', async () => {
      const invalidEmailData = {
        ...validLeadData,
        email: 'invalid-email-format',
      }

      const result = await testApiRoute(createLead, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: invalidEmailData,
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

      const result = await testApiRoute(createLead, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        body: validLeadData,
      })

      expect(result.status).toBe(403)
      expect(result.data.message).toContain('Access denied')
    })
  })

  describe('GET /api/leads/[id]', () => {
    const leadId = 'test-lead-id'

    it('should return lead by ID', async () => {
      const mockLead = { _id: leadId, ...generateTestLead() }
      const mockLeadFindById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockLead),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: { findById: mockLeadFindById },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
      }))

      const result = await testApiRoute(getLeadById, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
        params: { id: leadId },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.lead._id).toBe(leadId)
    })

    it('should return 404 for non-existent lead', async () => {
      const mockLeadFindById = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: { findById: mockLeadFindById },
      }))

      const result = await testApiRoute(getLeadById, {
        method: 'GET',
        headers: createAuthHeaders(validToken),
        params: { id: 'non-existent-id' },
      })

      expect(result.status).toBe(404)
      expect(result.data.message).toContain('not found')
    })
  })

  describe('PUT /api/leads/[id]', () => {
    const leadId = 'test-lead-id'
    const updateData = { name: 'Updated Lead Name', status: 'contacted' }

    it('should update lead with valid data', async () => {
      const existingLead = { _id: leadId, ...generateTestLead() }
      const updatedLead = { ...existingLead, ...updateData }

      const mockLeadFindById = jest.fn().mockResolvedValue(existingLead)
      const mockLeadFindByIdAndUpdate = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updatedLead),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: {
          findById: mockLeadFindById,
          findByIdAndUpdate: mockLeadFindByIdAndUpdate,
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
        Activity: {
          create: jest.fn().mockResolvedValue({}),
        },
      }))

      const result = await testApiRoute(updateLead, {
        method: 'PUT',
        headers: createAuthHeaders(validToken),
        params: { id: leadId },
        body: updateData,
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.lead.name).toBe(updateData.name)
    })

    it('should validate update data', async () => {
      const invalidUpdateData = { email: 'invalid-email' }

      const result = await testApiRoute(updateLead, {
        method: 'PUT',
        headers: createAuthHeaders(validToken),
        params: { id: leadId },
        body: invalidUpdateData,
      })

      expect(result.status).toBe(400)
      expect(result.data.success).toBe(false)
    })
  })

  describe('DELETE /api/leads/[id]', () => {
    const leadId = 'test-lead-id'

    it('should delete lead successfully', async () => {
      const existingLead = { _id: leadId, ...generateTestLead() }
      const mockLeadFindById = jest.fn().mockResolvedValue(existingLead)
      const mockLeadFindByIdAndDelete = jest
        .fn()
        .mockResolvedValue(existingLead)

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: {
          findById: mockLeadFindById,
          findByIdAndDelete: mockLeadFindByIdAndDelete,
        },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
        Activity: {
          create: jest.fn().mockResolvedValue({}),
        },
      }))

      const result = await testApiRoute(deleteLead, {
        method: 'DELETE',
        headers: createAuthHeaders(validToken),
        params: { id: leadId },
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.message).toContain('deleted')
    })

    it('should return 404 for non-existent lead', async () => {
      const mockLeadFindById = jest.fn().mockResolvedValue(null)

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: { findById: mockLeadFindById },
      }))

      const result = await testApiRoute(deleteLead, {
        method: 'DELETE',
        headers: createAuthHeaders(validToken),
        params: { id: 'non-existent-id' },
      })

      expect(result.status).toBe(404)
    })
  })

  describe('POST /api/leads/[id]/convert-to-contact', () => {
    const leadId = 'test-lead-id'
    const conversionData = {
      category: 'client',
      status: 'active',
      totalRevenue: 10000,
    }

    it('should convert lead to contact successfully', async () => {
      const existingLead = { _id: leadId, ...generateTestLead() }
      const mockCreatedContact = {
        _id: 'new-contact-id',
        ...existingLead,
        ...conversionData,
        convertedFromLead: true,
        originalLeadId: leadId,
      }

      const mockLeadFindById = jest.fn().mockResolvedValue(existingLead)
      const mockLeadFindByIdAndUpdate = jest.fn().mockResolvedValue({
        ...existingLead,
        isConverted: true,
        convertedToContactId: 'new-contact-id',
      })
      const mockContactCreate = jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockCreatedContact),
      })

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: {
          findById: mockLeadFindById,
          findByIdAndUpdate: mockLeadFindByIdAndUpdate,
        },
        Contact: { create: mockContactCreate },
        WorkspaceMember: {
          findOne: jest
            .fn()
            .mockResolvedValue(createMockWorkspaceMember('admin')),
        },
        Activity: {
          create: jest.fn().mockResolvedValue({}),
        },
      }))

      const result = await testApiRoute(convertLead, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        params: { id: leadId },
        body: conversionData,
      })

      expect(result.status).toBe(200)
      expect(result.data.success).toBe(true)
      expect(result.data.contact).toBeDefined()
      expect(result.data.contact.convertedFromLead).toBe(true)
    })

    it('should not convert already converted lead', async () => {
      const convertedLead = {
        _id: leadId,
        ...generateTestLead(),
        isConverted: true,
      }
      const mockLeadFindById = jest.fn().mockResolvedValue(convertedLead)

      jest.doMock('@/lib/mongodb/models', () => ({
        Lead: { findById: mockLeadFindById },
      }))

      const result = await testApiRoute(convertLead, {
        method: 'POST',
        headers: createAuthHeaders(validToken),
        params: { id: leadId },
        body: conversionData,
      })

      expect(result.status).toBe(400)
      expect(result.data.message).toContain('already converted')
    })
  })
})
