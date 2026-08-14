import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface PipelineStage {
  id: string
  _id?: string
  name: string
  color: string
  order: number
  probability: number
  isWonStage: boolean
  isLostStage: boolean
  dealCount?: number
  totalValue?: number
}

export interface Pipeline {
  id: string
  _id?: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  currency: string
  stages: PipelineStage[]
  createdAt: string
}

export interface Deal {
  id: string
  _id?: string
  workspaceId: string
  pipelineId: string | Pipeline
  stageId: string | PipelineStage
  title: string
  value: number
  currency: string
  contactId?: {
    id: string
    name: string
    email?: string
    phone?: string
    company?: string
  } | null
  leadId?: {
    id: string
    name: string
    email?: string
    company?: string
  } | null
  assignedTo?: {
    id: string
    fullName: string
    email: string
  } | null
  priority: 'low' | 'medium' | 'high'
  status: 'open' | 'won' | 'lost' | 'abandoned'
  probability: number
  expectedCloseDate?: string
  actualCloseDate?: string
  lostReason?: string
  wonNote?: string
  source?: string
  tags: string[]
  tagIds: Array<{ id: string; name: string; color: string }>
  notes?: string
  stageEnteredAt: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface DealActivity {
  id: string
  dealId: string
  type: string
  description: string
  metadata?: Record<string, any>
  performedBy: {
    id: string
    fullName: string
    email: string
  }
  createdAt: string
}

export interface DealAnalytics {
  overview: {
    totalDeals: number
    totalValue: number
    avgDealSize: number
    openDeals: number
    openValue: number
    wonCount: number
    wonValue: number
    lostCount: number
    lostValue: number
    winRate: number
    weightedPipeline: number
  }
  byStage: Array<{
    stageId: string
    stageName: string
    stageColor: string
    order: number
    count: number
    totalValue: number
    avgValue: number
    weightedValue: number
  }>
  byStatus: Array<{
    status: string
    count: number
    totalValue: number
  }>
  recentWon: Deal[]
  recentLost: Deal[]
  monthlyTrend: Array<{
    month: string
    created: number
    totalValue: number
    won: number
    wonValue: number
    lost: number
  }>
}

export const dealsApi = createApi({
  reducerPath: 'dealsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Pipeline', 'Deal', 'DealActivity', 'DealAnalytics'],
  endpoints: builder => ({
    // Pipelines
    getPipelines: builder.query<Pipeline[], string>({
      query: workspaceId => `/pipelines?workspaceId=${workspaceId}`,
      transformResponse: (response: any) => response.pipelines,
      providesTags: ['Pipeline'],
    }),

    getPipeline: builder.query<
      { pipeline: Pipeline },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `/pipelines/${id}?workspaceId=${workspaceId}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Pipeline', id }],
    }),

    createPipeline: builder.mutation<
      { pipeline: Pipeline },
      Partial<Pipeline> & { workspaceId: string }
    >({
      query: body => ({
        url: '/pipelines',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pipeline'],
    }),

    updatePipeline: builder.mutation<
      { pipeline: Pipeline },
      { id: string } & Partial<Pipeline> & { workspaceId: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/pipelines/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Pipeline'],
    }),

    deletePipeline: builder.mutation<void, { id: string; workspaceId: string }>(
      {
        query: ({ id, workspaceId }) => ({
          url: `/pipelines/${id}?workspaceId=${workspaceId}`,
          method: 'DELETE',
        }),
        invalidatesTags: ['Pipeline'],
      }
    ),

    // Pipeline Stages
    createStage: builder.mutation<
      { stage: PipelineStage },
      { pipelineId: string; workspaceId: string } & Partial<PipelineStage>
    >({
      query: ({ pipelineId, ...body }) => ({
        url: `/pipelines/${pipelineId}/stages`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Pipeline'],
    }),

    updateStage: builder.mutation<
      { stage: PipelineStage },
      {
        pipelineId: string
        stageId: string
        workspaceId: string
      } & Partial<PipelineStage>
    >({
      query: ({ pipelineId, stageId, ...body }) => ({
        url: `/pipelines/${pipelineId}/stages/${stageId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['Pipeline'],
    }),

    deleteStage: builder.mutation<
      void,
      { pipelineId: string; stageId: string; workspaceId: string }
    >({
      query: ({ pipelineId, stageId, workspaceId }) => ({
        url: `/pipelines/${pipelineId}/stages/${stageId}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Pipeline'],
    }),

    // Deals
    getDeals: builder.query<
      {
        deals: Deal[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
          hasNext: boolean
          hasPrev: boolean
        }
      },
      {
        workspaceId: string
        pipelineId?: string
        stageId?: string
        status?: string
        assignedTo?: string
        priority?: string
        search?: string
        contactId?: string
        page?: number
        limit?: number
        sortBy?: string
        sortOrder?: string
      }
    >({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value))
          }
        })
        return `/deals?${searchParams.toString()}`
      },
      providesTags: result =>
        result
          ? [
              ...result.deals.map(deal => ({
                type: 'Deal' as const,
                id: deal.id,
              })),
              { type: 'Deal', id: 'LIST' },
            ]
          : [{ type: 'Deal', id: 'LIST' }],
    }),

    getDeal: builder.query<
      { deal: Deal; activities: DealActivity[] },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => `/deals/${id}?workspaceId=${workspaceId}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Deal', id }],
    }),

    createDeal: builder.mutation<
      { deal: Deal },
      Partial<Deal> & {
        workspaceId: string
        pipelineId: string
        stageId: string
        title: string
      }
    >({
      query: body => ({
        url: '/deals',
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Deal', id: 'LIST' },
        'Pipeline',
        'DealAnalytics',
      ],
    }),

    updateDeal: builder.mutation<
      { deal: Deal },
      { id: string; workspaceId: string } & Partial<Deal>
    >({
      query: ({ id, ...body }) => ({
        url: `/deals/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deal', id },
        { type: 'Deal', id: 'LIST' },
        'DealAnalytics',
      ],
    }),

    deleteDeal: builder.mutation<void, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `/deals/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [
        { type: 'Deal', id: 'LIST' },
        'Pipeline',
        'DealAnalytics',
      ],
    }),

    moveDeal: builder.mutation<
      { deal: Deal },
      { id: string; stageId: string; workspaceId: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/deals/${id}/move`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Deal', id },
        { type: 'Deal', id: 'LIST' },
        'Pipeline',
        'DealAnalytics',
      ],
    }),

    wonDeal: builder.mutation<
      { deal: Deal },
      {
        id: string
        workspaceId: string
        wonNote?: string
        actualValue?: number
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/deals/${id}/won`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Deal', id: 'LIST' },
        'Pipeline',
        'DealAnalytics',
      ],
    }),

    lostDeal: builder.mutation<
      { deal: Deal },
      { id: string; workspaceId: string; lostReason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/deals/${id}/lost`,
        method: 'POST',
        body,
      }),
      invalidatesTags: [
        { type: 'Deal', id: 'LIST' },
        'Pipeline',
        'DealAnalytics',
      ],
    }),

    // Activities
    getDealActivities: builder.query<
      {
        activities: DealActivity[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      { dealId: string; workspaceId: string; page?: number; limit?: number }
    >({
      query: ({ dealId, workspaceId, page = 1, limit = 50 }) =>
        `/deals/${dealId}/activities?workspaceId=${workspaceId}&page=${page}&limit=${limit}`,
      providesTags: ['DealActivity'],
    }),

    // Analytics
    getDealAnalytics: builder.query<
      DealAnalytics,
      {
        workspaceId: string
        pipelineId?: string
        dateFrom?: string
        dateTo?: string
      }
    >({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) searchParams.set(key, value)
        })
        return `/deals/analytics?${searchParams.toString()}`
      },
      transformResponse: (response: any) => response.analytics,
      providesTags: ['DealAnalytics'],
    }),
  }),
})

export const {
  useGetPipelinesQuery,
  useGetPipelineQuery,
  useCreatePipelineMutation,
  useUpdatePipelineMutation,
  useDeletePipelineMutation,
  useCreateStageMutation,
  useUpdateStageMutation,
  useDeleteStageMutation,
  useGetDealsQuery,
  useGetDealQuery,
  useCreateDealMutation,
  useUpdateDealMutation,
  useDeleteDealMutation,
  useMoveDealMutation,
  useWonDealMutation,
  useLostDealMutation,
  useGetDealActivitiesQuery,
  useGetDealAnalyticsQuery,
} = dealsApi
