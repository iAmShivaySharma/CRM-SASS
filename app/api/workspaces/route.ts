import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
import {
  seedDefaultLeadStatuses,
  seedDefaultTags,
} from '@/lib/mongodb/seedDefaults'

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

export const GET = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()
    try {
      await connectToMongoDB()
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

      const authResult = await requireAuth(request)
      if (!authResult.success) {
        return authResult.response
      }

      const userId = authResult.user.id

      let memberships = []

      try {
        memberships = await WorkspaceMember.find({
          userId,
          status: 'active',
        })
          .populate('workspaceId')
          .populate('roleId')
      } catch (populateError) {
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
          } catch (fetchError) {}
        }

        memberships = rawMemberships
      }

      const validMemberships = []
      const orphanedMembershipIds = []

      for (const membership of memberships) {
        if (
          !membership.workspaceId ||
          typeof membership.workspaceId === 'string'
        ) {
          orphanedMembershipIds.push(membership._id)
          continue
        }

        if (!membership.workspaceId.name) {
          orphanedMembershipIds.push(membership._id)
          continue
        }

        validMemberships.push(membership)
      }

      if (orphanedMembershipIds.length > 0) {
        WorkspaceMember.deleteMany({
          _id: { $in: orphanedMembershipIds },
        }).catch(() => {})
      }

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

export const POST = withSecurityLogging(
  withLogging(async (request: NextRequest) => {
    const startTime = Date.now()
    try {
      await connectToMongoDB()
      const clientIP = getClientIP(request)
      const rateLimitResult = await rateLimit(clientIP, 'api', {
        windowMs: 60 * 1000,
        maxRequests: 5,
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

      const authResult = await requireAuth(request)
      if (!authResult.success) {
        return authResult.response
      }

      const userId = authResult.user.id

      let body
      try {
        body = await request.json()
      } catch (error) {
        return NextResponse.json(
          { message: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }

      const validation = createWorkspaceSchema.safeParse(body)
      if (!validation.success) {
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

      if (!name || name.trim().length === 0) {
        return NextResponse.json(
          { message: 'Workspace name is required' },
          { status: 400 }
        )
      }

      let existingMemberships = []

      try {
        existingMemberships = await WorkspaceMember.find({
          userId,
          status: 'active',
        }).populate('workspaceId')
      } catch (populateError) {
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
          } catch (workspaceError) {}
        }

        existingMemberships = memberships
      }

      const validMemberships = []
      const orphanedMembershipIds = []

      for (const membership of existingMemberships) {
        if (
          !membership.workspaceId ||
          typeof membership.workspaceId === 'string'
        ) {
          orphanedMembershipIds.push(membership._id)
          continue
        }

        if (!membership.workspaceId.name) {
          orphanedMembershipIds.push(membership._id)
          continue
        }

        validMemberships.push(membership)
      }

      if (orphanedMembershipIds.length > 0) {
        WorkspaceMember.deleteMany({
          _id: { $in: orphanedMembershipIds },
        }).catch(() => {})
      }

      const hasWorkspaceWithName = validMemberships.some(membership => {
        const workspaceName = membership.workspaceId.name.trim().toLowerCase()
        const inputName = name.trim().toLowerCase()

        return workspaceName === inputName
      })

      if (hasWorkspaceWithName) {
        return NextResponse.json(
          { message: 'You already have a workspace with this name' },
          { status: 409 }
        )
      }

      const trimmedName = name.trim()

      const baseSlug = trimmedName
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')

      let slug = baseSlug
      let counter = 1

      while (await Workspace.findOne({ slug })) {
        slug = `${baseSlug}-${counter}`
        counter++
      }

      try {
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
            maxUsers: 5,
            enableAuditLog: true,
            enableTwoFactor: false,
            sessionTimeout: 480,
          },
          planId: 'free',
          subscriptionStatus: 'active',
          createdBy: userId,
        })

        await workspace.save()
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
              permissions: ['*:*'],
              isDefault: true,
            })
            await ownerRole.save()
          } catch (roleError: any) {
            if (roleError.code === 11000) {
              ownerRole = await Role.findOne({
                name: 'Owner',
                workspaceId: workspace._id,
              })
              if (!ownerRole) {
                const uniqueName = `Owner_${workspace._id.toString().slice(-6)}`
                ownerRole = new Role({
                  workspaceId: workspace._id,
                  name: uniqueName,
                  description: 'Full access to workspace',
                  permissions: ['*:*'],
                  isDefault: true,
                })
                await ownerRole.save()
              } else {
              }
            } else {
              throw roleError
            }
          }
        }

        const membership = new WorkspaceMember({
          workspaceId: workspace._id,
          userId,
          roleId: ownerRole._id,
          status: 'active',
          joinedAt: new Date(),
        })

        await membership.save()

        await seedDefaultLeadStatuses(workspace._id.toString(), userId)
        await seedDefaultTags(workspace._id.toString(), userId)

        const duration = Date.now() - startTime
        log.performance('Create workspace', duration, {
          userId,
          workspaceId: workspace._id.toString(),
          workspaceName: name,
        })

        logBusinessEvent(
          'workspace_created',
          userId,
          workspace._id.toString(),
          {
            workspaceName: name,
            planId: 'free',
          }
        )

        logUserActivity(userId, 'create_workspace', 'workspace', {
          workspaceId: workspace._id.toString(),
          workspaceName: name,
        })

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
        } catch (activityError) {}

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
        throw error
      }
    } catch (error) {
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
