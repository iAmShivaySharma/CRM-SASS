/**
 * Zapier Webhook Processor
 */

import { NextRequest } from 'next/server'
import { WebhookProcessor, ProcessedWebhookData, ProcessedLead } from './index'

export class ZapierProcessor implements WebhookProcessor {
  name = 'Zapier'

  validate(data: any): boolean {
    return true // Zapier can send any format
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    // Zapier-specific processing logic would go here
    const lead: ProcessedLead = {
      name:
        data.name || data.full_name || data.first_name + ' ' + data.last_name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      source: 'other',
      tags: ['zapier-lead'],
      customFields: data.custom_fields || {},
    }

    return {
      leads: [lead],
      source: 'other',
      provider: 'zapier',
      metadata: { originalData: data },
    }
  }
}
