import { type NextRequest } from 'next/server'
import {
  type WebhookProcessor,
  type ProcessedWebhookData,
  type ProcessedLead,
} from './index'

export class ZapierProcessor implements WebhookProcessor {
  name = 'Zapier'

  validate(data: any): boolean {
    return true
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
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
