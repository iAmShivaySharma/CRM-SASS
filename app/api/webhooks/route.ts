import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Webhook, WorkspaceMember } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { createWebhookSchema } from '@/lib/security/validation'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import crypto from 'crypto'

// GET /api/webhooks - Get webhooks for a workspace
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

        const { searchParams } = new URL(request.url)
        const workspaceId = searchParams.get('workspaceId')

        if (!workspaceId) {
          return NextResponse.json(
            { message: 'Workspace ID is required' },
            { status: 400 }
          )
        }

        // Verify user has access to this workspace
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Get webhooks for the workspace
        const webhooks = await Webhook.find({ workspaceId }).sort({
          createdAt: -1,
        })

        logBusinessEvent('webhooks_listed', auth.user.id, workspaceId, {
          count: webhooks.length,
          duration: Date.now() - startTime,
        })

        // Get the base URL from request headers or environment
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`

        return NextResponse.json({
          success: true,
          webhooks: webhooks.map(webhook => ({
            ...webhook.toJSON(),
            // Include the webhook URL for display
            webhookUrl: `${baseUrl}/api/webhooks/receive/${webhook._id}`,
          })),
        })
      } catch (error) {
        log.error('Get webhooks error:', error)
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

// POST /api/webhooks - Create a new webhook
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

        // Validate request body
        const validationResult = createWebhookSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        const {
          workspaceId,
          name,
          description,
          webhookType,
          events,
          headers,
          transformationRules,
          retryConfig,
        } = validationResult.data

        // Verify user has access to this workspace and can create webhooks
        const membership = await WorkspaceMember.findOne({
          workspaceId,
          userId: auth.user.id,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Check if user has permission to create webhooks (Admin or Owner)
        const roleName = membership.roleId?.name
        if (!['Owner', 'Admin'].includes(roleName)) {
          return NextResponse.json(
            {
              message:
                'Insufficient permissions. Admin or Owner role required.',
            },
            { status: 403 }
          )
        }

        // Generate unique webhook URL and secret
        const webhookId = new (require('mongoose').Types.ObjectId)()
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`
        const webhookUrl = `${baseUrl}/api/webhooks/receive/${webhookId}`
        const secret = crypto.randomBytes(32).toString('hex')

        // Create webhook
        const webhook = await Webhook.create({
          _id: webhookId,
          workspaceId,
          name,
          description,
          url: webhookUrl,
          secret,
          webhookType,
          events,
          headers: headers || {},
          transformationRules: transformationRules || {},
          retryConfig: retryConfig || { maxRetries: 3, retryDelay: 1000 },
          createdBy: auth.user.id,
        })

        // Log activity
        logUserActivity(auth.user.id, 'webhook_created', 'webhook', {
          webhookId: webhook._id,
          webhookName: name,
          webhookType,
          workspaceId,
        })

        logBusinessEvent('webhook_created', auth.user.id, workspaceId, {
          webhookType,
          events,
          duration: Date.now() - startTime,
        })

        return NextResponse.json(
          {
            success: true,
            message: 'Webhook created successfully',
            webhook: {
              ...webhook.toJSON(),
              webhookUrl,
              secret, // Include secret only in creation response
            },
          },
          { status: 201 }
        )
      } catch (error) {
        log.error('Create webhook error:', error)
        return NextResponse.json(
          { message: 'Internal server error' },
          { status: 500 }
        )
      }
    },
    {
      logBody: true,
      logHeaders: true,
      sensitiveFields: ['secret'],
    }
  )
)
