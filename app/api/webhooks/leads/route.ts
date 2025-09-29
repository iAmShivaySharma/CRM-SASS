import { NextRequest, NextResponse } from 'next/server'
import { Lead, Workspace } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const webhookPath = url.pathname
    const webhookId = webhookPath.split('/').pop()

    if (!webhookId) {
      return NextResponse.json(
        { error: 'Invalid webhook URL' },
        { status: 400 }
      )
    }

    const payload = await request.json()

    // Find workspace by webhook ID (you may need to implement webhook endpoint mapping)
    // For now, assuming webhookId maps to workspaceId
    const workspace = await (Workspace as any).findById(webhookId)
    if (!workspace) {
      return NextResponse.json(
        { error: 'Invalid webhook endpoint' },
        { status: 404 }
      )
    }

    // Process lead data from webhook payload
    const leadData = {
      workspaceId: workspace._id,
      name:
        payload.name ||
        `${payload.first_name || ''} ${payload.last_name || ''}`.trim(),
      email: payload.email,
      phone: payload.phone,
      company: payload.company,
      source: payload.source || 'webhook',
      value: payload.value || 0,
      status: payload.status || 'new',
      notes: payload.notes,
      customData: payload.custom_fields || {},
      createdBy: workspace._id, // Use workspace as creator for webhook leads
    }

    // Create the lead
    const lead = await Lead.create(leadData)

    return NextResponse.json({
      success: true,
      lead_id: lead._id,
      message: 'Lead created successfully',
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Handle GET requests to return webhook info
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const webhookPath = url.pathname

  return NextResponse.json({
    message: 'Lead webhook endpoint',
    url: request.url,
    method: 'POST',
    expected_fields: [
      'name or (first_name + last_name)',
      'email',
      'phone (optional)',
      'company (optional)',
      'source (optional)',
      'value (optional)',
      'status (optional)',
      'notes (optional)',
      'custom_fields (optional object)',
    ],
    example: {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      company: 'Acme Corp',
      source: 'website',
      value: 5000,
      status: 'new',
      notes: 'Interested in premium plan',
      custom_fields: {
        utm_source: 'google',
        utm_campaign: 'summer2024',
      },
    },
  })
}
