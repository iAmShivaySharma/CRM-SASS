import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Webhook, WorkspaceMember, WebhookLog } from '@/lib/mongodb/client'
import { updateWebhookSchema } from '@/lib/security/validation'
import {
  withLogging,
  withSecurityLogging,
  logUserActivity,
  logBusinessEvent,
} from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'

// GET /api/webhooks/[id] - Get webhook details
export const GET = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const startTime = Date.now()

      try {
        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id: webhookId } = await params

        // Find webhook
        const webhook = await Webhook.findById(webhookId)
        if (!webhook) {
          return NextResponse.json(
            { message: 'Webhook not found' },
            { status: 404 }
          )
        }

        // Verify user has access to this workspace
        const membership = await WorkspaceMember.findOne({
          workspaceId: webhook.workspaceId,
          userId: auth.user.id,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Get recent webhook logs
        const recentLogs = await WebhookLog.find({ webhookId })
          .sort({ createdAt: -1 })
          .limit(10)

        logBusinessEvent('webhook_viewed', auth.user.id, webhook.workspaceId, {
          webhookId,
          duration: Date.now() - startTime,
        })

        // Get the base URL from request headers or environment
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`

        return NextResponse.json({
          success: true,
          webhook: {
            ...webhook.toJSON(),
            webhookUrl: `${baseUrl}/api/webhooks/receive/${webhook._id}`,
            recentLogs,
          },
        })
      } catch (error) {
        log.error('Get webhook error:', error)
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

// PUT /api/webhooks/[id] - Update webhook
export const PUT = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const startTime = Date.now()

      try {
        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id: webhookId } = await params
        const body = await request.json()

        // Validate request body
        const validationResult = updateWebhookSchema.safeParse(body)
        if (!validationResult.success) {
          return NextResponse.json(
            {
              message: 'Validation failed',
              errors: validationResult.error.errors,
            },
            { status: 400 }
          )
        }

        // Find webhook
        const webhook = await Webhook.findById(webhookId)
        if (!webhook) {
          return NextResponse.json(
            { message: 'Webhook not found' },
            { status: 404 }
          )
        }

        // Verify user has access to this workspace and can update webhooks
        const membership = await WorkspaceMember.findOne({
          workspaceId: webhook.workspaceId,
          userId: auth.user.id,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Check if user has permission to update webhooks (Admin or Owner)
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

        // Update webhook
        const updatedWebhook = await Webhook.findByIdAndUpdate(
          webhookId,
          {
            ...validationResult.data,
            updatedAt: new Date(),
          },
          { new: true }
        )

        // Log activity
        logUserActivity(auth.user.id, 'webhook_updated', 'webhook', {
          webhookId,
          webhookName: updatedWebhook.name,
          workspaceId: webhook.workspaceId,
          changes: Object.keys(validationResult.data),
        })

        logBusinessEvent('webhook_updated', auth.user.id, webhook.workspaceId, {
          webhookId,
          changes: validationResult.data,
          duration: Date.now() - startTime,
        })

        // Get the base URL from request headers or environment
        const baseUrl =
          process.env.NEXT_PUBLIC_APP_URL ||
          `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}`

        return NextResponse.json({
          success: true,
          message: 'Webhook updated successfully',
          webhook: {
            ...updatedWebhook.toJSON(),
            webhookUrl: `${baseUrl}/api/webhooks/receive/${updatedWebhook._id}`,
          },
        })
      } catch (error) {
        log.error('Update webhook error:', error)
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

// DELETE /api/webhooks/[id] - Delete webhook
export const DELETE = withSecurityLogging(
  withLogging(
    async (
      request: NextRequest,
      { params }: { params: Promise<{ id: string }> }
    ) => {
      const startTime = Date.now()

      try {
        const auth = await verifyAuthToken(request)
        if (!auth) {
          return NextResponse.json(
            { message: 'Authentication required' },
            { status: 401 }
          )
        }

        const { id: webhookId } = await params

        // Find webhook
        const webhook = await Webhook.findById(webhookId)
        if (!webhook) {
          return NextResponse.json(
            { message: 'Webhook not found' },
            { status: 404 }
          )
        }

        // Verify user has access to this workspace and can delete webhooks
        const membership = await WorkspaceMember.findOne({
          workspaceId: webhook.workspaceId,
          userId: auth.user.id,
          status: 'active',
        }).populate('roleId')

        if (!membership) {
          return NextResponse.json(
            { message: 'Access denied' },
            { status: 403 }
          )
        }

        // Check if user has permission to delete webhooks (Admin or Owner)
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

        // Delete webhook
        await Webhook.findByIdAndDelete(webhookId)

        // Log activity
        logUserActivity(auth.user.id, 'webhook_deleted', 'webhook', {
          webhookId,
          webhookName: webhook.name,
          workspaceId: webhook.workspaceId,
        })

        logBusinessEvent('webhook_deleted', auth.user.id, webhook.workspaceId, {
          webhookId,
          webhookName: webhook.name,
          duration: Date.now() - startTime,
        })

        return NextResponse.json({
          success: true,
          message: 'Webhook deleted successfully',
        })
      } catch (error) {
        log.error('Delete webhook error:', error)
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
