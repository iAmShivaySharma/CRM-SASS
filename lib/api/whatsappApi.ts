import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface WhatsAppAccount {
  _id: string
  workspaceId: string
  name: string
  displayName?: string
  phoneNumber: string
  phoneNumberId: string
  accessToken: string
  businessAccountId?: string
  webhookVerifyToken?: string
  isActive: boolean
  botEnabled: boolean
  botContext?: string
  botTone?: 'professional' | 'friendly' | 'casual'
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

export interface WhatsAppMessage {
  _id: string
  direction: 'inbound' | 'outbound'
  from: string
  to: string
  content: string
  messageType: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  waMessageId?: string
  templateName?: string
  createdAt: string
  sentAt?: string
}

export interface WhatsAppConversation {
  _id: string
  workspaceId: string
  accountId: string
  contactPhone: string
  contactName?: string
  lastMessage?: string
  lastMessageAt?: string
  messageCount?: number
  unreadCount?: number
  status: string
  mode?: string
  humanAssignedTo?: string
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

export interface BotFlowStepPayload {
  id: string
  type:
    | 'send_message'
    | 'wait_for_reply'
    | 'keyword_match'
    | 'quick_reply'
    | 'list_message'
    | 'ai_reply'
    | 'assign_human'
    | 'delay'
    | 'condition'
  data: Record<string, unknown>
  position: { x: number; y: number }
  connections: Array<{ targetStepId: string; label?: string }>
}

export interface WhatsAppBotFlowResponse {
  _id: string
  id?: string
  workspaceId: string
  accountId: string
  name: string
  description?: string
  steps: BotFlowStepPayload[]
  triggerKeywords?: string[]
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export const whatsappApi = createApi({
  reducerPath: 'whatsappApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: [
    'WhatsAppAccount',
    'WhatsAppTemplate',
    'WhatsAppConversation',
    'WhatsAppBotFlow',
  ],
  endpoints: builder => ({
    getAccounts: builder.query<AccountsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) =>
        `api/whatsapp/accounts?workspaceId=${workspaceId}`,
      providesTags: ['WhatsAppAccount'],
    }),
    createAccount: builder.mutation<
      { success: boolean; account: WhatsAppAccount },
      Partial<WhatsAppAccount> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/whatsapp/accounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    updateAccount: builder.mutation<
      { success: boolean; account: WhatsAppAccount },
      { id: string } & Partial<WhatsAppAccount>
    >({
      query: ({ id, ...body }) => ({
        url: `api/whatsapp/accounts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    deleteAccount: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/whatsapp/accounts/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    getTemplates: builder.query<TemplatesResponse, { workspaceId: string }>({
      query: ({ workspaceId }) =>
        `api/whatsapp/templates?workspaceId=${workspaceId}`,
      providesTags: ['WhatsAppTemplate'],
    }),
    createTemplate: builder.mutation<
      { success: boolean; template: WhatsAppTemplate },
      Partial<WhatsAppTemplate> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/whatsapp/templates',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppTemplate'],
    }),
    getConversations: builder.query<
      ConversationsResponse,
      { workspaceId: string }
    >({
      query: ({ workspaceId }) =>
        `api/whatsapp/conversations?workspaceId=${workspaceId}`,
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
    broadcast: builder.mutation<
      { success: boolean; count: number },
      BroadcastBody
    >({
      query: body => ({
        url: 'api/whatsapp/broadcast',
        method: 'POST',
        body,
      }),
    }),
    deleteTemplate: builder.mutation<
      { success: boolean },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/whatsapp/templates/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WhatsAppTemplate'],
    }),
    submitTemplate: builder.mutation<
      { success: boolean; metaTemplateId?: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/whatsapp/templates/${id}/submit`,
        method: 'POST',
        body: { workspaceId },
      }),
      invalidatesTags: ['WhatsAppTemplate'],
    }),
    syncTemplates: builder.mutation<
      { success: boolean; synced: number },
      { workspaceId: string; accountId: string }
    >({
      query: body => ({
        url: 'api/whatsapp/templates/sync',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppTemplate'],
    }),
    getMessages: builder.query<
      { success: boolean; messages: WhatsAppMessage[] },
      { workspaceId: string; phone: string; page?: number }
    >({
      query: ({ workspaceId, phone, page = 1 }) =>
        `api/whatsapp/conversations?workspaceId=${workspaceId}&phone=${encodeURIComponent(phone)}&page=${page}`,
      providesTags: ['WhatsAppConversation'],
    }),
    connectFacebook: builder.mutation<
      { success: boolean; accounts: WhatsAppAccount[] },
      { workspaceId: string; accessToken: string }
    >({
      query: body => ({
        url: 'api/whatsapp/connect-facebook',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppAccount'],
    }),
    getBotFlows: builder.query<
      { success: boolean; botFlows: WhatsAppBotFlowResponse[] },
      { workspaceId: string; accountId?: string }
    >({
      query: ({ workspaceId, accountId }) => {
        let url = `api/whatsapp/bot-flows?workspaceId=${workspaceId}`
        if (accountId) {
          url += `&accountId=${accountId}`
        }
        return url
      },
      providesTags: ['WhatsAppBotFlow'],
    }),
    createBotFlow: builder.mutation<
      { success: boolean; botFlow: WhatsAppBotFlowResponse },
      {
        workspaceId: string
        accountId: string
        name: string
        description?: string
        steps: BotFlowStepPayload[]
        triggerKeywords?: string[]
        isActive?: boolean
      }
    >({
      query: body => ({
        url: 'api/whatsapp/bot-flows',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WhatsAppBotFlow'],
    }),
    updateBotFlow: builder.mutation<
      { success: boolean; botFlow: WhatsAppBotFlowResponse },
      {
        id: string
        name?: string
        description?: string
        steps?: BotFlowStepPayload[]
        isActive?: boolean
        triggerKeywords?: string[]
      }
    >({
      query: ({ id, ...body }) => ({
        url: `api/whatsapp/bot-flows/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['WhatsAppBotFlow'],
    }),
    deleteBotFlow: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id }) => ({
        url: `api/whatsapp/bot-flows/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WhatsAppBotFlow'],
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
  useDeleteTemplateMutation,
  useSubmitTemplateMutation,
  useSyncTemplatesMutation,
  useGetMessagesQuery,
  useConnectFacebookMutation,
  useGetBotFlowsQuery,
  useCreateBotFlowMutation,
  useUpdateBotFlowMutation,
  useDeleteBotFlowMutation,
} = whatsappApi
