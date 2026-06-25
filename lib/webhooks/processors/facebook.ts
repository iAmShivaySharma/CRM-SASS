import { type NextRequest } from 'next/server'
import {
  type WebhookProcessor,
  type ProcessedWebhookData,
  type ProcessedLead,
} from './index'

export class FacebookLeadsProcessor implements WebhookProcessor {
  name = 'Facebook Lead Ads'

  validate(data: any): boolean {
    // Facebook webhook validation
    if (data.object === 'page' && data.entry && Array.isArray(data.entry)) {
      return true
    }

    // Direct lead data format
    if (data.leadgen_id || data.form_id || data.field_data) {
      return true
    }

    return false
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    const leads: ProcessedLead[] = []

    try {
      if (data.object === 'page' && data.entry) {
        for (const entry of data.entry) {
          if (entry.changes) {
            for (const change of entry.changes) {
              if (change.field === 'leadgen' && change.value) {
                const lead = this.processFacebookLead(change.value)
                if (lead) {
                  leads.push(lead)
                }
              }
            }
          }
        }
      } else if (data.leadgen_id || data.form_id || data.field_data) {
        const lead = this.processFacebookLead(data)
        if (lead) {
          leads.push(lead)
        }
      }

      return {
        leads,
        source: 'social_media',
        provider: 'facebook',
        metadata: {
          originalData: data,
          processedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to process Facebook webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private processFacebookLead(leadData: any): ProcessedLead | null {
    try {
      const lead: ProcessedLead = {
        name: '',
        source: 'social_media',
        customFields: {},
        tags: ['facebook-lead'],
      }

      if (leadData.field_data && Array.isArray(leadData.field_data)) {
        for (const field of leadData.field_data) {
          const fieldName = field.name?.toLowerCase()
          const fieldValue = field.values?.[0] || field.value

          if (!fieldValue) continue

          switch (fieldName) {
            case 'full_name':
            case 'name':
            case 'first_name':
              if (!lead.name) {
                lead.name = fieldValue
              } else {
                lead.name += ` ${fieldValue}`
              }
              break

            case 'last_name':
              if (lead.name) {
                lead.name += ` ${fieldValue}`
              } else {
                lead.name = fieldValue
              }
              break

            case 'email':
              lead.email = fieldValue
              break

            case 'phone_number':
            case 'phone':
              lead.phone = fieldValue
              break

            case 'company_name':
            case 'company':
              lead.company = fieldValue
              break

            case 'job_title':
            case 'position':
              lead.customFields!.jobTitle = fieldValue
              break

            case 'city':
              lead.customFields!.city = fieldValue
              break

            case 'state':
              lead.customFields!.state = fieldValue
              break

            case 'country':
              lead.customFields!.country = fieldValue
              break

            case 'budget':
            case 'estimated_budget':
              const budget = parseFloat(fieldValue)
              if (!isNaN(budget)) {
                lead.value = budget
              }
              break

            case 'message':
            case 'comments':
            case 'additional_info':
              lead.notes = fieldValue
              break

            default:
              lead.customFields![fieldName] = fieldValue
              break
          }
        }
      } else {
        if (leadData.name) lead.name = leadData.name
        if (leadData.email) lead.email = leadData.email
        if (leadData.phone) lead.phone = leadData.phone
        if (leadData.company) lead.company = leadData.company
        if (leadData.message) lead.notes = leadData.message
      }

      if (lead.value && lead.value > 10000) {
        lead.priority = 'high'
      } else if (lead.company || lead.customFields?.jobTitle) {
        lead.priority = 'medium'
      } else {
        lead.priority = 'low'
      }

      if (leadData.leadgen_id) {
        lead.customFields!.facebookLeadId = leadData.leadgen_id
      }
      if (leadData.form_id) {
        lead.customFields!.facebookFormId = leadData.form_id
      }
      if (leadData.ad_id) {
        lead.customFields!.facebookAdId = leadData.ad_id
      }
      if (leadData.campaign_id) {
        lead.customFields!.facebookCampaignId = leadData.campaign_id
      }

      if (!lead.name && !lead.email) {
        return null
      }

      if (!lead.name && lead.email) {
        lead.name = lead.email.split('@')[0]
      }

      return lead
    } catch (error) {
      return null
    }
  }
}
