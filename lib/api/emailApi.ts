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
  endpoints: (builder) => ({
    // Email Accounts
    getEmailAccounts: builder.query<{ accounts: EmailAccount[] }, void>({
      query: () => '/accounts',
      providesTags: ['EmailAccount'],
    }),

    getEmailAccount: builder.query<{ account: EmailAccount }, string>({
      query: (id) => `/accounts/${id}`,
      providesTags: (result, error, id) => [{ type: 'EmailAccount', id }],
    }),

    createEmailAccount: builder.mutation<
      { success: boolean; accountId: string; message: string },
      CreateEmailAccountRequest
    >({
      query: (account) => ({
        url: '/accounts',
        method: 'POST',
        body: account,
      }),
      invalidatesTags: ['EmailAccount'],
    }),

    updateEmailAccount: builder.mutation<
      { success: boolean; message: string },
      { id: string; data: UpdateEmailAccountRequest }
    >({
      query: ({ id, data }) => ({
        url: `/accounts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'EmailAccount', id }],
    }),

    deleteEmailAccount: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EmailAccount'],
    }),

    setDefaultEmailAccount: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/accounts/${id}/set-default`,
        method: 'POST',
      }),
      invalidatesTags: ['EmailAccount'],
    }),

    syncEmailAccount: builder.mutation<
      { success: boolean; count: number; error?: string },
      string
    >({
      query: (id) => ({
        url: `/accounts/${id}/sync`,
        method: 'POST',
      }),
      invalidatesTags: ['EmailMessage', 'EmailAccount'],
    }),

    testEmailAccountConnection: builder.mutation<
      { success: boolean; error?: string },
      string
    >({
      query: (id) => ({
        url: `/accounts/${id}/test`,
        method: 'POST',
      }),
    }),

    // Email Messages
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
      EmailMessagesQuery
    >({
      query: (params) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined) {
            searchParams.append(key, value.toString())
          }
        })
        return `/messages?${searchParams.toString()}`
      },
      providesTags: ['EmailMessage'],
    }),

    getEmailMessage: builder.query<{ message: EmailMessage }, string>({
      query: (id) => `/messages/${id}`,
      providesTags: (result, error, id) => [{ type: 'EmailMessage', id }],
    }),

    updateEmailMessage: builder.mutation<
      { success: boolean; message: string },
      { id: string; data: UpdateEmailMessageRequest }
    >({
      query: ({ id, data }) => ({
        url: `/messages/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'EmailMessage', id },
        'EmailMessage',
      ],
    }),

    deleteEmailMessage: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: (id) => ({
        url: `/messages/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['EmailMessage'],
    }),

    // Send Email
    sendEmail: builder.mutation<
      { success: boolean; messageId: string; message: string },
      SendEmailRequest
    >({
      query: (email) => ({
        url: '/send',
        method: 'POST',
        body: email,
      }),
      invalidatesTags: ['EmailMessage'],
    }),
  }),
})

export const {
  // Email Accounts
  useGetEmailAccountsQuery,
  useGetEmailAccountQuery,
  useCreateEmailAccountMutation,
  useUpdateEmailAccountMutation,
  useDeleteEmailAccountMutation,
  useSetDefaultEmailAccountMutation,
  useSyncEmailAccountMutation,
  useTestEmailAccountConnectionMutation,

  // Email Messages
  useGetEmailMessagesQuery,
  useGetEmailMessageQuery,
  useUpdateEmailMessageMutation,
  useDeleteEmailMessageMutation,

  // Send Email
  useSendEmailMutation,
} = emailApi