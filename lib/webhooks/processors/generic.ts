import { type NextRequest } from 'next/server'
import {
  type WebhookProcessor,
  type ProcessedWebhookData,
  type ProcessedLead,
} from './index'

export class GenericProcessor implements WebhookProcessor {
  name = 'Generic Webhook'

  validate(data: any): boolean {
    // Accept any object with at least one property
    return (
      typeof data === 'object' && data !== null && Object.keys(data).length > 0
    )
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    const leads: ProcessedLead[] = []

    try {
      if (Array.isArray(data)) {
        for (const item of data) {
          const lead = this.processGenericLead(item)
          if (lead) {
            leads.push(lead)
          }
        }
      } else if (typeof data === 'object') {
        const lead = this.processGenericLead(data)
        if (lead) {
          leads.push(lead)
        }
      }

      return {
        leads,
        source: 'other',
        provider: 'generic',
        metadata: {
          originalData: data,
          processedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      throw new Error(
        `Failed to process generic webhook: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  private processGenericLead(data: any): ProcessedLead | null {
    try {
      const lead: ProcessedLead = {
        name: '',
        source: 'other',
        customFields: {},
        tags: ['webhook'],
      }

      const fieldMappings = this.getFieldMappings()

      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined || value === '') continue

        const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, '')
        const mappedField = this.findMappedField(normalizedKey, fieldMappings)

        if (mappedField) {
          this.setLeadField(lead, mappedField, value)
        } else {
          lead.customFields![key] = value
        }
      }

      return this.finalizeLead(lead)
    } catch (error) {
      return null
    }
  }

  private getFieldMappings(): Record<string, string[]> {
    return {
      name: [
        'name',
        'fullname',
        'full_name',
        'firstname',
        'first_name',
        'lastname',
        'last_name',
        'contact_name',
        'lead_name',
        'contactname',
        'person',
        'personname',
      ],
      email: [
        'email',
        'emailaddress',
        'email_address',
        'mail',
        'e_mail',
        'contact_email',
        'workemail',
        'personalemail',
      ],
      phone: [
        'phone',
        'phonenumber',
        'phone_number',
        'mobile',
        'telephone',
        'tel',
        'contact_phone',
        'cell',
        'whatsapp',
      ],
      company: [
        'company',
        'companyname',
        'company_name',
        'organization',
        'org',
        'business',
        'employer',
        'firm',
      ],
      notes: [
        'notes',
        'message',
        'comments',
        'description',
        'details',
        'additional_info',
        'remarks',
      ],
      value: [
        'value',
        'amount',
        'budget',
        'price',
        'cost',
        'deal_value',
        'estimated_value',
        'revenue',
      ],
      source: [
        'source',
        'lead_source',
        'origin',
        'channel',
        'medium',
        'campaign',
      ],
    }
  }

  private findMappedField(
    normalizedKey: string,
    mappings: Record<string, string[]>
  ): string | null {
    for (const [field, variations] of Object.entries(mappings)) {
      if (
        variations.some(variation =>
          normalizedKey.includes(variation.replace(/[^a-z0-9]/g, ''))
        )
      ) {
        return field
      }
    }
    return null
  }

  private setLeadField(lead: ProcessedLead, field: string, value: any): void {
    switch (field) {
      case 'name':
        if (lead.name) {
          lead.name += ` ${String(value)}`
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
        if (lead.notes) {
          lead.notes += `\n${String(value)}`
        } else {
          lead.notes = String(value)
        }
        break

      case 'value':
        const numValue = parseFloat(String(value))
        if (!isNaN(numValue)) {
          lead.value = numValue
        }
        break

      case 'source':
        const sourceValue = String(value).toLowerCase()
        if (
          [
            'manual',
            'website',
            'referral',
            'social',
            'social_media',
            'email',
            'phone',
            'other',
          ].includes(sourceValue)
        ) {
          lead.source = sourceValue as any
        } else {
          lead.source = 'other'
          lead.customFields!.original_source = value
        }
        break
    }
  }

  private finalizeLead(lead: ProcessedLead): ProcessedLead | null {
    if (!lead.name && lead.email) {
      lead.name = lead.email.split('@')[0]
    }

    if (!lead.name && lead.company) {
      lead.name = lead.company
    }

    if (!lead.name && lead.customFields) {
      const fallback = Object.values(lead.customFields).find(
        v => typeof v === 'string' && v.trim().length > 0
      )
      if (fallback) {
        lead.name = String(fallback)
      }
    }

    if (!lead.name) {
      lead.name = 'Unnamed Lead'
    }

    if (lead.name) {
      lead.name = lead.name.trim().replace(/\s+/g, ' ')
    }

    if (lead.value && lead.value > 10000) {
      lead.priority = 'high'
    } else if (lead.company || (lead.value && lead.value > 1000)) {
      lead.priority = 'medium'
    } else {
      lead.priority = 'low'
    }

    if (!lead.tags || lead.tags.length === 0) {
      lead.tags = ['webhook']
    }

    return lead
  }
}
