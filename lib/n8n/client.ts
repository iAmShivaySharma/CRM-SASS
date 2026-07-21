export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  createdAt: string
  updatedAt: string
  versionId?: string
  description?: string
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

  private getTriggerInfo(workflow: N8nWorkflow): {
    node: N8nNode | null
    type: 'webhook' | 'form' | 'manual' | 'schedule' | 'other'
    webhookPath: string | null
  } {
    for (const node of workflow.nodes) {
      const t = node.type.toLowerCase()

      if (t.includes('respond') || t.includes('wait')) continue

      if (t === 'n8n-nodes-base.webhook' || t.includes('webhooktrigger')) {
        return {
          node,
          type: 'webhook',
          webhookPath: node.parameters?.path || null,
        }
      }
      if (t.includes('formtrigger')) {
        return {
          node,
          type: 'form',
          webhookPath: node.parameters?.path || (node as any).webhookId || null,
        }
      }
      if (t.includes('manualtrigger')) {
        return { node, type: 'manual', webhookPath: null }
      }
      if (t.includes('scheduletrigger') || t.includes('cron')) {
        return { node, type: 'schedule', webhookPath: null }
      }
    }

    const anyTrigger = workflow.nodes.find(n =>
      n.type.toLowerCase().includes('trigger')
    )
    if (anyTrigger) {
      return {
        node: anyTrigger,
        type: 'other',
        webhookPath: anyTrigger.parameters?.path || null,
      }
    }

    return { node: null, type: 'other', webhookPath: null }
  }

  async updateWorkflow(
    workflowId: string,
    data: Partial<N8nWorkflow>
  ): Promise<N8nWorkflow> {
    if (!data.name) {
      const existing = await this.getWorkflow(workflowId)
      data.name = existing.name
    }
    const { settings: _settings, ...safeData } = data
    return this.request<N8nWorkflow>(`/workflows/${workflowId}`, {
      method: 'PUT',
      body: JSON.stringify(safeData),
    })
  }

  async activateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${workflowId}/activate`, {
      method: 'POST',
    })
  }

  async deactivateWorkflow(workflowId: string): Promise<N8nWorkflow> {
    return this.request<N8nWorkflow>(`/workflows/${workflowId}/deactivate`, {
      method: 'POST',
    })
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
    return this.executeWorkflowAuto(workflowId, options.data || {})
  }

  async executeWorkflowWithCredentials(
    workflowId: string,
    options: {
      data?: Record<string, any>
      credentials?: {
        openrouter?: { apiKey: string }
        openai?: { apiKey: string }
        [key: string]: any
      }
      runData?: Record<string, any>
      pinData?: Record<string, any>
      startNodes?: string[]
      destinationNode?: string
    } = {}
  ): Promise<N8nExecuteWorkflowResponse> {
    const payload: Record<string, any> = { ...(options.data || {}) }

    if (options.credentials?.openrouter?.apiKey) {
      payload.openrouter_api_key = options.credentials.openrouter.apiKey
      payload.apiKey = options.credentials.openrouter.apiKey
    }
    if (options.credentials?.openai?.apiKey) {
      payload.openai_api_key = options.credentials.openai.apiKey
    }

    return this.executeWorkflowAuto(workflowId, payload)
  }

  private async executeWorkflowAuto(
    workflowId: string,
    data: Record<string, any>
  ): Promise<N8nExecuteWorkflowResponse> {
    const workflow = await this.getWorkflow(workflowId)
    const trigger = this.getTriggerInfo(workflow)

    console.log(
      `[n8n] executeWorkflowAuto: "${workflow.name}" (id: ${workflowId}, active: ${workflow.active}, trigger: ${trigger.type}, path: ${trigger.webhookPath})`
    )

    const existingCrmWebhook = workflow.nodes.find(
      n => n.name === 'CRM API Trigger'
    )
    if (existingCrmWebhook?.parameters?.path) {
      if (!workflow.active) {
        try {
          await this.activateWorkflow(workflowId)
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      const result = await this.callWebhook(
        existingCrmWebhook.parameters.path,
        'webhook',
        data
      )
      if (result) return result
      console.log(`[n8n] Existing CRM webhook failed, will re-add...`)
    }

    if (trigger.webhookPath && trigger.type === 'webhook') {
      if (!workflow.active) {
        try {
          await this.activateWorkflow(workflowId)
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      const result = await this.callWebhook(
        trigger.webhookPath,
        'webhook',
        data
      )
      if (result) return result
    }

    console.log(
      `[n8n] Workflow "${workflow.name}" — adding CRM API Trigger webhook...`
    )
    return this.addWebhookAndExecute(workflow, trigger, data)
  }

  private findSetNodeAfterTrigger(
    workflow: N8nWorkflow,
    triggerNodeName: string
  ): { setNode: N8nNode | null; nextNodeName: string | null } {
    const triggerConns = workflow.connections[triggerNodeName]
    if (!triggerConns?.main?.[0]?.[0]) {
      return { setNode: null, nextNodeName: null }
    }

    const firstDownstream = triggerConns.main[0][0].node
    const firstNode = workflow.nodes.find(n => n.name === firstDownstream)

    if (firstNode && firstNode.type.toLowerCase().includes('set')) {
      const setConns = workflow.connections[firstNode.name]
      const afterSet = setConns?.main?.[0]?.[0]?.node || null
      return { setNode: firstNode, nextNodeName: afterSet }
    }

    return { setNode: null, nextNodeName: null }
  }

  private extractSetNodeDefaults(setNode: N8nNode): Record<string, any> {
    const defaults: Record<string, any> = {}
    const assignments = setNode.parameters?.assignments?.assignments
    if (Array.isArray(assignments)) {
      for (const a of assignments) {
        if (a.name && a.value !== undefined) {
          defaults[a.name] = a.value
        }
      }
    }
    return defaults
  }

  private async addWebhookAndExecute(
    workflow: N8nWorkflow,
    trigger: { node: N8nNode | null; type: string; webhookPath: string | null },
    data: Record<string, any>
  ): Promise<N8nExecuteWorkflowResponse> {
    const webhookPath = `crm-execute-${workflow.id}`
    const triggerNodeName = trigger.node?.name || 'Manual Trigger'

    console.log(
      `[n8n] Adding CRM API Trigger to "${workflow.name}" (trigger: "${triggerNodeName}")`
    )

    const { setNode } = this.findSetNodeAfterTrigger(workflow, triggerNodeName)

    const triggerPos = trigger.node?.position || [250, 300]
    const webhookNode: N8nNode = {
      id: `crm-webhook-${Date.now()}`,
      name: 'CRM API Trigger',
      type: 'n8n-nodes-base.webhook',
      typeVersion: 2,
      position: [triggerPos[0], triggerPos[1] - 160] as [number, number],
      parameters: {
        path: webhookPath,
        httpMethod: 'POST',
        responseMode: 'lastNode',
        options: {},
      },
    }

    const existingCrmIdx = workflow.nodes.findIndex(
      n => n.name === 'CRM API Trigger'
    )
    const baseNodes =
      existingCrmIdx >= 0
        ? workflow.nodes.filter((_, i) => i !== existingCrmIdx)
        : workflow.nodes

    const updatedNodes = [...baseNodes, webhookNode]

    const triggerConnections = workflow.connections[triggerNodeName]
    const webhookTargetNode = triggerConnections?.main?.[0]?.[0]?.node || ''

    const updatedConnections = {
      ...workflow.connections,
      'CRM API Trigger': webhookTargetNode
        ? { main: [[{ node: webhookTargetNode, type: 'main', index: 0 }]] }
        : { main: [[]] },
    }

    if (setNode) {
      const setIdx = updatedNodes.findIndex(n => n.name === setNode.name)
      if (setIdx >= 0) {
        const assignments =
          updatedNodes[setIdx].parameters?.assignments?.assignments
        if (Array.isArray(assignments)) {
          const updatedAssignments = assignments.map((a: any) => ({
            ...a,
            value: `={{ $json.body["${a.name}"] || $json["${a.name}"] || ${JSON.stringify(a.value || '')} }}`,
            type: 'string',
          }))
          updatedNodes[setIdx] = {
            ...updatedNodes[setIdx],
            parameters: {
              ...updatedNodes[setIdx].parameters,
              assignments: { assignments: updatedAssignments },
            },
          }
          console.log(
            `[n8n] Modified Set node "${setNode.name}" to accept webhook input with defaults`
          )
        }
      }
    }

    await this.updateWorkflow(workflow.id, {
      name: workflow.name,
      nodes: updatedNodes,
      connections: updatedConnections,
    })

    try {
      await this.activateWorkflow(workflow.id)
      console.log(`[n8n] Workflow "${workflow.name}" activated`)
    } catch (err) {
      console.warn(
        `[n8n] Activation warning for "${workflow.name}":`,
        err instanceof Error ? err.message : err
      )
    }

    await new Promise(resolve => setTimeout(resolve, 2000))

    const result = await this.callWebhook(webhookPath, 'webhook', data)
    if (result) return result

    throw new Error(
      `Added webhook trigger to workflow "${workflow.name}" but could not reach it. ` +
        `Check that the workflow is active in n8n. Webhook path: /webhook/${webhookPath}`
    )
  }

  private async callWebhook(
    path: string,
    type: string,
    data: Record<string, any>
  ): Promise<N8nExecuteWorkflowResponse | null> {
    const prefix = type === 'form' ? 'form' : 'webhook'
    const urls = [
      `${this.baseUrl}/${prefix}/${path}`,
      `${this.baseUrl}/webhook/${path}`,
    ]
    const uniqueUrls = [...new Set(urls)]

    for (const url of uniqueUrls) {
      try {
        console.log(`[n8n] Calling webhook: ${url}`)
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })
        if (response.ok) {
          const text = await response.text()
          const result = text ? JSON.parse(text) : {}
          console.log(`[n8n] Webhook responded OK from: ${url}`)
          return this.normalizeWebhookResponse(result)
        }
        const errBody = await response.text().catch(() => '')
        console.log(
          `[n8n] Webhook ${url} returned ${response.status}: ${errBody}`
        )
      } catch (err) {
        console.error(
          `[n8n] Webhook ${url} fetch error:`,
          err instanceof Error ? err.message : err
        )
      }
    }
    return null
  }

  private normalizeWebhookResponse(result: any): N8nExecuteWorkflowResponse {
    if (result?.data?.resultData) {
      return result as N8nExecuteWorkflowResponse
    }

    return {
      data: {
        resultData: {
          runData: {
            webhookResponse: [{ data: { main: [[{ json: result }]] } }],
          },
        },
      },
      finished: true,
      mode: 'webhook',
      startedAt: new Date().toISOString(),
      stoppedAt: new Date().toISOString(),
    }
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

  async testConnection(): Promise<{
    success: boolean
    version?: string
    error?: string
  }> {
    try {
      await this.getWorkflows({ limit: 1 })
      return { success: true, version: 'v1' }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }
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
    const webhookSuffix = `${workflowId}-${crypto.randomUUID()}`
    return `${this.baseUrl}/webhook/${webhookSuffix}`
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
    maxWaitTime: number = 3600000
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
      } catch {
        await new Promise(resolve => setTimeout(resolve, pollInterval))
      }
    }

    throw new Error(`Execution monitoring timed out after ${maxWaitTime}ms`)
  }

  private isExecutionWaitingForInput(execution: N8nExecution): boolean {
    const runData = execution.data?.resultData?.runData || {}

    for (const [, nodeData] of Object.entries(runData)) {
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

    for (const [, nodeData] of Object.entries(runData)) {
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

    for (const [, nodeData] of Object.entries(runData)) {
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

    for (const [, nodeData] of Object.entries(runData)) {
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
    } catch {
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
    hasWaitNodes: boolean
  } {
    const nodes = workflow.nodes || []

    const hasAiNodes = nodes.some(node => {
      const nodeType = node.type.toLowerCase()
      return (
        nodeType.includes('openrouter') ||
        nodeType.includes('ai') ||
        nodeType.includes('openai') ||
        nodeType.includes('anthropic') ||
        nodeType.includes('claude') ||
        nodeType.includes('gpt') ||
        nodeType.includes('llm') ||
        nodeType.includes('@n8n/n8n-nodes-langchain') ||
        nodeType.includes('chatgpt')
      )
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

    const hasWaitNodes = nodes.some(node => {
      const t = node.type.toLowerCase()
      if (t === 'n8n-nodes-base.wait') return true
      if (t.includes('form') && !t.includes('trigger')) return true
      return false
    })

    return {
      requiresApiKey: hasAiNodes,
      estimatedCost,
      category,
      inputSchema,
      outputSchema,
      hasWaitNodes,
    }
  }

  private extractInputSchema(nodes: N8nNode[]): Record<string, any> {
    const formTrigger = nodes.find(n =>
      n.type.toLowerCase().includes('formtrigger')
    )
    if (formTrigger?.parameters?.formFields?.values) {
      const schema: Record<string, any> = {}
      for (const field of formTrigger.parameters.formFields.values) {
        const name = field.fieldLabel || field.fieldName
        if (!name) continue
        schema[name] = {
          type:
            field.fieldType === 'dropdown'
              ? 'select'
              : field.fieldType || 'string',
          required: field.requiredField !== false,
          description: name,
          ...(field.fieldOptions?.values && {
            options: field.fieldOptions.values.map((o: any) => o.option || o),
          }),
        }
      }
      if (Object.keys(schema).length > 0) return schema
    }

    for (const node of nodes) {
      const t = node.type.toLowerCase()
      if (
        (t.includes('webhook') || t.includes('manualtrigger')) &&
        node.parameters?.jsonSchema
      ) {
        try {
          return JSON.parse(node.parameters.jsonSchema)
        } catch {}
      }
    }

    const setNode = nodes.find(n => n.type.toLowerCase().includes('set'))
    if (setNode?.parameters?.assignments?.assignments) {
      const schema: Record<string, any> = {}
      for (const a of setNode.parameters.assignments.assignments) {
        if (!a.name) continue
        const fieldType = a.type || 'string'

        let defaultVal = a.value || ''
        if (typeof defaultVal === 'string' && defaultVal.startsWith('={{')) {
          const lastFallback =
            defaultVal.match(/\|\|\s*"([^"]*)"[^|]*}}$/) ||
            defaultVal.match(/\|\|\s*'([^']*)'[^|]*}}$/)
          defaultVal = lastFallback ? lastFallback[1] : ''
        }

        const isLongText =
          a.name.toLowerCase().includes('message') ||
          a.name.toLowerCase().includes('content') ||
          a.name.toLowerCase().includes('description') ||
          (typeof defaultVal === 'string' && defaultVal.length > 80)
        schema[a.name] = {
          type: isLongText ? 'string' : fieldType,
          required: true,
          description: a.name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (s: string) => s.toUpperCase())
            .trim(),
          defaultValue: defaultVal,
        }
      }
      if (Object.keys(schema).length > 0) return schema
    }

    const triggerNames = new Set(
      nodes
        .filter(n => {
          const t = n.type.toLowerCase()
          return (
            t.includes('trigger') ||
            (t.includes('webhook') && !t.includes('respond'))
          )
        })
        .map(n => n.name)
    )

    const skip = new Set([
      'output',
      'id',
      'error',
      'success',
      'results',
      'result',
      'item',
      'items',
      'response',
      'status',
      'json',
      'binary',
      'executionId',
      'index',
      'pairedItem',
      'node',
      'runIndex',
    ])

    const inferredFields = new Map<string, string>()

    for (const node of nodes) {
      if (triggerNames.has(node.name)) continue
      const paramStr = JSON.stringify(node.parameters || {})

      for (const m of paramStr.matchAll(/\$json[\?.]?\.(\w+)/g)) {
        if (!skip.has(m[1])) inferredFields.set(m[1], 'string')
      }

      for (const m of paramStr.matchAll(
        /\$\(['"](?:Webhook|Trigger|Manual Trigger|Form Trigger|CRM API Trigger)['"]\)\.item\.json[\?.]?\.(\w+)/g
      )) {
        if (!skip.has(m[1])) inferredFields.set(m[1], 'string')
      }

      for (const m of paramStr.matchAll(/\$input\.item\.json[\?.]?\.(\w+)/g)) {
        if (!skip.has(m[1])) inferredFields.set(m[1], 'string')
      }
    }

    if (inferredFields.size > 0) {
      const schema: Record<string, any> = {}
      for (const [field, type] of inferredFields) {
        schema[field] = {
          type,
          required: true,
          description: field
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, s => s.toUpperCase())
            .trim(),
        }
      }
      return schema
    }

    return {}
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
