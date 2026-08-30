import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface WhatsAppAccount {
  _id: string
  workspaceId: string
  name: string
  phoneNumber: string
  phoneNumberId: string
  accessToken: string
  businessAccountId?: string
  webhookVerifyToken?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WhatsAppTemplate {
  _id: string
  workspaceId: string
  accountId: string
  name: string
  category: string
  language: string
  status: string
  components: object[]
  createdAt: string
  updatedAt: string
}

export interface WhatsAppConversation {
  _id: string
  workspaceId: string
  accountId: string
  contactPhone: string
  contactName?: string
  lastMessage?: string
  lastMessageAt?: string
  status: 'open' | 'closed' | 'pending'
  createdAt: string
  updatedAt: string
}

export interface AccountsResponse {
  success: boolean
  accounts: WhatsAppAccount[]
}

export interface TemplatesResponse {
  success: boolean
  templates: WhatsAppTemplate[]
}

export interface ConversationsResponse {
  success: boolean
  conversations: WhatsAppConversation[]
}

export interface SendMessageBody {
  workspaceId: string
  accountId: string
  to: string
  message: string
}

export interface SendTemplateBody {
  workspaceId: string
  accountId: string
  to: string
  templateName: string
  language: string
  components?: object[]
}

export interface BroadcastBody {
  workspaceId: string
  accountId: string
  recipients: string[]
  templateName: string
  language: string
  components?: object[]
}

export const whatsappApi = createApi({
  reducerPath: 'whatsappApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['WhatsAppAccount', 'WhatsAppTemplate', 'WhatsAppConversation'],
  endpoints: builder => ({
    getAccounts: builder.query<AccountsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/whatsapp/accounts?workspaceId=${workspaceId}`,
      providesTags: ['WhatsAppAccount'],
    }),
    createAccount: builder.mutation<{ success: boolean; account: WhatsAppAccount }, Partial<WhatsAppAccount> & { workspaceId: string }>({
      query: body => ({
        url: 'api/whatsapp/accounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    updateAccount: builder.mutation<{ success: boolean; account: WhatsAppAccount }, { id: string } & Partial<WhatsAppAccount>>({
      query: ({ id, ...body }) => ({
        url: `api/whatsapp/accounts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    deleteAccount: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/whatsapp/accounts/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    getTemplates: builder.query<TemplatesResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/whatsapp/templates?workspaceId=${workspaceId}`,
      providesTags: ['WhatsAppTemplate'],
    }),
    createTemplate: builder.mutation<{ success: boolean; template: WhatsAppTemplate }, Partial<WhatsAppTemplate> & { workspaceId: string }>({
      query: body => ({
        url: 'api/whatsapp/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppTemplate'],
    }),
    getConversations: builder.query<ConversationsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/whatsapp/conversations?workspaceId=${workspaceId}`,
      providesTags: ['WhatsAppConversation'],
    }),
    sendMessage: builder.mutation<{ success: boolean }, SendMessageBody>({
      query: body => ({
        url: 'api/whatsapp/send',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppConversation'],
    }),
    sendTemplate: builder.mutation<{ success: boolean }, SendTemplateBody>({
      query: body => ({
        url: 'api/whatsapp/send-template',
        method: 'POST',
        body,
      }),
    }),
    broadcast: builder.mutation<{ success: boolean; count: number }, BroadcastBody>({
      query: body => ({
        url: 'api/whatsapp/broadcast',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGetAccountsQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
  useGetConversationsQuery,
  useSendMessageMutation,
  useSendTemplateMutation,
  useBroadcastMutation,
} = whatsappApi
