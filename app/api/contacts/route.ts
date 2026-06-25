import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Contact, WorkspaceMember, Activity } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { cached, invalidateCache } from '@/lib/redis/cache'
import { activityQueue } from '@/lib/queue/queues'

const createContactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z
    .string()
    .email('Invalid email')
    .max(255, 'Email too long')
    .optional()
    .or(z.literal('')),
  phone: z.string().max(20, 'Phone too long').optional().or(z.literal('')),
  company: z
    .string()
    .max(100, 'Company name too long')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, 'Position too long')
    .optional()
    .or(z.literal('')),
  totalRevenue: z.number().min(0, 'Revenue must be positive').optional(),
  totalPayments: z.number().min(0, 'Payments must be positive').optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      country: z.string().optional(),
    })
    .optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  linkedIn: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  twitter: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
  tagIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i, 'Invalid tag ID format'))
    .max(10, 'Too many tags')
    .optional(),
  category: z
    .enum(['client', 'prospect', 'partner', 'vendor', 'other'])
    .optional(),
  assignedTo: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID format')
    .optional()
    .or(z.literal('')),
  accountManager: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID format')
    .optional()
    .or(z.literal('')),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  lastContactDate: z.string().datetime().optional(),
  nextFollowUpDate: z.string().datetime().optional(),
  customData: z.record(z.any()).optional(),
  originalLeadId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid lead ID format')
    .optional(),
  convertedFromLead: z.boolean().optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '20')
        const search = url.searchParams.get('search')
        const status = url.searchParams.get('status')
        const category = url.searchParams.get('category')
        const assignedTo = url.searchParams.get('assignedTo')
        const priority = url.searchParams.get('priority')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const userMembership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        })

        if (!userMembership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const query: any = { workspaceId }

        if (search) {
          query.$text = { $search: search }
        }

        if (status) query.status = status
        if (category) query.category = category
        if (assignedTo) query.assignedTo = assignedTo
        if (priority) query.priority = priority

        const skip = (page - 1) * limit

        const [contacts, total] = await cached(
          `contacts:${workspaceId}:${page}:${limit}:${status || ''}:${search || ''}:${category || ''}:${assignedTo || ''}:${priority || ''}`,
          60,
          async () =>
            Promise.all([
              Contact.find(query)
                .select(
                  'name email phone company position status priority category assignedTo accountManager tagIds createdBy totalRevenue createdAt'
                )
                .populate('tagIds', 'name color')
                .populate('assignedTo', 'fullName email')
                .populate('accountManager', 'fullName email')
                .populate('createdBy', 'fullName email')
                .sort(
                  search ? { score: { $meta: 'textScore' } } : { createdAt: -1 }
                )
                .skip(skip)
                .limit(limit)
                .lean(),
              Contact.countDocuments(query),
            ])
        )

        logBusinessEvent('contacts_listed', auth.user.id, workspaceId, {
          count: contacts.length,
          page,
          filters: { status, category, assignedTo, priority, search },
        })

        return NextResponse.json({
          success: true,
          contacts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        })
      } catch (error) {
        log.error('List contacts error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: false,
      logHeaders: true,
    }
  )
)

export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
      const startTime = Date.now()

      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const body = await request.json()
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const validationResult = createContactSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const member = await WorkspaceMember.findOne({
          userId: auth.user.id,
          workspaceId,
          status: 'active',
        })

        if (!member) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        const processedData = { ...validationResult.data }
        if (processedData.assignedTo === '') {
          delete processedData.assignedTo
        }
        if (processedData.accountManager === '') {
          delete processedData.accountManager
        }
        if (processedData.tagIds) {
          processedData.tagIds = processedData.tagIds.filter(id => id !== '')
        }

        const contactData = {
          ...processedData,
          workspaceId,
          createdBy: auth.user.id,
          lastContactDate: processedData.lastContactDate
            ? new Date(processedData.lastContactDate)
            : undefined,
          nextFollowUpDate: processedData.nextFollowUpDate
            ? new Date(processedData.nextFollowUpDate)
            : undefined,
          leadConversionDate: processedData.convertedFromLead
            ? new Date()
            : undefined,
        }

        const contact = await Contact.create(contactData)

        const populatedContact = await Contact.findById(contact._id)
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')
          .populate('accountManager', 'fullName email')
          .populate('createdBy', 'fullName email')

        await activityQueue.add('contact-created', {
          workspaceId,
          performedBy: auth.user.id,
          activityType: 'created',
          entityType: 'contact',
          entityId: contact._id.toString(),
          description: `${auth.user.fullName} created new contact "${contactData.name}"`,
          metadata: {
            contactName: contactData.name,
            company: contactData.company,
            convertedFromLead: contactData.convertedFromLead || false,
          },
        })

        logUserActivity(auth.user.id, 'contact_created', 'contact', {
          contactId: contact._id,
          contactName: contactData.name,
          workspaceId,
        })

        await invalidateCache(`contacts:${workspaceId}:*`)

        return NextResponse.json(
          {
            success: true,
            message: 'Contact created successfully',
            contact: populatedContact,
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create contact error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: true,
      logHeaders: true,
    }
  )
)
