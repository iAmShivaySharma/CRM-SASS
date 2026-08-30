import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface SmsTemplate {
  _id: string
  workspaceId: string
  name: string
  content: string
  variables?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface SmsLog {
  _id: string
  workspaceId: string
  templateId?: string
  to: string
  message: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  provider?: string
  providerMessageId?: string
  error?: string
  sentAt?: string
  createdAt: string
  updatedAt: string
}

export interface SmsTemplatesResponse {
  success: boolean
  templates: SmsTemplate[]
}

export interface SmsLogsResponse {
  success: boolean
  logs: SmsLog[]
}

export interface SendSmsBody {
  workspaceId: string
  to: string
  message: string
  templateId?: string
}

export interface SendBulkSmsBody {
  workspaceId: string
  recipients: string[]
  message: string
  templateId?: string
}

export const smsApi = createApi({
  reducerPath: 'smsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['SmsTemplate', 'SmsLog'],
  endpoints: builder => ({
    getTemplates: builder.query<SmsTemplatesResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/sms/templates?workspaceId=${workspaceId}`,
      providesTags: ['SmsTemplate'],
    }),
    createTemplate: builder.mutation<{ success: boolean; template: SmsTemplate }, Partial<SmsTemplate> & { workspaceId: string }>({
      query: body => ({
        url: 'api/sms/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SmsTemplate'],
    }),
    updateTemplate: builder.mutation<{ success: boolean; template: SmsTemplate }, { id: string } & Partial<SmsTemplate>>({
      query: ({ id, ...body }) => ({
        url: `api/sms/templates/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['SmsTemplate'],
    }),
    deleteTemplate: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/sms/templates/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SmsTemplate'],
    }),
    sendSms: builder.mutation<{ success: boolean; log: SmsLog }, SendSmsBody>({
      query: body => ({
        url: 'api/sms/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SmsLog'],
    }),
    sendBulkSms: builder.mutation<{ success: boolean; count: number }, SendBulkSmsBody>({
      query: body => ({
        url: 'api/sms/bulk',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SmsLog'],
    }),
    getSmsLogs: builder.query<SmsLogsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/sms/logs?workspaceId=${workspaceId}`,
      providesTags: ['SmsLog'],
    }),
  }),
})

export const {
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  useSendSmsMutation,
  useSendBulkSmsMutation,
  useGetSmsLogsQuery,
} = smsApi
