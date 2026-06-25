export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  versionId?: string
  nodes: N8nNode[]
  connections: Record<string, any>
  settings?: Record<string, any>
  staticData?: Record<string, any>
  tags?: N8nTag[]
  pinData?: Record<string, any>
  hash?: string
  meta?: Record<string, any>
}

export interface N8nNode {
  id: string
  name: string
  type: string
  typeVersion: number
  position: [number, number]
  parameters: Record<string, any>
  credentials?: Record<string, any>
}

export interface N8nTag {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export interface N8nExecution {
  id: string
  finished: boolean
  mode: string
  retryOf?: string
  retrySuccessId?: string
  startedAt: string
  stoppedAt?: string
  workflowId: string
  waitTill?: string
  data: {
    resultData: {
      runData: Record<string, any>
    }
    executionData?: Record<string, any>
  }
}

export interface N8nExecuteWorkflowRequest {
  workflowId: string
  data?: Record<string, any>
}

export interface N8nExecuteWorkflowResponse {
  data: {
    resultData: {
      runData: Record<string, any>
    }
    executionData?: Record<string, any>
  }
  finished: boolean
  mode: string
  startedAt: string
  stoppedAt?: string
}

export class N8nApiClient {
  private baseUrl: string
  private apiKey: string

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    this.apiKey = apiKey
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v1${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'X-N8N-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(
        `n8n API error (${response.status}): ${errorText || response.statusText}`
      )
    }

    return response.json()
  }

  async getWorkflows(
    options: {
      active?: boolean
      tags?: string[]
      limit?: number
    } = {}
  ): Promise<{ data: N8nWorkflow[] }> {
    const params = new URLSearchParams()

    if (options.active !== undefined) {
      params.append('active', options.active.toString())
    }
    if (options.tags && options.tags.length > 0) {
      params.append('tags', options.tags.join(','))
    }
    if (options.limit) {
      params.append('limit', options.limit.toString())
    }

    const queryString = params.toString()
    const endpoint = `/workflows${queryString ? `?${queryString}` : ''}`

    return this.request<{ data: N8nWorkflow[] }>(endpoint)
  }

  async getWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${workflowId}`)
  }

  async getTags(): Promise<{ data: N8nTag[] }> {
    return this.request<{ data: N8nTag[] }>('/tags')
  }

  async executeWorkflow(
    workflowId: string,
    options: {
      data?: Record<string, any>
      runData?: Record<string, any>
      pinData?: Record<string, any>
      startNodes?: string[]
      destinationNode?: string
    } = {}
  ): Promise<N8nExecuteWorkflowResponse> {
    const body: any = {}

    if (options.data) body.data = options.data
    if (options.runData) body.runData = options.runData
    if (options.pinData) body.pinData = options.pinData
    if (options.startNodes) body.startNodes = options.startNodes
    if (options.destinationNode) body.destinationNode = options.destinationNode

    return this.request<N8nExecuteWorkflowResponse>(
      `/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
  }

  async executeWorkflowWithCredentials(
    workflowId: string,
    options: {
      data?: Record<string, any>
      credentials?: {
        openrouter?: {
          apiKey: string
        }
        openai?: {
          apiKey: string
        }
        [key: string]: any
      }
      runData?: Record<string, any>
      pinData?: Record<string, any>
      startNodes?: string[]
      destinationNode?: string
    } = {}
  ): Promise<N8nExecuteWorkflowResponse> {
    const body: any = {}

    if (options.data) body.data = options.data

    if (options.credentials) {
      if (!body.data) body.data = {}

      if (options.credentials.openrouter?.apiKey) {
        body.data.openrouter_api_key = options.credentials.openrouter.apiKey
        body.data.apiKey = options.credentials.openrouter.apiKey
      }

      if (options.credentials.openai?.apiKey) {
        body.data.openai_api_key = options.credentials.openai.apiKey
      }

      body.credentialOverrides = {}

      Object.entries(options.credentials).forEach(([provider, creds]) => {
        if (provider === 'openrouter' && creds.apiKey) {
          body.credentialOverrides.openrouter = {
            apiKey: creds.apiKey,
          }
        }
        if (provider === 'openai' && creds.apiKey) {
          body.credentialOverrides.openai = {
            apiKey: creds.apiKey,
          }
        }
      })
    }

    if (options.runData) body.runData = options.runData
    if (options.pinData) body.pinData = options.pinData
    if (options.startNodes) body.startNodes = options.startNodes
    if (options.destinationNode) body.destinationNode = options.destinationNode

    return this.request<N8nExecuteWorkflowResponse>(
      `/workflows/${workflowId}/execute`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    )
  }

  async getExecutions(
    workflowId?: string,
    options: {
      limit?: number
      includeData?: boolean
      status?: 'error' | 'success' | 'waiting'
    } = {}
  ): Promise<{ data: N8nExecution[]; count: number }> {
    const params = new URLSearchParams()

    if (workflowId) params.append('workflowId', workflowId)
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.includeData) params.append('includeData', 'true')
    if (options.status) params.append('status', options.status)

    const queryString = params.toString()
    const endpoint = `/executions${queryString ? `?${queryString}` : ''}`

    return this.request<{ data: N8nExecution[]; count: number }>(endpoint)
  }

  async getExecution(executionId: string): Promise<N8nExecution> {
    return this.request<N8nExecution>(`/executions/${executionId}`)
  }

  async deleteExecution(executionId: string): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>(`/executions/${executionId}`, {
      method: 'DELETE',
    })
  }

  async testConnection(): Promise<{ success: boolean; version?: string }> {
    try {
      const result = await this.getWorkflows({ limit: 1 })
      return { success: true, version: 'v1' }
    } catch (error) {
      return { success: false }
    }
  }

  async executeWorkflowWithDynamicInput(
    workflowId: string,
    options: {
      data?: Record<string, any>
      credentials?: {
        openrouter?: { apiKey: string }
        openai?: { apiKey: string }
        [key: string]: any
      }
      inputCallback?: (inputSchema: any, webhookUrl: string) => Promise<void>
      timeoutMinutes?: number
    } = {}
  ): Promise<{
    execution: N8nExecuteWorkflowResponse
    inputsRequired: Array<{
      step: number
      webhookUrl: string
      inputSchema: any
      timeoutAt: Date
    }>
  }> {
    const { timeoutMinutes = 60 } = options
    const inputsRequired: any[] = []

    let execution: N8nExecuteWorkflowResponse

    try {
      execution = await this.executeWorkflowWithCredentials(workflowId, {
        data: options.data,
        credentials: options.credentials,
      })
    } catch (error: any) {
      if (
        error?.message?.includes('waiting') ||
        error?.message?.includes('input')
      ) {
        const webhookUrl = this.generateDynamicWebhookUrl(workflowId)
        const inputSchema = await this.extractWaitNodeSchema(workflowId)

        const inputRequirement = {
          step: 1,
          webhookUrl,
          inputSchema,
          timeoutAt: new Date(Date.now() + timeoutMinutes * 60 * 1000),
        }

        inputsRequired.push(inputRequirement)

        if (options.inputCallback) {
          await options.inputCallback(inputSchema, webhookUrl)
        }

        return {
          execution: {
            data: { resultData: { runData: {} } },
            finished: false,
            mode: 'waiting',
            startedAt: new Date().toISOString(),
          },
          inputsRequired,
        }
      }
      throw error
    }

    return { execution, inputsRequired }
  }

  async resumeWorkflowWithInput(
    executionId: string,
    webhookUrl: string,
    inputData: Record<string, any>
  ): Promise<N8nExecuteWorkflowResponse> {
    const webhookSuffix = this.extractWebhookSuffix(webhookUrl)

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputData),
    })

    if (!response.ok) {
      throw new Error(
        `Failed to resume workflow: ${response.status} ${response.statusText}`
      )
    }

    return this.getExecution(executionId)
  }

  private generateDynamicWebhookUrl(
    workflowId: string,
    step: number = 1
  ): string {
    const baseUrl = this.baseUrl.replace('/api/v1', '')
    const webhookSuffix = `${workflowId}-step-${step}-${Date.now()}`
    return `${baseUrl}/webhook/${webhookSuffix}`
  }

  private extractWebhookSuffix(webhookUrl: string): string {
    return webhookUrl.split('/webhook/')[1] || ''
  }

  async monitorExecutionForInput(
    executionId: string,
    onInputRequired: (
      inputSchema: any,
      webhookUrl: string,
      step: number
    ) => Promise<void>,
    maxWaitTime: number = 3600000 // 1 hour default
  ): Promise<N8nExecution> {
    const startTime = Date.now()
    const pollInterval = 5000

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const execution = await this.getExecution(executionId)

        if (execution.finished) {
          return execution
        }

        if (this.isExecutionWaitingForInput(execution)) {
          const inputSchema = this.extractInputSchemaFromExecution(execution)
          const webhookUrl = this.extractWebhookUrlFromExecution(execution)
          const step = this.extractCurrentStepFromExecution(execution)

          await onInputRequired(inputSchema, webhookUrl, step)
        }

        await new Promise(resolve => setTimeout(resolve, pollInterval))
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }
    }

    throw new Error(`Execution monitoring timed out after ${maxWaitTime}ms`)
  }

  private isExecutionWaitingForInput(execution: N8nExecution): boolean {
    const runData = execution.data?.resultData?.runData || {}

    for (const [nodeId, nodeData] of Object.entries(runData)) {
      if (Array.isArray(nodeData)) {
        for (const run of nodeData) {
          if (run?.data?.main?.[0]?.[0]?.json?.waitingForWebhook) {
            return true
          }
        }
      }
    }

    return false
  }

  private extractInputSchemaFromExecution(execution: N8nExecution): any {
    const runData = execution.data?.resultData?.runData || {}

    for (const [nodeId, nodeData] of Object.entries(runData)) {
      if (Array.isArray(nodeData)) {
        for (const run of nodeData) {
          const waitData = run?.data?.main?.[0]?.[0]?.json
          if (waitData?.waitingForWebhook && waitData?.inputSchema) {
            return waitData.inputSchema
          }
        }
      }
    }

    return {
      userInput: {
        type: 'string',
        required: true,
        description: 'Please provide your input',
      },
    }
  }

  private extractWebhookUrlFromExecution(execution: N8nExecution): string {
    const runData = execution.data?.resultData?.runData || {}

    for (const [nodeId, nodeData] of Object.entries(runData)) {
      if (Array.isArray(nodeData)) {
        for (const run of nodeData) {
          const waitData = run?.data?.main?.[0]?.[0]?.json
          if (waitData?.waitingForWebhook && waitData?.webhookUrl) {
            return waitData.webhookUrl
          }
        }
      }
    }

    return this.generateDynamicWebhookUrl(execution.workflowId)
  }

  private extractCurrentStepFromExecution(execution: N8nExecution): number {
    const runData = execution.data?.resultData?.runData || {}
    let stepCount = 0

    for (const [nodeId, nodeData] of Object.entries(runData)) {
      if (Array.isArray(nodeData) && nodeData.length > 0) {
        stepCount++
      }
    }

    return stepCount
  }

  private async extractWaitNodeSchema(workflowId: string): Promise<any> {
    try {
      const workflow = await this.getWorkflow(workflowId)
      const waitNodes = workflow.nodes.filter(
        node =>
          node.type.toLowerCase().includes('wait') ||
          node.type.toLowerCase().includes('webhook')
      )

      if (waitNodes.length > 0) {
        const waitNode = waitNodes[0]
        if (waitNode.parameters?.inputSchema) {
          return waitNode.parameters.inputSchema
        }
      }

      return {
        userInput: {
          type: 'string',
          required: true,
          description: 'Please provide your input to continue the workflow',
        },
      }
    } catch (error) {
      return {
        userInput: {
          type: 'string',
          required: true,
          description: 'Please provide your input',
        },
      }
    }
  }

  analyzeWorkflow(workflow: N8nWorkflow): {
    requiresApiKey: boolean
    estimatedCost: number
    category: string
    inputSchema: Record<string, any>
    outputSchema: Record<string, any>
  } {
    const nodes = workflow.nodes || []

    const hasAiNodes = nodes.some(node => {
      const nodeType = node.type.toLowerCase()
      const hasAI =
        nodeType.includes('openrouter') ||
        nodeType.includes('ai') ||
        nodeType.includes('openai') ||
        nodeType.includes('anthropic') ||
        nodeType.includes('claude') ||
        nodeType.includes('gpt') ||
        nodeType.includes('llm') ||
        nodeType.includes('@n8n/n8n-nodes-langchain') ||
        nodeType.includes('chatgpt')

      return hasAI
    })

    let category = 'General'
    const nodeTypes = nodes.map(node => node.type.toLowerCase())

    if (hasAiNodes) {
      category = 'Content Creation'
    } else if (nodeTypes.some(type => type.includes('webhook'))) {
      category = 'Webhooks'
    } else if (
      nodeTypes.some(
        type =>
          type.includes('http') || type.includes('api') || type.includes('rest')
      )
    ) {
      category = 'API Integration'
    } else if (
      nodeTypes.some(
        type =>
          type.includes('gmail') ||
          type.includes('email') ||
          type.includes('smtp')
      )
    ) {
      category = 'Marketing'
    } else if (
      nodeTypes.some(
        type =>
          type.includes('spreadsheet') ||
          type.includes('csv') ||
          type.includes('excel') ||
          type.includes('database')
      )
    ) {
      category = 'Data Processing'
    } else if (
      nodeTypes.some(
        type =>
          type.includes('social') ||
          type.includes('twitter') ||
          type.includes('facebook') ||
          type.includes('linkedin')
      )
    ) {
      category = 'Social Media'
    } else if (
      nodeTypes.some(
        type =>
          type.includes('finance') ||
          type.includes('payment') ||
          type.includes('invoice')
      )
    ) {
      category = 'Finance'
    } else if (
      nodeTypes.some(
        type =>
          type.includes('lead') ||
          type.includes('crm') ||
          type.includes('sales')
      )
    ) {
      category = 'Sales'
    }

    let estimatedCost = 0.02
    if (hasAiNodes) {
      const aiNodeCount = nodes.filter(node => {
        const nodeType = node.type.toLowerCase()
        return (
          nodeType.includes('openrouter') ||
          nodeType.includes('ai') ||
          nodeType.includes('openai') ||
          nodeType.includes('anthropic') ||
          nodeType.includes('claude') ||
          nodeType.includes('gpt')
        )
      }).length
      estimatedCost = Math.max(0.08, aiNodeCount * 0.05)
    } else if (
      nodeTypes.some(type => type.includes('http') || type.includes('api'))
    ) {
      estimatedCost = 0.03
    }

    const inputSchema = this.extractInputSchema(nodes)

    const outputSchema = this.extractOutputSchema(nodes)

    return {
      requiresApiKey: hasAiNodes,
      estimatedCost,
      category,
      inputSchema,
      outputSchema,
    }
  }

  private extractInputSchema(nodes: N8nNode[]): Record<string, any> {
    const triggerNodes = nodes.filter(node => {
      const nodeType = node.type.toLowerCase()
      return (
        nodeType.includes('webhook') ||
        nodeType.includes('manualtrigger') ||
        nodeType.includes('formtrigger') ||
        nodeType.includes('trigger') ||
        nodeType.includes('schedule')
      )
    })

    const webhookNode = triggerNodes.find(node =>
      node.type.toLowerCase().includes('webhook')
    )

    if (webhookNode && webhookNode.parameters) {
      const params = webhookNode.parameters
      if (params.httpMethod && params.path) {
        return {
          method: {
            type: 'string',
            required: false,
            description: `HTTP method: ${params.httpMethod}`,
          },
          path: {
            type: 'string',
            required: false,
            description: `Webhook path: ${params.path}`,
          },
          body: {
            type: 'object',
            required: false,
            description: 'Request body data',
          },
        }
      }
    }

    const manualTrigger = triggerNodes.find(node =>
      node.type.toLowerCase().includes('manualtrigger')
    )

    if (manualTrigger && manualTrigger.parameters) {
      const params = manualTrigger.parameters
      if (params.jsonSchema) {
        try {
          return JSON.parse(params.jsonSchema)
        } catch (e) {}
      }
    }

    if (triggerNodes.length > 0) {
      const triggerType = triggerNodes[0].type

      if (triggerType.includes('webhook')) {
        return {
          body: {
            type: 'object',
            required: false,
            description: 'Webhook payload data',
          },
          headers: {
            type: 'object',
            required: false,
            description: 'HTTP headers',
          },
          query: {
            type: 'object',
            required: false,
            description: 'Query parameters',
          },
        }
      } else if (triggerType.includes('manual')) {
        return {
          inputData: {
            type: 'object',
            required: false,
            description: 'Manual execution input data',
          },
        }
      }
    }

    return {
      data: {
        type: 'object',
        required: false,
        description: 'Input data for the workflow',
      },
    }
  }

  private extractOutputSchema(nodes: N8nNode[]): Record<string, any> {
    const outputNodes = nodes.filter(node => {
      const nodeType = node.type.toLowerCase()
      return (
        (nodeType.includes('webhook') && nodeType.includes('respond')) ||
        nodeType.includes('respond') ||
        nodeType.includes('set') ||
        nodeType.includes('function') ||
        nodeType.includes('code')
      )
    })

    const responseNode = outputNodes.find(node =>
      node.type.toLowerCase().includes('respond')
    )

    if (responseNode && responseNode.parameters) {
      const params = responseNode.parameters

      if (params.responseMode) {
        return {
          status: {
            type: 'number',
            description: 'HTTP response status code',
          },
          body: {
            type: 'object',
            description: `Response body (${params.responseMode} format)`,
          },
          headers: {
            type: 'object',
            description: 'Response headers',
          },
        }
      }
    }

    const functionNode = outputNodes.find(
      node =>
        node.type.toLowerCase().includes('function') ||
        node.type.toLowerCase().includes('code')
    )

    if (functionNode) {
      return {
        result: {
          type: 'object',
          description: 'Processed data from function node',
        },
        items: {
          type: 'array',
          description: 'Array of result items',
        },
      }
    }

    return {
      success: {
        type: 'boolean',
        description: 'Workflow execution success status',
      },
      data: {
        type: 'object',
        description: 'Output data from the workflow',
      },
      executionId: {
        type: 'string',
        description: 'n8n execution ID',
      },
    }
  }
}

export function createN8nClient(): N8nApiClient {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY

  if (!baseUrl || !apiKey) {
    throw new Error(
      'N8N_BASE_URL and N8N_API_KEY environment variables are required'
    )
  }

  return new N8nApiClient(baseUrl, apiKey)
}
