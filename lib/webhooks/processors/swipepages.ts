import { type NextRequest } from 'next/server'
import {
  type WebhookProcessor,
  type ProcessedWebhookData,
  type ProcessedLead,
} from './index'

export class SwipePagesProcessor implements WebhookProcessor {
  name = 'SwipePages'

  private readonly FIELD_MAPPINGS = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    company: 'company',
    first_name: 'firstName',
    last_name: 'lastName',
    full_name: 'name',

    address: 'address',
    city: 'city',
    state: 'state',
    zip: 'zip',
    zipcode: 'zip',
    postal_code: 'zip',
    country: 'country',

    job_title: 'jobTitle',
    role: 'role',
    position: 'position',
    title: 'jobTitle',
    industry: 'industry',
    website: 'website',

    budget: 'budget',
    timeline: 'timeline',
    interest: 'interest',
    message: 'message',
    comments: 'comments',
    notes: 'notes',

    utm_source: 'utmSource',
    utm_medium: 'utmMedium',
    utm_campaign: 'utmCampaign',
    utm_term: 'utmTerm',
    utm_content: 'utmContent',
    source: 'leadSource',
    referrer: 'referrer',
    landing_page: 'landingPage',
    form_name: 'formName',
    page_url: 'pageUrl',

    preferred_contact: 'preferredContact',
    best_time_to_call: 'bestTimeToCall',
    contact_method: 'contactMethod',
  }

  validate(data: any): boolean {
    return (
      data && (data.email || data.name || data.first_name || data.last_name)
    )
  }

  async process(
    data: any,
    request: NextRequest
  ): Promise<ProcessedWebhookData> {
    let leadName = ''
    if (data.name) {
      leadName = data.name
    } else if (data.full_name) {
      leadName = data.full_name
    } else if (data.first_name || data.last_name) {
      leadName = [data.first_name, data.last_name].filter(Boolean).join(' ')
    } else {
      leadName = 'Unknown Lead'
    }

    const customFields: Record<string, any> = {}
    const processedData: any = {
      name: leadName,
      source: 'website',
    }

    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined || value === '') {
        continue
      }

      const mappedField =
        this.FIELD_MAPPINGS[
          key.toLowerCase() as keyof typeof this.FIELD_MAPPINGS
        ]

      if (mappedField) {
        // Handle special cases for mapped fields
        switch (mappedField) {
          case 'name':
            break
          case 'email':
            processedData.email = String(value).toLowerCase().trim()
            break
          case 'phone':
            processedData.phone = String(value).trim()
            break
          case 'company':
            processedData.company = String(value).trim()
            break
          default:
            customFields[mappedField] = value
        }
      } else {
        customFields[key] = value
      }
    }

    const noteFields = [
      'message',
      'comments',
      'notes',
      'additional_info',
      'description',
    ]
    const notes = noteFields
      .map(field => data[field])
      .filter(Boolean)
      .join('\n\n')

    if (notes) {
      processedData.notes = notes
    }

    if (data.budget) {
      const budgetStr = String(data.budget).toLowerCase()
      let value = 0

      const numericMatch = budgetStr.match(/[\d,]+/)
      if (numericMatch) {
        value = parseInt(numericMatch[0].replace(/,/g, ''), 10)
      } else {
        const budgetMappings: Record<string, number> = {
          'under 1k': 500,
          'under 5k': 2500,
          '1k-5k': 3000,
          '5k-10k': 7500,
          '10k-25k': 17500,
          '25k-50k': 37500,
          '50k-100k': 75000,
          '100k+': 150000,
          enterprise: 250000,
        }

        for (const [range, estimatedValue] of Object.entries(budgetMappings)) {
          if (budgetStr.includes(range)) {
            value = estimatedValue
            break
          }
        }
      }

      if (value > 0) {
        processedData.value = value
      }
    }

    if (data.utm_source) {
      processedData.source = String(data.utm_source).toLowerCase()
    } else if (data.source) {
      processedData.source = String(data.source).toLowerCase()
    } else if (data.referrer && data.referrer !== 'direct') {
      processedData.source = 'referral'
    }

    const tags = ['swipepages']

    if (data.form_name) {
      tags.push(
        `form-${String(data.form_name).toLowerCase().replace(/\s+/g, '-')}`
      )
    }

    if (data.utm_campaign) {
      tags.push(
        `campaign-${String(data.utm_campaign).toLowerCase().replace(/\s+/g, '-')}`
      )
    }

    const lead: ProcessedLead = {
      ...processedData,
      tags,
      customFields,
    }

    return {
      leads: [lead],
      source: processedData.source || 'website',
      provider: 'swipepages',
      metadata: {
        originalData: data,
        formName: data.form_name,
        landingPage: data.landing_page || data.page_url,
        utmParams: {
          source: data.utm_source,
          medium: data.utm_medium,
          campaign: data.utm_campaign,
          term: data.utm_term,
          content: data.utm_content,
        },
      },
    }
  }
}
