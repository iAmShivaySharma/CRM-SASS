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
  status:
    | 'pending'
    | 'running'
    | 'waiting_for_input'
    | 'completed'
    | 'failed'
    | 'timeout'
  n8nWorkflowId?: string
  n8nExecutionId: string
  inputData?: Record<string, any>
  outputData?: Record<string, any>
  executionTimeMs: number
  apiKeyUsed: {
    type: 'customer' | 'platform'
    provider: string
    cost: number
    tokensUsed?: number
  }
  dynamicInput?: {
    isWaitingForInput: boolean
    currentStep: number
    webhookUrl?: string
    inputSchema?: Record<string, any>
    timeoutAt?: string
  }
  errorMessage?: string
  createdAt: string
  startedAt?: string
  completedAt?: string
}

export interface ExecutionInputRequirement {
  isWaitingForInput: boolean
  execution: {
    _id: string
    status: string
    workflowName: string
    createdAt: string
  }
  inputRequirement?: {
    step: number
    inputSchema: Record<string, any>
    timeoutAt: string
    timeRemaining: number
    isExpired: boolean
  }
  userInput?: {
    _id: string
    step: number
    metadata: {
      workflowName: string
      stepDescription?: string
      priority: 'low' | 'medium' | 'high'
      requiresImmediate: boolean
    }
    createdAt: string
  } | null
  message?: string
}

export interface PendingInputItem {
  _id: string
  execution: {
    _id: string
    workflowName: string
    status: string
    startedAt: string
  }
  step: number
  inputSchema: Record<string, any>
  timeoutAt: string
  timeRemaining: number
  timeRemainingMinutes: number
  isExpired: boolean
  metadata: {
    workflowName: string
    stepDescription?: string
    priority: 'low' | 'medium' | 'high'
    requiresImmediate: boolean
  }
  webhookUrl: string
  createdAt: string
  inputUrl: string
}

export interface PendingInputsResponse {
  success: boolean
  data: {
    inputs: PendingInputItem[]
    pagination: { total: number; limit: number; hasMore: boolean }
    summary: {
      totalPending: number
      highPriorityCount: number
      expiringCount: number
    }
  }
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
    'SyncStatus',
    'PendingInput',
  ],
  endpoints: builder => ({
    getWorkflowCatalog: builder.query<
      WorkflowCatalogResponse,
      {
        category?: string
        search?: string
        requiresApiKey?: boolean
        limit?: number
        offset?: number
      }
    >({
      query: params => ({
        url: '/catalog',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined)
        ),
      }),
      providesTags: ['WorkflowCatalog', 'WorkflowCategory'],
    }),

    getWorkflowDetails: builder.query<{ data: WorkflowCatalogItem }, string>({
      query: id => `/workflow/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowCatalog', id }],
    }),

    syncWorkflows: builder.mutation<SyncWorkflowsResponse, void>({
      query: () => ({
        url: '/sync-workflows',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          enginesApi.util.invalidateTags([
            'WorkflowCatalog',
            'WorkflowCategory',
            'SyncStatus',
          ])
        )
      },
    }),

    testN8nConnection: builder.query<
      {
        success: boolean
        message: string
        version?: string
      },
      void
    >({
      query: () => '/sync-workflows',
      providesTags: ['SyncStatus'],
    }),

    executeWorkflow: builder.mutation<
      WorkflowExecutionResponse,
      WorkflowExecutionRequest
    >({
      query: data => ({
        url: '/execute',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(enginesApi.util.invalidateTags(['WorkflowExecution']))
      },
    }),

    getExecutions: builder.query<
      {
        data: WorkflowExecutionResponse[]
        pagination: {
          total: number
          limit: number
          offset: number
          hasMore: boolean
        }
      },
      {
        workflowId?: string
        status?: string
        limit?: number
        offset?: number
      }
    >({
      query: params => ({
        url: '/executions',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined)
        ),
      }),
      providesTags: ['WorkflowExecution'],
    }),

    getExecutionDetails: builder.query<
      { data: WorkflowExecutionResponse },
      string
    >({
      query: id => `/executions/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowExecution', id }],
    }),

    getApiKeys: builder.query<
      {
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
      },
      void
    >({
      query: () => '/api-keys',
      providesTags: ['ApiKey'],
    }),

    addApiKey: builder.mutation<
      {
        success: boolean
        data: { _id: string }
      },
      {
        keyName: string
        apiKey: string
        setAsDefault?: boolean
      }
    >({
      query: data => ({
        url: '/api-keys',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(enginesApi.util.invalidateTags(['ApiKey']))
      },
    }),

    updateApiKey: builder.mutation<
      {
        success: boolean
      },
      {
        id: string
        keyName?: string
        isDefault?: boolean
        isActive?: boolean
      }
    >({
      query: ({ id, ...data }) => ({
        url: `/api-keys/${id}`,
        method: 'PATCH',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(enginesApi.util.invalidateTags(['ApiKey']))
      },
    }),

    deleteApiKey: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: `/api-keys/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(enginesApi.util.invalidateTags(['ApiKey']))
      },
    }),

    validateApiKey: builder.mutation<
      {
        success: boolean
        valid: boolean
        provider?: string
      },
      {
        apiKey: string
        provider: string
      }
    >({
      query: data => ({
        url: '/api-keys/validate',
        method: 'POST',
        body: data,
      }),
    }),

    getUsageStats: builder.query<
      {
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
      },
      { timeframe?: number }
    >({
      query: params => ({
        url: '/usage',
        params,
      }),
      providesTags: ['WorkflowExecution'],
    }),

    getBillingHistory: builder.query<
      {
        data: Array<{
          month: string
          totalCost: number
          totalExecutions: number
          totalTokens: number
          status: 'pending' | 'billed' | 'paid'
        }>
      },
      void
    >({
      query: () => '/billing',
      providesTags: ['WorkflowExecution'],
    }),

    getExecutionInput: builder.query<
      { success: boolean; data: ExecutionInputRequirement },
      string
    >({
      query: executionId => `/executions/${executionId}/input`,
      providesTags: (result, error, id) => [{ type: 'WorkflowExecution', id }],
    }),

    submitExecutionInput: builder.mutation<
      {
        success: boolean
        message: string
        data: {
          execution: { _id: string; status: string; currentStep: number }
          userInput: { _id: string; status: string; receivedAt: string }
          workflowStatus: {
            finished: boolean
            isWaitingForMoreInput: boolean
          }
        }
      },
      {
        executionId: string
        inputData: Record<string, any>
        validateOnly?: boolean
      }
    >({
      query: ({ executionId, ...body }) => ({
        url: `/executions/${executionId}/input`,
        method: 'POST',
        body,
      }),
      async onQueryStarted({ executionId }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          enginesApi.util.invalidateTags([
            { type: 'WorkflowExecution', id: executionId },
            'WorkflowExecution',
            'PendingInput',
          ])
        )
      },
    }),

    getPendingInputs: builder.query<
      PendingInputsResponse,
      { limit?: number; priority?: string; workflowId?: string }
    >({
      query: params => ({
        url: '/input/pending',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined)
        ),
      }),
      providesTags: ['PendingInput'],
    }),
  }),
})

export const {
  useGetWorkflowCatalogQuery,
  useGetWorkflowDetailsQuery,

  useSyncWorkflowsMutation,
  useTestN8nConnectionQuery,

  useExecuteWorkflowMutation,
  useGetExecutionsQuery,
  useGetExecutionDetailsQuery,

  useGetApiKeysQuery,
  useAddApiKeyMutation,
  useUpdateApiKeyMutation,
  useDeleteApiKeyMutation,
  useValidateApiKeyMutation,

  useGetUsageStatsQuery,
  useGetBillingHistoryQuery,

  useGetExecutionInputQuery,
  useSubmitExecutionInputMutation,
  useGetPendingInputsQuery,
} = enginesApi
