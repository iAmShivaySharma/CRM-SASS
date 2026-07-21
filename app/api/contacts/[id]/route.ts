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
import { checkPermission } from '@/lib/security/check-permission'

const updateContactSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name too long')
    .optional(),
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
  milestones: z
    .array(
      z.object({
        title: z.string().min(1, 'Title is required'),
        description: z.string().optional(),
        date: z.string().datetime(),
        type: z
          .enum(['payment', 'meeting', 'contract', 'delivery', 'other'])
          .optional(),
        amount: z.number().min(0).optional(),
        status: z.enum(['completed', 'pending', 'cancelled']).optional(),
      })
    )
    .optional(),
})

export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      try {
        await connectToMongoDB()

        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id: contactId } = await params
        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'contacts.view'
        )
        if (permError) return permError

        const contact = await Contact.findOne({ _id: contactId, workspaceId })
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')
          .populate('accountManager', 'fullName email')
          .populate('createdBy', 'fullName email')
          .populate('originalLeadId', 'name email company')
          .lean()

        if (!contact) {
          return NextResponse.json(
            { message: 'Contact not found' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          contact,
        })
      } catch (error) {
        log.error('Get contact error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    }
  )
)

export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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

        const { id: contactId } = await params
        const body = await request.json()

        const url = new URL(request.url)
        const workspaceId = url.searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'contacts.edit'
        )
        if (permError) return permError

        const validationResult = updateContactSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const updateData = validationResult.data

        const contact = (await Contact.findOne({
          _id: contactId,
          workspaceId,
        })) as any
        if (!contact) {
          return NextResponse.json(
            { message: 'Contact not found' },
            { status: 404 }
          )
        }

        const processedUpdateData = { ...updateData }
        if (processedUpdateData.assignedTo === '') {
          delete processedUpdateData.assignedTo
        }
        if (processedUpdateData.accountManager === '') {
          delete processedUpdateData.accountManager
        }

        if (processedUpdateData.lastContactDate) {
          processedUpdateData.lastContactDate = new Date(
            processedUpdateData.lastContactDate
          ).toISOString()
        }
        if (processedUpdateData.nextFollowUpDate) {
          processedUpdateData.nextFollowUpDate = new Date(
            processedUpdateData.nextFollowUpDate
          ).toISOString()
        }

        if (processedUpdateData.milestones) {
          processedUpdateData.milestones = processedUpdateData.milestones.map(
            milestone => ({
              ...milestone,
              date: new Date(milestone.date).toISOString(),
            })
          )
        }

        Object.assign(contact, processedUpdateData)
        contact.updatedAt = new Date()
        await contact.save()

        const populatedContact = await Contact.findById(contactId)
          .populate('tagIds', 'name color')
          .populate('assignedTo', 'fullName email')
          .populate('accountManager', 'fullName email')
          .populate('createdBy', 'fullName email')
          .lean()

        try {
          await Activity.create({
            workspaceId,
            performedBy: auth.user.id,
            activityType: 'updated',
            entityType: 'contact',
            entityId: contactId,
            description: `${auth.user.fullName} updated contact "${contact.name}"`,
            metadata: {
              contactName: contact.name,
              updatedFields: Object.keys(updateData),
              previousValues: {},
              newValues: updateData,
            },
          })
        } catch (activityError) {}

        logUserActivity(auth.user.id, 'contact_updated', 'contact', {
          contactId,
          contactName: contact.name,
          updatedFields: Object.keys(updateData),
          workspaceId,
        })

        logBusinessEvent('contact_updated', auth.user.id, workspaceId, {
          contactId,
          contactName: contact.name,
          updatedFields: Object.keys(updateData),
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Contact updated successfully',
          contact: populatedContact,
        })
      } catch (error) {
        log.error('Update contact error:', error)
        return NextResponse.json(
          {
            message: 'Internal server error',
            error: error instanceof Error ? error.message : 'Unknown error',
          },
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

export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
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
        const { id: contactId } = await params

        if (!workspaceId || !contactId) {
          return NextResponse.json(
            { message: 'Workspace ID and Contact ID are required' },
            { status: 400 }
          )
        }

        const permError = await checkPermission(
          auth.user.id,
          workspaceId,
          'contacts.delete'
        )
        if (permError) return permError

        const contact = (await Contact.findOne({
          _id: contactId,
          workspaceId,
        }).lean()) as any

        if (!contact) {
          return NextResponse.json(
            { message: 'Contact not found' },
            { status: 404 }
          )
        }

        await Contact.findByIdAndDelete(contactId)

        logUserActivity(auth.user.id, 'contact.delete', 'contact', {
          workspaceId,
          contactId,
          contactName: contact.name,
        })

        logBusinessEvent('contact_deleted', auth.user.id, workspaceId, {
          contactId,
          contactName: contact.name,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Contact deleted successfully',
        })
      } catch (error) {
        log.error('Delete contact error:', error)
        return NextResponse.json({ message: 'Server error' }, { status: 500 })
      }
    }
  )
)
