/**
 * Workspaces API Endpoint
 *
 * Handles workspace CRUD operations with comprehensive security,
 * logging, and validation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/security/auth-middleware'
import {
  Workspace,
  WorkspaceMember,
  Role,
  User,
  Activity,
} from '@/lib/mongodb/client'
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
import {
  seedDefaultLeadStatuses,
  seedDefaultTags,
} from '@/lib/mongodb/seedDefaults'

// Supported currencies
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

// Common timezones
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
const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name is too long')
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .trim(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .optional()
    .transform(val => val?.trim() || ''),
  currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  timezone: z
    .string()
    .default('UTC')
    .refine(tz => SUPPORTED_TIMEZONES.includes(tz as any), 'Invalid timezone'),
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
        .default('MM/DD/YYYY'),
      timeFormat: z.enum(['12h', '24h']).default('12h'),
      weekStartsOn: z.number().min(0).max(6).default(0),
      language: z
        .enum(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh'])
        .default('en'),
    })
    .optional(),
})

const updateWorkspaceSchema = z.object({
  name: z
    .string()
    .min(2, 'Workspace name must be at least 2 characters')
    .max(50, 'Workspace name is too long')
    .regex(
      /^[a-zA-Z0-9\s-_]+$/,
      'Workspace name can only contain letters, numbers, spaces, hyphens, and underscores'
    )
    .trim()
    .optional(),
  description: z
    .string()
    .max(500, 'Description is too long')
    .transform(val => val?.trim() || '')
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
})

/**
 * GET /api/workspaces
 * Get user's workspaces
 */
export const GET = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()
    console.log('=== GET WORKSPACES API DEBUG START ===')

    try {
      // Ensure database connection
      console.log('Connecting to MongoDB...')
      await connectToMongoDB()
      console.log('MongoDB connected successfully')
      // Rate limiting
      const clientIP = getClientIP(request)
      const rateLimitResult = await rateLimit(clientIP, 'api')

      if (!rateLimitResult.success) {
        log.security(
          'Rate limit exceeded for workspaces GET',
          {
            ip: clientIP,
            endpoint: '/api/workspaces',
          },
          'medium'
        )

        return NextResponse.json(
          { message: 'Rate limit exceeded' },
          { status: 429 }
        )
      }

      // Authentication
      console.log('Authenticating user...')
      const authResult = await requireAuth(request)
      console.log('Auth result:', authResult.success ? 'Success' : 'Failed')
      if (!authResult.success) {
        console.log('Authentication failed, returning error')
        return authResult.response
      }

      const userId = authResult.user.id
      console.log('User ID:', userId)

      // Get user's workspace memberships with error handling
      console.log('Fetching user workspace memberships...')
      let memberships = []

      try {
        memberships = await WorkspaceMember.find({
          userId,
          status: 'active',
        })
          .populate('workspaceId')
          .populate('roleId')
      } catch (populateError) {
        console.error('Error populating workspace memberships:', populateError)
        // Fallback: get memberships without populate and fetch manually
        const rawMemberships = await WorkspaceMember.find({
          userId,
          status: 'active',
        })

        for (const membership of rawMemberships) {
          try {
            const workspace = await Workspace.findById(membership.workspaceId)
            const role = await Role.findById(membership.roleId)
            if (workspace) {
              membership.workspaceId = workspace
            }
            if (role) {
              membership.roleId = role
            }
          } catch (fetchError) {
            console.error(
              `Error fetching workspace/role for membership ${membership._id}:`,
              fetchError
            )
          }
        }

        memberships = rawMemberships
      }

      console.log('Found memberships:', memberships.length)

      // Separate valid and invalid memberships
      const validMemberships = []
      const orphanedMembershipIds = []

      for (const membership of memberships) {
        // Check if workspaceId exists and is populated
        if (
          !membership.workspaceId ||
          typeof membership.workspaceId === 'string'
        ) {
          console.log(
            'Found membership with unpopulated workspaceId:',
            membership._id
          )
          orphanedMembershipIds.push(membership._id)
          continue
        }

        // Check if workspace has required fields
        if (!membership.workspaceId.name) {
          console.log(
            'Found membership with workspace missing name:',
            membership.workspaceId._id
          )
          orphanedMembershipIds.push(membership._id)
          continue
        }

        validMemberships.push(membership)
      }

      // Clean up orphaned memberships (async, non-blocking)
      if (orphanedMembershipIds.length > 0) {
        console.log(
          `Cleaning up ${orphanedMembershipIds.length} orphaned memberships in GET`
        )
        WorkspaceMember.deleteMany({
          _id: { $in: orphanedMembershipIds },
        }).catch(cleanupError =>
          console.error(
            'Error cleaning up orphaned memberships in GET:',
            cleanupError
          )
        )
      }

      // Map valid workspaces
      const workspaces = validMemberships.map(membership => ({
        id: membership.workspaceId._id,
        name: membership.workspaceId.name,
        slug: membership.workspaceId.slug,
        planId: membership.workspaceId.planId,
        currency: membership.workspaceId.currency,
        timezone: membership.workspaceId.timezone,
        settings: membership.workspaceId.settings,
        subscriptionStatus: membership.workspaceId.subscriptionStatus,
        createdAt: membership.workspaceId.createdAt,
        role:
          membership.roleId && typeof membership.roleId === 'object'
            ? {
                id: membership.roleId._id,
                name: membership.roleId.name,
                permissions: membership.roleId.permissions,
              }
            : { id: membership.roleId, name: 'Unknown', permissions: [] },
      }))

      console.log('Valid workspaces found:', workspaces.length)

      const duration = Date.now() - startTime
      log.performance('Get workspaces', duration, {
        userId,
        workspaceCount: workspaces.length,
      })

      logUserActivity(userId, 'list_workspaces', 'workspaces', {
        count: workspaces.length,
      })

      return NextResponse.json({
        workspaces,
        total: workspaces.length,
      })
    } catch (error) {
      console.error('=== GET WORKSPACES ERROR ===')
      console.error('Error details:', error)
      console.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack'
      )

      const duration = Date.now() - startTime
      log.error(`Get workspaces failed after ${duration}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      return NextResponse.json(
        {
          message: 'Failed to fetch workspaces',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack:
            process.env.NODE_ENV === 'development'
              ? error instanceof Error
                ? error.stack
                : undefined
              : undefined,
        },
        { status: 500 }
      )
    }
  })
)

/**
 * POST /api/workspaces
 * Create new workspace
 */
export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()
    console.log('=== WORKSPACE CREATION API DEBUG START ===')

    try {
      // Ensure database connection
      console.log('Connecting to MongoDB...')
      await connectToMongoDB()
      console.log('MongoDB connected successfully')
      // Rate limiting - stricter for workspace creation
      const clientIP = getClientIP(request)
      const rateLimitResult = await rateLimit(clientIP, 'api', {
        windowMs: 60 * 1000, // 1 minute
        maxRequests: 5, // 5 workspace creations per minute
      })

      if (!rateLimitResult.success) {
        log.security(
          'Rate limit exceeded for workspace creation',
          {
            ip: clientIP,
            endpoint: '/api/workspaces',
          },
          'high'
        )

        return NextResponse.json(
          { message: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }

      // Authentication
      console.log('Authenticating user...')
      const authResult = await requireAuth(request)
      console.log('Auth result:', authResult.success ? 'Success' : 'Failed')
      if (!authResult.success) {
        console.log('Authentication failed, returning error')
        return authResult.response
      }

      const userId = authResult.user.id
      console.log('User ID:', userId)

      // Parse and validate request body
      console.log('Parsing request body...')
      let body
      try {
        body = await request.json()
        console.log('Request body:', body)
      } catch (error) {
        console.log('JSON parsing error:', error)
        return NextResponse.json(
          { message: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }

      console.log('Validating request body...')
      const validation = createWorkspaceSchema.safeParse(body)
      console.log('Validation result:', validation.success)
      if (!validation.success) {
        console.log('Validation errors:', validation.error.errors)
        log.warn('Workspace creation validation failed', {
          userId,
          errors: validation.error.errors,
        })

        return NextResponse.json(
          {
            message: 'Validation failed',
            errors: validation.error.errors,
          },
          { status: 400 }
        )
      }

      const { name, description, currency, timezone, settings } =
        validation.data

      // Additional validation
      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { message: 'Workspace name is required' },
          { status: 400 }
        )
      }

      console.log('Validated workspace data:', {
        name: name.trim(),
        description: description || 'No description',
        currency: currency || 'USD',
        timezone: timezone || 'UTC',
        settings: settings || 'Default settings',
      })

      // Check if user already has a workspace with this name
      console.log('Checking for existing workspaces with same name...')
      let existingMemberships = []

      try {
        existingMemberships = await WorkspaceMember.find({
          userId,
          status: 'active',
        }).populate('workspaceId')
      } catch (populateError) {
        console.error('Error populating workspace memberships:', populateError)
        // Fallback: get memberships without populate and check manually
        const memberships = await WorkspaceMember.find({
          userId,
          status: 'active',
        })

        for (const membership of memberships) {
          try {
            const workspace = await Workspace.findById(membership.workspaceId)
            if (workspace) {
              membership.workspaceId = workspace
            }
          } catch (workspaceError) {
            console.error(
              `Error fetching workspace ${membership.workspaceId}:`,
              workspaceError
            )
          }
        }

        existingMemberships = memberships
      }

      console.log('Found existing memberships:', existingMemberships.length)
      console.log(
        'Memberships details:',
        existingMemberships.map(m => ({
          id: m._id,
          workspaceId: m.workspaceId
            ? typeof m.workspaceId === 'string'
              ? m.workspaceId
              : m.workspaceId._id
            : 'null',
          workspaceName:
            m.workspaceId && typeof m.workspaceId === 'object'
              ? m.workspaceId.name
              : 'not populated',
        }))
      )

      // Clean up orphaned memberships and check for name conflicts
      const validMemberships = []
      const orphanedMembershipIds = []

      for (const membership of existingMemberships) {
        // Check if workspaceId exists and is populated
        if (
          !membership.workspaceId ||
          typeof membership.workspaceId === 'string'
        ) {
          console.log(
            'Found membership with unpopulated workspaceId:',
            membership._id
          )
          orphanedMembershipIds.push(membership._id)
          continue
        }

        // Check if the populated workspace has required fields
        if (!membership.workspaceId.name) {
          console.log(
            'Found membership with workspace missing name:',
            membership.workspaceId._id || membership.workspaceId
          )
          orphanedMembershipIds.push(membership._id)
          continue
        }

        validMemberships.push(membership)
      }

      // Clean up orphaned memberships (don't await to avoid blocking)
      if (orphanedMembershipIds.length > 0) {
        console.log(
          `Cleaning up ${orphanedMembershipIds.length} orphaned memberships`
        )
        WorkspaceMember.deleteMany({
          _id: { $in: orphanedMembershipIds },
        }).catch(cleanupError =>
          console.error('Error cleaning up orphaned memberships:', cleanupError)
        )
      }

      // Check for name conflicts among valid memberships
      const hasWorkspaceWithName = validMemberships.some(membership => {
        const workspaceName = membership.workspaceId.name.trim().toLowerCase()
        const inputName = name.trim().toLowerCase()
        console.log(
          `Comparing workspace name "${workspaceName}" with input "${inputName}"`
        )

        return workspaceName === inputName
      })

      if (hasWorkspaceWithName) {
        return NextResponse.json(
          { message: 'You already have a workspace with this name' },
          { status: 409 }
        )
      }

      // Use trimmed name for processing
      const trimmedName = name.trim()

      // Generate unique slug
      const baseSlug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '') // Remove leading and trailing dashes

      let slug = baseSlug
      let counter = 1

      while (await Workspace.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      console.log('Generated unique slug:', slug)

      try {
        // Create workspace
        console.log('Creating workspace...')
        const workspace = new Workspace({
          name: trimmedName,
          slug,
          description,
          currency,
          timezone,
          settings: {
            ...(settings || {
              dateFormat: 'MM/DD/YYYY',
              timeFormat: '12h',
              weekStartsOn: 0,
              language: 'en',
            }),
            allowInvitations: true,
            requireEmailVerification: true,
            maxUsers: 5, // Free plan limit
            enableAuditLog: true,
            enableTwoFactor: false,
            sessionTimeout: 480, // 8 hours
          },
          planId: 'free', // Default to free plan
          subscriptionStatus: 'active',
          createdBy: userId,
        })

        await workspace.save()
        console.log('Workspace created successfully')

        // Create or find owner role for the workspace
        console.log('Creating/finding owner role...')
        let ownerRole = await Role.findOne({
          name: 'Owner',
          workspaceId: workspace._id,
        })

        if (!ownerRole) {
          try {
            ownerRole = new Role({
              workspaceId: workspace._id,
              name: 'Owner',
              description: 'Full access to workspace',
              permissions: ['*:*'], // All permissions
              isDefault: true,
            })
            await ownerRole.save()
            console.log('Owner role created successfully')
          } catch (roleError: any) {
            // If duplicate key error, try to find existing role
            if (roleError.code === 11000) {
              console.log('Duplicate key error, finding existing Owner role...')
              ownerRole = await Role.findOne({
                name: 'Owner',
                workspaceId: workspace._id,
              })
              if (!ownerRole) {
                // If still not found, create with a unique name
                const uniqueName = `Owner_${workspace._id.toString().slice(-6)}`
                ownerRole = new Role({
                  workspaceId: workspace._id,
                  name: uniqueName,
                  description: 'Full access to workspace',
                  permissions: ['*:*'], // All permissions
                  isDefault: true,
                })
                await ownerRole.save()
                console.log(
                  `Created owner role with unique name: ${uniqueName}`
                )
              } else {
                console.log('Found existing Owner role after duplicate error')
              }
            } else {
              throw roleError
            }
          }
        } else {
          console.log('Owner role already exists, using existing role')
        }

        // Add user as workspace owner
        const membership = new WorkspaceMember({
          workspaceId: workspace._id,
          userId,
          roleId: ownerRole._id,
          status: 'active',
          joinedAt: new Date(),
        })

        await membership.save()
        console.log('Workspace membership created successfully')

        // Seed default lead statuses and tags for the new workspace
        console.log('Seeding default lead statuses and tags...')
        await seedDefaultLeadStatuses(workspace._id.toString(), userId)
        await seedDefaultTags(workspace._id.toString(), userId)
        console.log('Default data seeded successfully')

        const duration = Date.now() - startTime
        log.performance('Create workspace', duration, {
          userId,
          workspaceId: workspace._id.toString(),
          workspaceName: name,
        })

        // Log business event
        logBusinessEvent(
          'workspace_created',
          userId,
          workspace._id.toString(),
          {
            workspaceName: name,
            planId: 'free',
          }
        )

        // Log user activity
        logUserActivity(userId, 'create_workspace', 'workspace', {
          workspaceId: workspace._id.toString(),
          workspaceName: name,
        })

        // Log activity in the Activity collection for recent activity display
        try {
          await Activity.create({
            workspaceId: workspace._id,
            performedBy: userId,
            activityType: 'created',
            entityType: 'workspace',
            entityId: workspace._id,
            description: `${authResult.user.fullName} created workspace "${name}"`,
            metadata: {
              workspaceName: name,
              slug,
              currency,
              timezone,
              settings,
            },
          })
        } catch (activityError) {
          console.error(
            'Failed to log workspace creation activity:',
            activityError
          )
          // Don't fail the creation if activity logging fails
        }

        log.info('Workspace created successfully', {
          userId,
          workspaceId: workspace._id.toString(),
          workspaceName: name,
          slug,
        })

        return NextResponse.json(
          {
            workspace: {
              id: workspace._id,
              name: workspace.name,
              slug: workspace.slug,
              description: workspace.description,
              currency: workspace.currency,
              timezone: workspace.timezone,
              settings: workspace.settings,
              planId: workspace.planId,
              subscriptionStatus: workspace.subscriptionStatus,
              createdAt: workspace.createdAt,
            },
            role: {
              id: ownerRole._id,
              name: ownerRole.name,
              permissions: ownerRole.permissions,
            },
          },
          { status: 201 }
        )
      } catch (error) {
        console.error('Error during workspace creation:', error)
        throw error
      }
    } catch (error) {
      console.error('=== WORKSPACE CREATION ERROR ===')
      console.error('Error details:', error)
      console.error(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack'
      )

      const duration = Date.now() - startTime
      log.error(`Create workspace failed after ${duration}ms`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      })

      return NextResponse.json(
        {
          message: 'Failed to create workspace',
          error: error instanceof Error ? error.message : 'Unknown error',
          stack:
            process.env.NODE_ENV === 'development'
              ? error instanceof Error
                ? error.stack
                : undefined
              : undefined,
        },
        { status: 500 }
      )
    }
  })
)
