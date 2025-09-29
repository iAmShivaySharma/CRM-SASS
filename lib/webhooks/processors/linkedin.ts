/**
 * LinkedIn Lead Gen Forms Webhook Processor
 */

import { NextRequest } from 'next/server'
import { WebhookProcessor, ProcessedWebhookData, ProcessedLead } from './index'

export class LinkedInProcessor implements WebhookProcessor {
  name = 'LinkedIn Lead Gen Forms'

  validate(data: any): boolean {
    return data.leadGenForms || data.sponsoredAccount || data.formResponse
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    // LinkedIn-specific processing logic would go here
    const lead: ProcessedLead = {
      name: data.firstName + ' ' + data.lastName,
      email: data.emailAddress,
      phone: data.phoneNumber,
      company: data.companyName,
      source: 'social_media',
      tags: ['linkedin-lead'],
      customFields: {
        linkedinId: data.id,
        jobTitle: data.jobTitle,
      },
    }

    return {
      leads: [lead],
      source: 'social_media',
      provider: 'linkedin',
      metadata: { originalData: data },
    }
  }
}
