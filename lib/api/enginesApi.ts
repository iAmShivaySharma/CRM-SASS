import { api } from './index'

export interface WorkflowCatalogItem {
  id: string
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
  id: string
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
  id: string
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
    id: string
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
    id: string
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
  id: string
  execution: {
    id: string
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

const enginesApi = api.injectEndpoints({
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
        url: 'api/engines/catalog',
        params: Object.fromEntries(
          Object.entries(params).filter(([, value]) => value !== undefined)
        ),
      }),
      providesTags: ['WorkflowCatalog', 'WorkflowCategory'],
    }),

    getWorkflowDetails: builder.query<{ data: WorkflowCatalogItem }, string>({
      query: id => `api/engines/workflow/${id}`,
      providesTags: (result, error, id) => [{ type: 'WorkflowCatalog', id }],
    }),

    syncWorkflows: builder.mutation<SyncWorkflowsResponse, void>({
      query: () => ({
        url: 'api/engines/sync',
        method: 'POST',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
      query: () => 'api/engines/sync',
      providesTags: ['SyncStatus'],
    }),

    executeWorkflow: builder.mutation<
      WorkflowExecutionResponse,
      WorkflowExecutionRequest
    >({
      query: ({ workflowId, ...body }) => ({
        url: `api/engines/execute/${workflowId}`,
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['WorkflowExecution']))
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
        url: 'api/engines/executions',
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
      query: id => `api/engines/executions/${id}`,
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
      query: () => 'api/engines/api-keys',
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
        url: 'api/engines/api-keys',
        method: 'POST',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ApiKey']))
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
        url: `api/engines/api-keys/${id}`,
        method: 'PATCH',
        body: data,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ApiKey']))
      },
    }),

    deleteApiKey: builder.mutation<{ success: boolean }, string>({
      query: id => ({
        url: `api/engines/api-keys/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['ApiKey']))
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
        url: 'api/engines/api-keys/validate',
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
        url: 'api/engines/usage',
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
      query: () => 'api/engines/billing',
      providesTags: ['WorkflowExecution'],
    }),

    getExecutionInput: builder.query<
      { success: boolean; data: ExecutionInputRequirement },
      string
    >({
      query: executionId => `api/engines/executions/${executionId}/input`,
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
        url: `api/engines/executions/${executionId}/input`,
        method: 'POST',
        body,
      }),
      async onQueryStarted({ executionId }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
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
        url: 'api/engines/input/pending',
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
