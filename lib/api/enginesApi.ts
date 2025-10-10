import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface WorkflowCatalogItem {
  _id: string
  name: string
  description: string
  category: string
  categoryName: string
  categoryIcon: string
  tags: string[]
  requiresApiKey: boolean
  estimatedCost: number
  apiKeyProvider: 'openrouter' | 'platform'
  usage: {
    totalExecutions: number
    avgExecutionTime: number
    successRate: number
    lastExecutedAt?: string
  }
  inputSchema: Record<string, any>
  outputSchema: Record<string, any>
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WorkflowCategory {
  _id: string
  name: string
  description: string
  icon: string
  sortOrder: number
  workflowCount?: number
}

export interface WorkflowCatalogResponse {
  success: boolean
  data: {
    workflows: WorkflowCatalogItem[]
    categories: WorkflowCategory[]
    pagination: {
      total: number
      limit: number
      offset: number
      hasMore: boolean
    }
  }
}

export interface SyncWorkflowsResponse {
  success: boolean
  message: string
  data: {
    syncedCount: number
    updatedCount: number
    totalProcessed: number
    errorCount: number
    workflows: string[]
    errors?: string[]
  }
}

export interface WorkflowExecutionRequest {
  workflowId: string
  inputData: Record<string, any>
  apiKeyType: 'customer' | 'platform'
  apiKeyId?: string
  emailResults?: boolean
}

export interface WorkflowExecutionResponse {
  _id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  n8nExecutionId: string
  outputData?: Record<string, any>
  executionTimeMs: number
  apiKeyUsed: {
    type: 'customer' | 'platform'
    provider: string
    cost: number
    tokensUsed?: number
  }
  errorMessage?: string
  createdAt: string
  completedAt?: string
}

export const enginesApi = createApi({
  reducerPath: 'enginesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/engines',
    credentials: 'include',
  }),
  tagTypes: [
    'WorkflowCatalog',
    'WorkflowCategory',
    'WorkflowExecution',
    'ApiKey',
    'SyncStatus'
  ],
  endpoints: (builder) => ({
    // Workflow Catalog
    getWorkflowCatalog: builder.query<WorkflowCatalogResponse, {
      category?: string
      search?: string
      requiresApiKey?: boolean
      limit?: number
      offset?: number
    }>({
      query: (params) => ({
        url: '/catalog',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined)
        ),
      }),
      providesTags: ['WorkflowCatalog', 'WorkflowCategory'],
    }),

    getWorkflowDetails: builder.query<{ data: WorkflowCatalogItem }, string>({
      query: (id) => `/workflow/${id}`,
      providesTags: (result, error, id) => [
        { type: 'WorkflowCatalog', id },
      ],
    }),

    // Workflow Sync
    syncWorkflows: builder.mutation<SyncWorkflowsResponse, void>({
      query: () => ({
        url: '/sync-workflows',
        method: 'POST',
      }),
      invalidatesTags: ['WorkflowCatalog', 'WorkflowCategory', 'SyncStatus'],
    }),

    testN8nConnection: builder.query<{
      success: boolean
      message: string
      version?: string
    }, void>({
      query: () => '/sync-workflows',
      providesTags: ['SyncStatus'],
    }),

    // Workflow Execution
    executeWorkflow: builder.mutation<WorkflowExecutionResponse, WorkflowExecutionRequest>({
      query: (data) => ({
        url: '/execute',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['WorkflowExecution'],
    }),

    getExecutions: builder.query<{
      data: WorkflowExecutionResponse[]
      pagination: {
        total: number
        limit: number
        offset: number
        hasMore: boolean
      }
    }, {
      workflowId?: string
      status?: string
      limit?: number
      offset?: number
    }>({
      query: (params) => ({
        url: '/executions',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined)
        ),
      }),
      providesTags: ['WorkflowExecution'],
    }),

    getExecutionDetails: builder.query<{ data: WorkflowExecutionResponse }, string>({
      query: (id) => `/executions/${id}`,
      providesTags: (result, error, id) => [
        { type: 'WorkflowExecution', id },
      ],
    }),

    // API Key Management
    getApiKeys: builder.query<{
      data: Array<{
        _id: string
        keyName: string
        provider: string
        isDefault: boolean
        isActive: boolean
        keyPreview: string
        lastUsedAt?: string
        totalUsage: {
          executions: number
          tokensUsed: number
        }
        createdAt: string
      }>
    }, void>({
      query: () => '/api-keys',
      providesTags: ['ApiKey'],
    }),

    addApiKey: builder.mutation<{
      success: boolean
      data: { _id: string }
    }, {
      keyName: string
      apiKey: string
      setAsDefault?: boolean
    }>({
      query: (data) => ({
        url: '/api-keys',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ApiKey'],
    }),

    updateApiKey: builder.mutation<{
      success: boolean
    }, {
      id: string
      keyName?: string
      isDefault?: boolean
      isActive?: boolean
    }>({
      query: ({ id, ...data }) => ({
        url: `/api-keys/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ApiKey'],
    }),

    deleteApiKey: builder.mutation<{ success: boolean }, string>({
      query: (id) => ({
        url: `/api-keys/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ApiKey'],
    }),

    validateApiKey: builder.mutation<{
      success: boolean
      valid: boolean
      provider?: string
    }, {
      apiKey: string
      provider: string
    }>({
      query: (data) => ({
        url: '/api-keys/validate',
        method: 'POST',
        body: data,
      }),
    }),

    // Usage and Billing
    getUsageStats: builder.query<{
      data: {
        totalExecutions: number
        totalCost: number
        totalTokens: number
        successRate: number
        thisMonth: {
          executions: number
          cost: number
          tokens: number
        }
        lastExecution?: string
      }
    }, { timeframe?: number }>({
      query: (params) => ({
        url: '/usage',
        params,
      }),
      providesTags: ['WorkflowExecution'],
    }),

    getBillingHistory: builder.query<{
      data: Array<{
        month: string
        totalCost: number
        totalExecutions: number
        totalTokens: number
        status: 'pending' | 'billed' | 'paid'
      }>
    }, void>({
      query: () => '/billing',
      providesTags: ['WorkflowExecution'],
    }),
  }),
})

export const {
  // Workflow Catalog
  useGetWorkflowCatalogQuery,
  useGetWorkflowDetailsQuery,

  // Workflow Sync
  useSyncWorkflowsMutation,
  useTestN8nConnectionQuery,

  // Workflow Execution
  useExecuteWorkflowMutation,
  useGetExecutionsQuery,
  useGetExecutionDetailsQuery,

  // API Key Management
  useGetApiKeysQuery,
  useAddApiKeyMutation,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
  useValidateApiKeyMutation,

  // Usage and Billing
  useGetUsageStatsQuery,
  useGetBillingHistoryQuery,
} = enginesApi