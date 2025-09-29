/**
 * Google Forms Webhook Processor
 *
 * Processes webhook data from Google Forms submissions.
 * Google Forms can send data in various formats depending on the integration method.
 */

import { NextRequest } from 'next/server'
import { WebhookProcessor, ProcessedWebhookData, ProcessedLead } from './index'

export class GoogleFormsProcessor implements WebhookProcessor {
  name = 'Google Forms'

  /**
   * Validate Google Forms webhook data structure
   */
  validate(data: any): boolean {
    // Google Forms via Zapier/Make format
    if (data.form_response || data.formId || data.responseId) {
      return true
    }

    // Google Apps Script format
    if (data.values && Array.isArray(data.values)) {
      return true
    }

    // Direct form submission format
    if (data.timestamp && (data.email || data.name)) {
      return true
    }

    return false
  }

  /**
   * Process Google Forms webhook data
   */
  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    const leads: ProcessedLead[] = []

    try {
      let lead: ProcessedLead | null = null

      // Handle different Google Forms formats
      if (data.form_response) {
        // Zapier/Make format
        lead = this.processZapierFormat(data.form_response)
      } else if (data.values && Array.isArray(data.values)) {
        // Google Apps Script format
        lead = this.processAppsScriptFormat(data)
      } else {
        // Direct submission format
        lead = this.processDirectFormat(data)
      }

      if (lead) {
        leads.push(lead)
      }

      return {
        leads,
        source: 'website',
        provider: 'google-forms',
        metadata: {
          originalData: data,
          processedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to process Google Forms webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Process Zapier/Make format
   */
  private processZapierFormat(formResponse: any): ProcessedLead | null {
    try {
      const lead: ProcessedLead = {
        name: '',
        source: 'website',
        customFields: {},
        tags: ['google-forms'],
      }

      // Map common field names
      const fieldMappings: Record<string, string> = {
        name: 'name',
        full_name: 'name',
        first_name: 'firstName',
        last_name: 'lastName',
        email: 'email',
        email_address: 'email',
        phone: 'phone',
        phone_number: 'phone',
        company: 'company',
        company_name: 'company',
        organization: 'company',
        message: 'notes',
        comments: 'notes',
        additional_info: 'notes',
        budget: 'value',
        estimated_budget: 'value',
      }

      // Process all form fields
      for (const [key, value] of Object.entries(formResponse)) {
        if (!value || value === '') continue

        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '_')
        const mappedField = fieldMappings[normalizedKey]

        if (mappedField) {
          switch (mappedField) {
            case 'name':
              lead.name = String(value)
              break
            case 'firstName':
              lead.name = String(value)
              break
            case 'lastName':
              if (lead.name) {
                lead.name += ` ${value}`
              } else {
                lead.name = String(value)
              }
              break
            case 'email':
              lead.email = String(value)
              break
            case 'phone':
              lead.phone = String(value)
              break
            case 'company':
              lead.company = String(value)
              break
            case 'notes':
              lead.notes = String(value)
              break
            case 'value':
              const numValue = parseFloat(String(value))
              if (!isNaN(numValue)) {
                lead.value = numValue
              }
              break
          }
        } else {
          // Store unmapped fields in customFields
          lead.customFields![normalizedKey] = value
        }
      }

      return this.finalizeLead(lead)
    } catch (error) {
      console.error('Error processing Zapier format:', error)
      return null
    }
  }

  /**
   * Process Google Apps Script format
   */
  private processAppsScriptFormat(data: any): ProcessedLead | null {
    try {
      const lead: ProcessedLead = {
        name: '',
        source: 'website',
        customFields: {},
        tags: ['google-forms'],
      }

      // Assume first row is headers, second row is values
      const headers = data.headers || []
      const values = data.values || []

      for (let i = 0; i < headers.length && i < values.length; i++) {
        const header = String(headers[i]).toLowerCase()
        const value = values[i]

        if (!value || value === '') continue

        if (header.includes('name')) {
          lead.name = String(value)
        } else if (header.includes('email')) {
          lead.email = String(value)
        } else if (header.includes('phone')) {
          lead.phone = String(value)
        } else if (header.includes('company')) {
          lead.company = String(value)
        } else if (header.includes('message') || header.includes('comment')) {
          lead.notes = String(value)
        } else if (header.includes('budget')) {
          const numValue = parseFloat(String(value))
          if (!isNaN(numValue)) {
            lead.value = numValue
          }
        } else {
          lead.customFields![header] = value
        }
      }

      return this.finalizeLead(lead)
    } catch (error) {
      console.error('Error processing Apps Script format:', error)
      return null
    }
  }

  /**
   * Process direct submission format
   */
  private processDirectFormat(data: any): ProcessedLead | null {
    try {
      const lead: ProcessedLead = {
        name: data.name || data.full_name || '',
        email: data.email || data.email_address,
        phone: data.phone || data.phone_number,
        company: data.company || data.company_name || data.organization,
        notes: data.message || data.comments || data.additional_info,
        source: 'website',
        customFields: {},
        tags: ['google-forms'],
      }

      // Handle budget/value
      if (data.budget || data.estimated_budget) {
        const numValue = parseFloat(data.budget || data.estimated_budget)
        if (!isNaN(numValue)) {
          lead.value = numValue
        }
      }

      // Store additional fields
      for (const [key, value] of Object.entries(data)) {
        if (
          ![
            'name',
            'full_name',
            'email',
            'email_address',
            'phone',
            'phone_number',
            'company',
            'company_name',
            'organization',
            'message',
            'comments',
            'additional_info',
            'budget',
            'estimated_budget',
            'timestamp',
          ].includes(key)
        ) {
          lead.customFields![key] = value
        }
      }

      return this.finalizeLead(lead)
    } catch (error) {
      console.error('Error processing direct format:', error)
      return null
    }
  }

  /**
   * Finalize lead data and set priority
   */
  private finalizeLead(lead: ProcessedLead): ProcessedLead | null {
    // Ensure we have at least a name or email
    if (!lead.name && !lead.email) {
      return null
    }

    // If no name but have email, use email as name
    if (!lead.name && lead.email) {
      lead.name = lead.email.split('@')[0]
    }

    // Set priority based on available information
    if (lead.value && lead.value > 5000) {
      lead.priority = 'high'
    } else if (lead.company) {
      lead.priority = 'medium'
    } else {
      lead.priority = 'low'
    }

    return lead
  }
}
