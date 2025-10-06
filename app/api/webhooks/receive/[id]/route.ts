import { NextRequest, NextResponse } from 'next/server'
import { Webhook, WebhookLog, Lead, Tag } from '@/lib/mongodb/client'
import { webhookLeadSchema } from '@/lib/security/validation'
import { processWebhook, detectWebhookType } from '@/lib/webhooks/processors'
import { NotificationService } from '@/lib/services/notificationService'
import crypto from 'crypto'

// POST /api/webhooks/receive/[id] - Receive webhook data
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()
  const { id: webhookId } = await params

  let workspaceId = 'unknown'

  try {
    // Find the webhook
    const webhook = await Webhook.findById(webhookId)
    if (!webhook || !webhook.isActive) {
      return NextResponse.json(
        { error: 'Webhook not found or inactive' },
        { status: 404 }
      )
    }

    workspaceId = webhook.workspaceId

    // Get request details
    const method = request.method
    const url = request.url
    const headers = Object.fromEntries(request.headers.entries())
    const userAgent = headers['user-agent'] || ''
    const ipAddress =
      headers['x-forwarded-for'] || headers['x-real-ip'] || 'unknown'

    let body: any
    let rawBody: string = ''

    try {
      rawBody = await request.text()
      body = rawBody ? JSON.parse(rawBody) : {}
    } catch (error) {
      // Log the failed request
      await WebhookLog.create({
        webhookId,
        workspaceId: webhook.workspaceId,
        method,
        url,
        headers,
        body: rawBody,
        processingTime: Date.now() - startTime,
        success: false,
        errorMessage: 'Invalid JSON payload',
        userAgent,
        ipAddress,
      })

      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      )
    }

    // Verify webhook signature if secret is provided in headers
    const signature =
      headers['x-webhook-signature'] || headers['x-hub-signature-256']
    if (signature && webhook.secret) {
      const expectedSignature = crypto
        .createHmac('sha256', webhook.secret)
        .update(rawBody)
        .digest('hex')

      const providedSignature = signature.replace('sha256=', '')

      if (expectedSignature !== providedSignature) {
        await WebhookLog.create({
          webhookId,
          workspaceId: webhook.workspaceId,
          method,
          url,
          headers,
          body,
          processingTime: Date.now() - startTime,
          success: false,
          errorMessage: 'Invalid webhook signature',
          userAgent,
          ipAddress,
        })

        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    // Process the webhook data using the appropriate processor
    let processedData: any

    try {
      // Auto-detect webhook type if not specified or use configured type
      const webhookType =
        webhook.webhookType || detectWebhookType(request, body)

      // Process the webhook data
      processedData = await processWebhook(webhookType, body, request)
    } catch (error) {
      await WebhookLog.create({
        webhookId,
        workspaceId: webhook.workspaceId,
        method,
        url,
        headers,
        body,
        processingTime: Date.now() - startTime,
        success: false,
        errorMessage: `Data transformation failed: ${error instanceof Error ? error.message : String(error)}`,
        userAgent,
        ipAddress,
      })

      return NextResponse.json(
        { error: 'Data transformation failed' },
        { status: 400 }
      )
    }

    // Process all leads from the webhook
    const createdLeads = []
    const errors = []

    for (const leadData of processedData.leads) {
      try {
        // Validate each lead
        const validationResult = webhookLeadSchema.safeParse({
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          company: leadData.company,
          source: leadData.source,
          value: leadData.value,
          custom_fields: leadData.customFields,
        })

        if (!validationResult.success) {
          errors.push({
            leadData: leadData.name || leadData.email,
            error: validationResult.error.errors.map(e => e.message).join(', '),
          })
          continue
        }

        // Create the lead
        const lead = await Lead.create({
          workspaceId: webhook.workspaceId,
          name: validationResult.data.name,
          email: validationResult.data.email,
          phone: validationResult.data.phone,
          company: validationResult.data.company,
          source: validationResult.data.source || processedData.source,
          value: validationResult.data.value || 0,
          status: 'new',
          priority: leadData.priority || 'medium',
          customData: validationResult.data.custom_fields || {},
          createdBy: webhook.createdBy,
          notes:
            leadData.notes ||
            `Created via ${webhook.name} webhook (${processedData.provider})`,
        })

        // Add tags if provided
        if (leadData.tags && leadData.tags.length > 0) {
          // Find or create tags
          const tagIds = []
          for (const tagName of leadData.tags) {
            let tag = await Tag.findOne({
              name: tagName,
              workspaceId: webhook.workspaceId,
            })
            if (!tag) {
              tag = await Tag.create({
                name: tagName,
                color: '#3b82f6',
                workspaceId: webhook.workspaceId,
                createdBy: webhook.createdBy,
              })
            }
            tagIds.push(tag._id)
          }

          // Update lead with tags
          await Lead.findByIdAndUpdate(lead._id, { tagIds })
        }

        createdLeads.push(lead)

        // Create notification for webhook lead creation
        try {
          await NotificationService.createNotification({
            workspaceId: webhook.workspaceId,
            title: 'New Lead via Webhook',
            message: `New lead "${validationResult.data.name}" created via ${webhook.name} webhook from ${processedData.provider || 'external source'}`,
            type: 'success',
            entityType: 'lead',
            entityId: lead._id.toString(),
            notificationLevel: 'team',
            metadata: {
              leadName: validationResult.data.name,
              webhookName: webhook.name,
              provider: processedData.provider,
              source: validationResult.data.source || 'webhook',
              email: validationResult.data.email,
              company: validationResult.data.company,
              value: validationResult.data.value,
            },
          })
        } catch (notificationError) {
          console.error(
            'Failed to create webhook lead notification:',
            notificationError
          )
          // Don't fail webhook processing if notification fails
        }
      } catch (error) {
        errors.push({
          leadData: leadData.name || leadData.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // Update webhook statistics
    const successCount = createdLeads.length
    const errorCount = errors.length

    await Webhook.findByIdAndUpdate(webhookId, {
      $inc: {
        totalRequests: 1,
        successfulRequests: successCount > 0 ? 1 : 0,
      },
      lastTriggered: new Date(),
    })

    // Log webhook processing
    const responseBody = {
      success: successCount > 0,
      created: successCount,
      failed: errorCount,
      leadIds: createdLeads.map(lead => lead._id),
    }

    await WebhookLog.create({
      webhookId,
      workspaceId: webhook.workspaceId,
      method,
      url,
      headers,
      body,
      responseStatus: successCount > 0 ? 200 : 400,
      responseBody,
      processingTime: Date.now() - startTime,
      success: successCount > 0,
      leadId:
        createdLeads.length > 0 ? createdLeads[0]._id.toString() : undefined,
      userAgent,
      ipAddress,
    })

    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} leads successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
      results: {
        created: successCount,
        failed: errorCount,
        leadIds: createdLeads.map(lead => lead._id),
        errors: errors.length > 0 ? errors : undefined,
      },
    })
  } catch (error) {
    console.error('Webhook processing error:', error)

    // Update webhook statistics for failed request
    await Webhook.findByIdAndUpdate(webhookId, {
      $inc: {
        totalRequests: 1,
        failedRequests: 1,
      },
    })

    // Log failed request
    try {
      await WebhookLog.create({
        webhookId,
        workspaceId,
        method: request.method,
        url: request.url,
        headers: Object.fromEntries(request.headers.entries()),
        body: {},
        processingTime: Date.now() - startTime,
        success: false,
        errorMessage:
          error instanceof Error ? error.message : 'Internal server error',
        userAgent: request.headers.get('user-agent') || '',
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      })
    } catch (logError) {
      console.error('Failed to log webhook error:', logError)
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
