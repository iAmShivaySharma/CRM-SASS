import { NextRequest } from 'next/server'

// Base interface for all webhook processors
export interface WebhookProcessor {
  name: string
  process(data: any, request: NextRequest): Promise<ProcessedWebhookData>
  validate(data: any): boolean
}

// Standardized lead data structure
export interface ProcessedWebhookData {
  leads: ProcessedLead[]
  source: string
  provider: string
  metadata?: Record<string, any>
}

export interface ProcessedLead {
  name: string
  email?: string
  phone?: string
  company?: string
  source: string
  value?: number
  notes?: string
  customFields?: Record<string, any>
  tags?: string[]
  priority?: 'low' | 'medium' | 'high'
}

// Import all processors
import { FacebookLeadsProcessor } from './facebook'
import { GoogleFormsProcessor } from './google-forms'
import { LinkedInProcessor } from './linkedin'
import { HubSpotProcessor } from './hubspot'
import { ZapierProcessor } from './zapier'
import { SwipePagesProcessor } from './swipepages'
import { GenericProcessor } from './generic'

// Registry of all available processors
export const WEBHOOK_PROCESSORS: Record<string, WebhookProcessor> = {
  facebook: new FacebookLeadsProcessor(),
  'google-forms': new GoogleFormsProcessor(),
  linkedin: new LinkedInProcessor(),
  hubspot: new HubSpotProcessor(),
  zapier: new ZapierProcessor(),
  swipepages: new SwipePagesProcessor(),
  generic: new GenericProcessor(),
}

/**
 * Get the appropriate processor for a webhook type
 */
export function getWebhookProcessor(type: string): WebhookProcessor {
  const processor = WEBHOOK_PROCESSORS[type.toLowerCase()]
  if (!processor) {
    // Fall back to generic processor
    return WEBHOOK_PROCESSORS.generic
  }
  return processor
}

/**
 * Auto-detect webhook type based on request headers and data
 */
export function detectWebhookType(request: NextRequest, data: any): string {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || ''
  const contentType = request.headers.get('content-type')?.toLowerCase() || ''

  // Check for Facebook webhooks
  if (userAgent.includes('facebook') || data.object === 'page' || data.entry) {
    return 'facebook'
  }

  // Check for Google Forms
  if (userAgent.includes('google') || data.form_response || data.formId) {
    return 'google-forms'
  }

  // Check for LinkedIn
  if (
    userAgent.includes('linkedin') ||
    data.leadGenForms ||
    data.sponsoredAccount
  ) {
    return 'linkedin'
  }

  // Check for HubSpot
  if (userAgent.includes('hubspot') || data.subscriptionType || data.portalId) {
    return 'hubspot'
  }

  // Check for Zapier
  if (userAgent.includes('zapier') || request.headers.get('x-zapier-source')) {
    return 'zapier'
  }

  // Check for SwipePages
  if (
    userAgent.includes('swipepages') ||
    request.headers.get('x-swipepages-webhook') ||
    data.form_name ||
    data.landing_page ||
    (data.company && String(data.company).toLowerCase().includes('swipe'))
  ) {
    return 'swipepages'
  }

  // Default to generic
  return 'generic'
}

/**
 * Process webhook data with the appropriate processor
 */
export async function processWebhook(
  type: string,
  data: any,
  request: NextRequest
): Promise<ProcessedWebhookData> {
  const processor = getWebhookProcessor(type)

  // Validate the data first
  if (!processor.validate(data)) {
    throw new Error(`Invalid data format for ${type} webhook`)
  }

  // Process the data
  return await processor.process(data, request)
}

/**
 * Get all available webhook types
 */
export function getAvailableWebhookTypes(): string[] {
  return Object.keys(WEBHOOK_PROCESSORS)
}

/**
 * Get processor information
 */
export function getProcessorInfo(type: string): {
  name: string
  description: string
} {
  const processor = WEBHOOK_PROCESSORS[type.toLowerCase()]
  if (!processor) {
    return { name: 'Unknown', description: 'Unknown processor type' }
  }

  const descriptions: Record<string, string> = {
    facebook:
      'Facebook Lead Ads - Processes leads from Facebook advertising campaigns',
    'google-forms':
      'Google Forms - Processes form submissions from Google Forms',
    linkedin:
      'LinkedIn Lead Gen Forms - Processes leads from LinkedIn advertising',
    hubspot: 'HubSpot - Processes leads and contacts from HubSpot CRM',
    zapier: 'Zapier - Processes leads from Zapier automation workflows',
    generic:
      'Generic - Processes leads from any source with flexible field mapping',
  }

  return {
    name: processor.name,
    description: descriptions[type.toLowerCase()] || 'Custom webhook processor',
  }
}
