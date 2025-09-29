/**
 * Facebook Lead Ads Webhook Processor
 *
 * Processes webhook data from Facebook Lead Ads.
 * Facebook sends lead data in a specific format that needs to be transformed.
 */

import { NextRequest } from 'next/server'
import { WebhookProcessor, ProcessedWebhookData, ProcessedLead } from './index'

export class FacebookLeadsProcessor implements WebhookProcessor {
  name = 'Facebook Lead Ads'

  /**
   * Validate Facebook webhook data structure
   */
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

  /**
   * Process Facebook webhook data
   */
  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    const leads: ProcessedLead[] = []

    try {
      // Handle Facebook webhook format
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
      }
      // Handle direct lead data format
      else if (data.leadgen_id || data.form_id || data.field_data) {
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

  /**
   * Process individual Facebook lead
   */
  private processFacebookLead(leadData: any): ProcessedLead | null {
    try {
      const lead: ProcessedLead = {
        name: '',
        source: 'social_media',
        customFields: {},
        tags: ['facebook-lead'],
      }

      // Process field_data array (Facebook's format)
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
              // Store unknown fields in customFields
              lead.customFields![fieldName] = fieldValue
              break
          }
        }
      }

      // Handle direct field format
      else {
        if (leadData.name) lead.name = leadData.name
        if (leadData.email) lead.email = leadData.email
        if (leadData.phone) lead.phone = leadData.phone
        if (leadData.company) lead.company = leadData.company
        if (leadData.message) lead.notes = leadData.message
      }

      // Set priority based on available information
      if (lead.value && lead.value > 10000) {
        lead.priority = 'high'
      } else if (lead.company || lead.customFields?.jobTitle) {
        lead.priority = 'medium'
      } else {
        lead.priority = 'low'
      }

      // Add Facebook-specific metadata
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

      // Ensure we have at least a name or email
      if (!lead.name && !lead.email) {
        return null
      }

      // If no name but have email, use email as name
      if (!lead.name && lead.email) {
        lead.name = lead.email.split('@')[0]
      }

      return lead
    } catch (error) {
      console.error('Error processing Facebook lead:', error)
      return null
    }
  }
}
