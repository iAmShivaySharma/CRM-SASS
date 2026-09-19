import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export type CampaignChannel = 'email' | 'whatsapp' | 'sms' | 'ai_reply'

export interface CampaignStep {
  order: number
  channel: CampaignChannel
  subject?: string
  body: string
  delayDays: number
  delayHours: number
  aiTone?: 'professional' | 'friendly' | 'casual'
  aiContext?: string
  replyViaChannel?: 'email' | 'whatsapp' | 'sms'
}

export interface Campaign {
  _id: string
  workspaceId: string
  name: string
  description?: string
  steps: CampaignStep[]
  status: 'draft' | 'active' | 'paused' | 'completed'
  enrolledCount: number
  completedCount: number
}

interface CampaignsResponse {
  success: boolean
  campaigns: Campaign[]
}

interface CampaignResponse {
  success: boolean
  campaign: Campaign
}

export const campaignApi = createApi({
  reducerPath: 'campaignApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['Campaign'],
  endpoints: builder => ({
    getCampaigns: builder.query<CampaignsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/campaigns?workspaceId=${workspaceId}`,
      providesTags: ['Campaign'],
    }),
    createCampaign: builder.mutation<
      CampaignResponse,
      {
        workspaceId: string
        name: string
        description?: string
        steps: CampaignStep[]
      }
    >({
      query: body => ({ url: 'api/campaigns', method: 'POST', body }),
      invalidatesTags: ['Campaign'],
    }),
    updateCampaign: builder.mutation<
      CampaignResponse,
      {
        id: string
        name?: string
        description?: string
        steps?: CampaignStep[]
        status?: string
      }
    >({
      query: ({ id, ...body }) => ({
        url: `api/campaigns/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Campaign', id },
        'Campaign',
      ],
    }),
    deleteCampaign: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({ url: `api/campaigns/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Campaign'],
    }),
  }),
})

export const {
  useGetCampaignsQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
} = campaignApi
