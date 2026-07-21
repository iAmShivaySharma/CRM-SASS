import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface EmailAccount {
  _id: string
  provider: 'gmail' | 'outlook' | 'smtp' | 'imap'
  displayName: string
  emailAddress: string
  isActive: boolean
  isDefault: boolean
  connectionStatus: 'connected' | 'expired' | 'not_configured' | 'error'
  stats: {
    emailsSent: number
    emailsReceived: number
    lastUsedAt?: Date
  }
  settings: {
    syncEnabled: boolean
    syncInterval: number
    lastSyncAt?: Date
    signature?: string
    folders: {
      inbox: string
      sent: string
      drafts: string
      trash: string
      custom?: Array<{ name: string; path: string }>
    }
  }
}

export interface EmailMessage {
  _id: string
  userId: string
  workspaceId: string
  emailAccountId: string
  messageId: string
  threadId?: string
  from: {
    name?: string
    email: string
  }
  to: Array<{
    name?: string
    email: string
  }>
  cc?: Array<{
    name?: string
    email: string
  }>
  bcc?: Array<{
    name?: string
    email: string
  }>
  replyTo?: {
    name?: string
    email: string
  }
  subject: string
  bodyText?: string
  bodyHtml?: string
  attachments: Array<{
    filename: string
    contentType: string
    size: number
    attachmentId: string
    isInline?: boolean
    contentId?: string
  }>
  direction: 'inbound' | 'outbound' | 'draft'
  status: 'draft' | 'sent' | 'delivered' | 'failed' | 'bounced' | 'read'
  priority: 'low' | 'normal' | 'high'
  sentAt?: Date
  receivedAt?: Date
  readAt?: Date
  folder: string
  labels: string[]
  isRead: boolean
  isStarred: boolean
  isImportant: boolean
  isSnoozed: boolean
  snoozeUntil?: Date
  linkedLeadId?: string
  linkedContactId?: string
  linkedProjectId?: string
  linkedTaskId?: string
  syncStatus: 'pending' | 'synced' | 'failed' | 'ignored'
  syncedAt?: Date
  syncError?: string
  createdAt: Date
  updatedAt: Date
}

export interface CreateEmailAccountRequest {
  provider: 'gmail' | 'outlook' | 'smtp' | 'imap'
  displayName: string
  emailAddress: string
  smtpConfig?: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  imapConfig?: {
    host: string
    port: number
    secure: boolean
    username: string
    password: string
  }
  settings?: {
    syncEnabled?: boolean
    syncInterval?: number
    signature?: string
  }
}

export interface UpdateEmailAccountRequest {
  displayName?: string
  settings?: {
    syncEnabled?: boolean
    syncInterval?: number
    signature?: string
    autoReply?: boolean
    autoReplyMessage?: string
  }
  smtpConfig?: {
    host: string
    port: number
    secure: boolean
    username?: string
    password?: string
  }
  imapConfig?: {
    host: string
    port: number
    secure: boolean
    username?: string
    password?: string
  }
}

export interface SendEmailRequest {
  accountId: string
  to: string | string[]
  cc?: string | string[]
  bcc?: string | string[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    content: string | ArrayBuffer
    contentType?: string
    encoding?: string
  }>
  replyTo?: string
  inReplyTo?: string
  references?: string[]
}

export interface EmailMessagesQuery {
  accountId?: string
  folder?: string
  search?: string
  page?: number
  limit?: number
  unreadOnly?: boolean
  starred?: boolean
}

export interface UpdateEmailMessageRequest {
  isRead?: boolean
  isStarred?: boolean
  folder?: string
  labels?: string[]
  linkedLeadId?: string | null
  linkedContactId?: string | null
  linkedProjectId?: string | null
  linkedTaskId?: string | null
  snoozeUntil?: string | null
}

export const emailApi = createApi({
  reducerPath: 'emailApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/email',
    credentials: 'include',
  }),
  tagTypes: ['EmailAccount', 'EmailMessage'],
  endpoints: builder => ({
    getEmailAccounts: builder.query<{ accounts: EmailAccount[] }, string>({
      query: workspaceId => `/accounts?workspaceId=${workspaceId}`,
      providesTags: ['EmailAccount'],
    }),

    getEmailAccount: builder.query<
      { account: EmailAccount },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `/accounts/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'EmailAccount', id }],
    }),

    createEmailAccount: builder.mutation<
      { success: boolean; accountId: string; message: string },
      CreateEmailAccountRequest & { workspaceId: string }
    >({
      query: ({ workspaceId, ...account }) => ({
        url: `/accounts?workspaceId=${workspaceId}`,
        method: 'POST',
        body: account,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags(['EmailAccount']))
      },
    }),

    updateEmailAccount: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string; data: UpdateEmailAccountRequest }
    >({
      query: ({ id, workspaceId, data }) => ({
        url: `/accounts/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags([{ type: 'EmailAccount', id }]))
      },
    }),

    deleteEmailAccount: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/accounts/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags(['EmailAccount']))
      },
    }),

    setDefaultEmailAccount: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/accounts/${id}/set-default?workspaceId=${workspaceId}`,
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags(['EmailAccount']))
      },
    }),

    syncEmailAccount: builder.mutation<
      { success: boolean; count: number; error?: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/accounts/${id}/sync?workspaceId=${workspaceId}`,
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags(['EmailMessage', 'EmailAccount']))
      },
    }),

    testEmailAccountConnection: builder.mutation<
      { success: boolean; error?: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/accounts/${id}/test?workspaceId=${workspaceId}`,
        method: 'POST',
      }),
    }),

    getEmailMessages: builder.query<
      {
        messages: EmailMessage[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      EmailMessagesQuery & { workspaceId: string }
    >({
      query: ({ workspaceId, ...params }) => {
        const searchParams = new URLSearchParams()
        searchParams.append('workspaceId', workspaceId)
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString())
          }
        })
        return `/messages?${searchParams.toString()}`
      },
      providesTags: ['EmailMessage'],
    }),

    getEmailMessage: builder.query<
      { message: EmailMessage },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `/messages/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'EmailMessage', id }],
    }),

    updateEmailMessage: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string; data: UpdateEmailMessageRequest }
    >({
      query: ({ id, workspaceId, data }) => ({
        url: `/messages/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body: data,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          emailApi.util.invalidateTags([
            { type: 'EmailMessage', id },
            'EmailMessage',
          ])
        )
      },
    }),

    deleteEmailMessage: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/messages/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags(['EmailMessage']))
      },
    }),

    sendEmail: builder.mutation<
      { success: boolean; messageId: string; message: string },
      SendEmailRequest & { workspaceId: string }
    >({
      query: ({ workspaceId, ...email }) => ({
        url: `/send?workspaceId=${workspaceId}`,
        method: 'POST',
        body: email,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(emailApi.util.invalidateTags(['EmailMessage']))
      },
    }),
  }),
})

export const {
  useGetEmailAccountsQuery,
  useGetEmailAccountQuery,
  useCreateEmailAccountMutation,
  useUpdateEmailAccountMutation,
  useDeleteEmailAccountMutation,
  useSetDefaultEmailAccountMutation,
  useSyncEmailAccountMutation,
  useTestEmailAccountConnectionMutation,

  useGetEmailMessagesQuery,
  useGetEmailMessageQuery,
  useUpdateEmailMessageMutation,
  useDeleteEmailMessageMutation,

  useSendEmailMutation,
} = emailApi
