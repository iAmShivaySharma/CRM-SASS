import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Webhook {
  id: string
  workspaceId: string
  name: string
  description?: string
  url: string
  webhookUrl?: string
  isActive: boolean
  webhookType:
    | 'facebook_leads'
    | 'google_forms'
    | 'zapier'
    | 'custom'
    | 'mailchimp'
    | 'hubspot'
    | 'salesforce'
    | 'swipepages'
  events: string[]
  headers?: Record<string, string>
  transformationRules?: Record<string, any>
  retryConfig?: {
    maxRetries: number
    retryDelay: number
  }
  lastTriggered?: string
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  createdBy: string
  createdAt: string
  updatedAt: string
  recentLogs?: WebhookLog[]
  secret?: string // Only included in creation response
}

export interface WebhookLog {
  id: string
  webhookId: string
  workspaceId: string
  requestId: string
  method: string
  url: string
  headers: Record<string, string>
  body: any
  responseStatus?: number
  responseBody?: any
  responseHeaders?: Record<string, string>
  processingTime: number
  success: boolean
  errorMessage?: string
  leadId?: string
  retryAttempt: number
  userAgent?: string
  ipAddress?: string
  createdAt: string
}

export interface CreateWebhookRequest {
  workspaceId: string
  name: string
  description?: string
  webhookType:
    | 'facebook_leads'
    | 'google_forms'
    | 'zapier'
    | 'custom'
    | 'mailchimp'
    | 'hubspot'
    | 'salesforce'
    | 'swipepages'
  events: string[]
  headers?: Record<string, string>
  transformationRules?: Record<string, any>
  retryConfig?: {
    maxRetries: number
    retryDelay: number
  }
}

export interface UpdateWebhookRequest {
  id: string
  name?: string
  description?: string
  webhookType?:
    | 'facebook_leads'
    | 'google_forms'
    | 'zapier'
    | 'custom'
    | 'mailchimp'
    | 'hubspot'
    | 'salesforce'
    | 'swipepages'
  events?: string[]
  headers?: Record<string, string>
  transformationRules?: Record<string, any>
  retryConfig?: {
    maxRetries: number
    retryDelay: number
  }
  isActive?: boolean
}

export interface WebhookResponse {
  success: boolean
  webhook?: Webhook
  webhooks?: Webhook[]
  message?: string
}

export const webhookApi = createApi({
  reducerPath: 'webhookApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/webhooks',
    credentials: 'include', // Use HTTP-only cookies for authentication
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Webhook', 'WebhookLog'],
  endpoints: builder => ({
    getWebhooks: builder.query<WebhookResponse, string>({
      query: workspaceId => `?workspaceId=${workspaceId}`,
      providesTags: ['Webhook'],
    }),
    getWebhook: builder.query<WebhookResponse, string>({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Webhook', id }],
    }),
    createWebhook: builder.mutation<WebhookResponse, CreateWebhookRequest>({
      query: webhook => ({
        url: '',
        method: 'POST',
        body: webhook,
      }),
      invalidatesTags: ['Webhook'],
    }),
    updateWebhook: builder.mutation<WebhookResponse, UpdateWebhookRequest>({
      query: ({ id, ...patch }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Webhook', id }],
    }),
    deleteWebhook: builder.mutation<WebhookResponse, string>({
      query: id => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Webhook'],
    }),
    toggleWebhook: builder.mutation<
      WebhookResponse,
      { id: string; isActive: boolean }
    >({
      query: ({ id, isActive }) => ({
        url: `/${id}`,
        method: 'PUT',
        body: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Webhook', id }],
    }),
  }),
})

export const {
  useGetWebhooksQuery,
  useGetWebhookQuery,
  useCreateWebhookMutation,
  useUpdateWebhookMutation,
  useDeleteWebhookMutation,
  useToggleWebhookMutation,
} = webhookApi

// Webhook type configurations
export const webhookTypeConfigs = {
  facebook_leads: {
    name: 'Facebook Lead Ads',
    description: 'Receive leads from Facebook Lead Ads campaigns',
    icon: '📘',
    fields: [
      'first_name',
      'last_name',
      'email',
      'phone_number',
      'company_name',
    ],
    events: ['lead.created'],
    documentation:
      'https://developers.facebook.com/docs/marketing-api/guides/lead-ads',
  },
  google_forms: {
    name: 'Google Forms',
    description: 'Receive form submissions from Google Forms',
    icon: '📝',
    fields: ['name', 'email', 'phone', 'company'],
    events: ['lead.created'],
    documentation: 'https://developers.google.com/forms/api',
  },
  zapier: {
    name: 'Zapier',
    description: 'Connect with 5000+ apps through Zapier',
    icon: '⚡',
    fields: ['name', 'email', 'phone', 'company', 'value'],
    events: ['lead.created', 'lead.updated'],
    documentation: 'https://zapier.com/apps/webhook/integrations',
  },
  mailchimp: {
    name: 'Mailchimp',
    description: 'Sync subscribers from Mailchimp lists',
    icon: '🐵',
    fields: ['email_address', 'merge_fields'],
    events: ['lead.created', 'contact.created'],
    documentation:
      'https://mailchimp.com/developer/marketing/api/list-members/',
  },
  hubspot: {
    name: 'HubSpot',
    description: 'Sync contacts and leads from HubSpot',
    icon: '🧡',
    fields: ['firstname', 'lastname', 'email', 'phone', 'company'],
    events: ['lead.created', 'contact.created', 'contact.updated'],
    documentation: 'https://developers.hubspot.com/docs/api/crm/contacts',
  },
  salesforce: {
    name: 'Salesforce',
    description: 'Sync leads and contacts from Salesforce',
    icon: '☁️',
    fields: ['FirstName', 'LastName', 'Email', 'Phone', 'Company'],
    events: ['lead.created', 'lead.updated'],
    documentation:
      'https://developer.salesforce.com/docs/atlas.en-us.api_rest.meta/api_rest/',
  },
  swipepages: {
    name: 'SwipePages',
    description: 'Receive leads from SwipePages landing page forms',
    icon: '📄',
    fields: [
      'name',
      'email',
      'phone',
      'company',
      'city',
      'role',
      'budget',
      'utm_source',
      'utm_campaign',
      'form_name',
    ],
    events: ['lead.created'],
    documentation: '/docs/webhooks/swipepages',
  },
  custom: {
    name: 'Custom Webhook',
    description: 'Create a custom webhook for any service',
    icon: '🔧',
    fields: ['name', 'email', 'phone', 'company', 'value', 'custom_fields'],
    events: ['lead.created', 'lead.updated', 'contact.created'],
    documentation: '/docs/webhooks/custom',
  },
}

export const availableEvents = [
  {
    value: 'lead.created',
    label: 'Lead Created',
    description: 'Triggered when a new lead is created',
  },
  {
    value: 'lead.updated',
    label: 'Lead Updated',
    description: 'Triggered when a lead is updated',
  },
  {
    value: 'lead.deleted',
    label: 'Lead Deleted',
    description: 'Triggered when a lead is deleted',
  },
  {
    value: 'contact.created',
    label: 'Contact Created',
    description: 'Triggered when a new contact is created',
  },
  {
    value: 'contact.updated',
    label: 'Contact Updated',
    description: 'Triggered when a contact is updated',
  },
]
