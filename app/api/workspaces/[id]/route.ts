/**
 * Individual Workspace API Endpoint
 *
 * Handles CRUD operations for specific workspaces including:
 * - GET: Retrieve workspace details with members
 * - PUT: Update workspace information
 * - DELETE: Delete workspace (owner only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import {
  Workspace,
  WorkspaceMember,
  User,
  Activity,
} from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { log } from '@/lib/logging/logger'
import {
  logUserActivity,
  logBusinessEvent,
  withLogging,
  withSecurityLogging,
} from '@/lib/logging/middleware'
import { rateLimit } from '@/lib/security/rate-limiter'
import { getClientIP } from '@/lib/utils/ip-utils'
import { z } from 'zod'
import mongoose from 'mongoose'

// Supported currencies and timezones
const SUPPORTED_CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'AUD',
  'CAD',
  'CHF',
  'CNY',
  'SEK',
  'NZD',
  'MXN',
  'SGD',
  'HKD',
  'NOK',
  'TRY',
  'RUB',
  'INR',
  'BRL',
  'ZAR',
  'KRW',
] as const

const SUPPORTED_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Mexico_City',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Amsterdam',
  'Europe/Stockholm',
  'Europe/Moscow',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Hong_Kong',
  'Asia/Singapore',
  'Asia/Mumbai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Pacific/Auckland',
] as const

// Validation schemas
const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Workspace name contains invalid characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
  timezone: z
    .string()
    .refine(tz => SUPPORTED_TIMEZONES.includes(tz as any), 'Invalid timezone')
    .optional(),
  settings: z
    .object({
      dateFormat: z
        .enum([
          'MM/DD/YYYY',
          'DD/MM/YYYY',
          'YYYY-MM-DD',
          'DD-MM-YYYY',
          'MM-DD-YYYY',
        ])
        .optional(),
      timeFormat: z.enum(['12h', '24h']).optional(),
      weekStartsOn: z.number().min(0).max(6).optional(),
      language: z
        .enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'])
        .optional(),
    })
    .optional(),
  slug: z
    .string()
    .min(3, 'Slug must be at least 3 characters')
    .max(50, 'Slug must be less than 50 characters')
    .regex(
      /^[a-z0-9\-]+$/,
      'Slug can only contain lowercase letters, numbers, and hyphens'
    )
    .optional(),
})

// GET /api/workspaces/[id] - Get workspace details
export const GET = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Rate limiting
        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'api')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }

        // Authentication
        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId } = await params

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Find workspace and check user access
        const workspace = await Workspace.findById(workspaceId)
        if (!workspace) {
          return NextResponse.json(
            { message: 'Workspace not found' },
            { status: 404 }
          )
        }

        // Check if user is a member of this workspace
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            {
              message: 'Access denied. You are not a member of this workspace.',
            },
            { status: 403 }
          )
        }

        // Get all workspace members with their details
        const members = await WorkspaceMember.find({
          workspaceId,
          status: 'active',
        })
          .populate('userId', 'name email')
          .populate('roleId', 'name permissions')
          .sort({ createdAt: 1 })

        // Get member count
        const memberCount = members.length

        // Format response
        const workspaceDetails = {
          id: workspace._id,
          name: workspace.name,
          description: workspace.description,
          slug: workspace.slug,
          planId: workspace.planId,
          currency: workspace.currency,
          timezone: workspace.timezone,
          settings: workspace.settings,
          createdBy: workspace.createdBy,
          createdAt: workspace.createdAt,
          updatedAt: workspace.updatedAt,
          memberCount,
          userRole: membership.roleId?.name || 'Member',
          members: members.map(member => ({
            id: member._id,
            userId: member.userId?._id || member.userId,
            name:
              member.userId?.name || member.email?.split('@')[0] || 'Unknown',
            email: member.userId?.email || member.email || 'No email',
            avatar: null, // Avatar not implemented yet
            role: member.roleId?.name || 'Member',
            status: member.status,
            joinedAt: member.createdAt,
          })),
        }

        // Log successful access
        logUserActivity(userId, 'workspace_viewed', 'workspace', {
          workspaceId,
          workspaceName: workspace.name,
        })

        logBusinessEvent('workspace_access', userId, workspaceId, {
          memberCount,
          duration: Date.now() - startTime,
        })

        log.info(`Workspace details retrieved for user ${userId}`, {
          workspaceId,
          memberCount,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          workspace: workspaceDetails,
        })
      } catch (error) {
        log.error('Error retrieving workspace details:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to retrieve workspace details',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)

// PUT /api/workspaces/[id] - Update workspace
export const PUT = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Rate limiting
        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'api')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }

        // Authentication
        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId } = await params

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Parse and validate request body
        const body = await request.json()
        const validationResult = updateWorkspaceSchema.safeParse(body)

        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const { name, description, slug, currency, timezone, settings } =
          validationResult.data

        // Find workspace and check user permissions
        const workspace = await Workspace.findById(workspaceId)
        if (!workspace) {
          return NextResponse.json(
            { message: 'Workspace not found' },
            { status: 404 }
          )
        }

        // Check if user has admin/owner permissions
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (
          !membership ||
          !['Owner', 'Admin'].includes(membership.roleId?.name)
        ) {
          return NextResponse.json(
            { message: 'Access denied. Admin or Owner permissions required.' },
            { status: 403 }
          )
        }

        // Check if slug is unique (if provided and different)
        if (slug && slug !== workspace.slug) {
          const existingWorkspace = await Workspace.findOne({
            slug,
            _id: { $ne: workspaceId },
          })

          if (existingWorkspace) {
            return NextResponse.json(
              { message: 'Workspace URL is already taken' },
              { status: 409 }
            )
          }
        }

        // Update workspace
        const updateData: any = {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          ...(slug && { slug }),
          ...(currency && { currency }),
          ...(timezone && { timezone }),
          updatedAt: new Date(),
        }

        // Handle settings update - merge with existing settings
        if (settings) {
          const existingSettings = workspace.settings || {}
          updateData.settings = {
            ...existingSettings,
            ...settings,
          }
        }

        const updatedWorkspace = await Workspace.findByIdAndUpdate(
          workspaceId,
          updateData,
          { new: true }
        )

        // Log activity in the Activity collection for recent activity display
        try {
          await Activity.create({
            workspaceId,
            performedBy: userId,
            activityType: 'updated',
            entityType: 'workspace',
            entityId: workspaceId,
            description: `${authResult.user.fullName} updated workspace settings`,
            metadata: {
              workspaceName: updatedWorkspace.name,
              changes: Object.keys(updateData).filter(
                key => key !== 'updatedAt'
              ),
              previousValues: {},
              newValues: updateData,
            },
          })
        } catch (activityError) {
          console.error(
            'Failed to log workspace update activity:',
            activityError
          )
          // Don't fail the update if activity logging fails
        }

        // Log successful update
        logUserActivity(userId, 'workspace_updated', 'workspace', {
          workspaceId,
          workspaceName: updatedWorkspace.name,
          changes: Object.keys(updateData),
        })

        logBusinessEvent('workspace_updated', userId, workspaceId, {
          changes: updateData,
          duration: Date.now() - startTime,
        })

        log.info(`Workspace updated by user ${userId}`, {
          workspaceId,
          changes: updateData,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Workspace updated successfully',
          workspace: {
            id: updatedWorkspace._id,
            name: updatedWorkspace.name,
            description: updatedWorkspace.description,
            slug: updatedWorkspace.slug,
            currency: updatedWorkspace.currency,
            timezone: updatedWorkspace.timezone,
            settings: updatedWorkspace.settings,
            planId: updatedWorkspace.planId,
            updatedAt: updatedWorkspace.updatedAt,
          },
        })
      } catch (error) {
        log.error('Error updating workspace:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to update workspace',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)

// DELETE /api/workspaces/[id] - Delete workspace (Owner only)
export const DELETE = withSecurityLogging(
  withLogging(
    async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
      const startTime = Date.now()

      try {
        // Ensure database connection
        await connectToMongoDB()

        // Rate limiting
        const clientIp = getClientIP(request)
        const rateLimitResult = await rateLimit(clientIp, 'api')
        if (!rateLimitResult.success) {
          return NextResponse.json(
            { message: 'Too many requests. Please try again later.' },
            { status: 429 }
          )
        }

        // Authentication
        const authResult = await requireAuth(request)
        if (!authResult.success) {
          return authResult.response
        }

        const userId = authResult.user.id
        const { id: workspaceId } = await params

        // Validate workspace ID format
        if (!mongoose.Types.ObjectId.isValid(workspaceId)) {
          return NextResponse.json(
            { message: 'Invalid workspace ID format' },
            { status: 400 }
          )
        }

        // Find workspace and check ownership
        const workspace = await Workspace.findById(workspaceId)
        if (!workspace) {
          return NextResponse.json(
            { message: 'Workspace not found' },
            { status: 404 }
          )
        }

        // Check if user is the owner
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId,
          status: 'active',
        }).populate('roleId')

        if (!membership || membership.roleId?.name !== 'Owner') {
          return NextResponse.json(
            {
              message:
                'Access denied. Only workspace owners can delete workspaces.',
            },
            { status: 403 }
          )
        }

        // Start transaction for safe deletion
        const session = await mongoose.startSession()
        session.startTransaction()

        try {
          // Delete all workspace members
          await WorkspaceMember.deleteMany({ workspaceId }, { session })

          // Delete the workspace
          await Workspace.findByIdAndDelete(workspaceId, { session })

          // TODO: Delete related data (leads, activities, etc.)

          await session.commitTransaction()

          // Log successful deletion
          logUserActivity(userId, 'workspace_deleted', 'workspace', {
            workspaceId,
            workspaceName: workspace.name,
          })

          logBusinessEvent('workspace_deleted', userId, workspaceId, {
            workspaceName: workspace.name,
            duration: Date.now() - startTime,
          })

          log.info(`Workspace deleted by user ${userId}`, {
            workspaceId,
            workspaceName: workspace.name,
            duration: Date.now() - startTime,
          })

          return NextResponse.json({
            success: true,
            message: 'Workspace deleted successfully',
          })
        } catch (error) {
          await session.abortTransaction()
          throw error
        } finally {
          session.endSession()
        }
      } catch (error) {
        log.error('Error deleting workspace:', error)

        return NextResponse.json(
          {
            success: false,
            message: 'Failed to delete workspace',
            error:
              process.env.NODE_ENV === 'development'
                ? (error as Error).message
                : undefined,
          },
          { status: 500 }
        )
      }
    }
  )
)
