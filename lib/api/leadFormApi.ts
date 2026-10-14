import { api } from './index'

export interface LeadFormIntegration {
  id: string
  workspaceId: string
  platform: 'facebook' | 'instagram' | 'google_ads' | 'linkedin'
  accountName: string
  pageName: string
  pageId: string
  adAccountId: string
  formIds: string[]
  webhookSubscribed: boolean
  isActive: boolean
  lastSyncAt: string | null
  createdAt: string
}

export interface LeadFormSubmission {
  id: string
  workspaceId: string
  platform: string
  formName: string
  externalLeadId: string
  fieldData: { name: string; value: string }[]
  status: 'pending' | 'processed' | 'failed' | 'skipped'
  processedAt: string | null
  crmLeadId: string | null
  createdAt: string
}

const leadFormApi = api.injectEndpoints({
  endpoints: builder => ({
    getIntegrations: builder.query<
      { success: boolean; integrations: LeadFormIntegration[] },
      string
    >({
      query: workspaceId => `api/social/lead-forms?workspaceId=${workspaceId}`,
      providesTags: ['LeadFormIntegration'],
    }),
    getOAuthUrl: builder.query<
      { success: boolean; url: string },
      { platform: string; workspaceId: string; redirectUri: string }
    >({
      query: ({ platform, workspaceId, redirectUri }) =>
        `api/social/lead-forms/oauth-url?platform=${platform}&workspaceId=${workspaceId}&redirectUri=${encodeURIComponent(redirectUri)}`,
    }),
    connectFacebookLeadAds: builder.mutation<
      { success: boolean; integration: LeadFormIntegration },
      { workspaceId: string; accessToken: string; pageId: string; pageName: string }
    >({
      query: body => ({ url: 'api/social/lead-forms/facebook', method: 'POST', body }),
      invalidatesTags: ['LeadFormIntegration'],
    }),
    connectGoogle: builder.mutation<
      { success: boolean; integration: LeadFormIntegration },
      { workspaceId: string; code: string; redirectUri: string }
    >({
      query: body => ({ url: 'api/social/lead-forms/google', method: 'POST', body }),
      invalidatesTags: ['LeadFormIntegration'],
    }),
    connectLinkedIn: builder.mutation<
      { success: boolean; integration: LeadFormIntegration },
      { workspaceId: string; code: string; redirectUri: string }
    >({
      query: body => ({ url: 'api/social/lead-forms/linkedin', method: 'POST', body }),
      invalidatesTags: ['LeadFormIntegration'],
    }),
    deleteIntegration: builder.mutation<{ success: boolean }, string>({
      query: id => ({ url: `api/social/lead-forms/${id}`, method: 'DELETE' }),
      invalidatesTags: ['LeadFormIntegration'],
    }),
    getSubmissions: builder.query<
      { success: boolean; submissions: LeadFormSubmission[]; pagination: any },
      { workspaceId: string; status?: string; platform?: string; page?: number; limit?: number }
    >({
      query: ({ workspaceId, status, platform, page = 1, limit = 20 }) => {
        const params = new URLSearchParams({ workspaceId, page: String(page), limit: String(limit) })
        if (status) params.set('status', status)
        if (platform) params.set('platform', platform)
        return `api/social/lead-forms/submissions?${params}`
      },
      providesTags: ['LeadFormSubmission'],
    }),
    processSubmission: builder.mutation<
      { success: boolean; lead: any },
      { workspaceId: string; submissionId: string }
    >({
      query: ({ workspaceId, submissionId }) => ({
        url: `api/social/lead-forms/submissions/${submissionId}/process`,
        method: 'POST',
        body: { workspaceId },
      }),
      invalidatesTags: ['LeadFormSubmission'],
    }),
    syncGoogle: builder.mutation<{ success: boolean; synced: number }, { workspaceId: string; integrationId: string }>({
      query: body => ({ url: 'api/social/lead-forms/sync/google', method: 'POST', body }),
      invalidatesTags: ['LeadFormSubmission'],
    }),
    syncLinkedIn: builder.mutation<{ success: boolean; synced: number }, { workspaceId: string; integrationId: string }>({
      query: body => ({ url: 'api/social/lead-forms/sync/linkedin', method: 'POST', body }),
      invalidatesTags: ['LeadFormSubmission'],
    }),
  }),
})

export const {
  useGetIntegrationsQuery,
  useGetOAuthUrlQuery,
  useConnectFacebookLeadAdsMutation,
  useConnectGoogleMutation,
  useConnectLinkedInMutation,
  useDeleteIntegrationMutation,
  useGetSubmissionsQuery,
  useProcessSubmissionMutation,
  useSyncGoogleMutation,
  useSyncLinkedInMutation,
} = leadFormApi
