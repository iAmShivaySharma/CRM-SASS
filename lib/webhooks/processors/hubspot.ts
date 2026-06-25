import { type NextRequest } from 'next/server'
import {
  type WebhookProcessor,
  type ProcessedWebhookData,
  type ProcessedLead,
} from './index'

export class HubSpotProcessor implements WebhookProcessor {
  name = 'HubSpot'

  validate(data: any): boolean {
    return data.subscriptionType || data.portalId || data.objectId
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    const lead: ProcessedLead = {
      name: data.properties?.firstname + ' ' + data.properties?.lastname,
      email: data.properties?.email,
      phone: data.properties?.phone,
      company: data.properties?.company,
      source: 'website',
      tags: ['hubspot-lead'],
      customFields: {
        hubspotId: data.objectId,
        dealStage: data.properties?.dealstage,
      },
    }

    return {
      leads: [lead],
      source: 'website',
      provider: 'hubspot',
      metadata: { originalData: data },
    }
  }
}
