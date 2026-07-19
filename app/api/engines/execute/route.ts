import { type NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import {
  WorkflowExecution,
  CustomerApiKey,
  WorkspaceMember,
} from '@/lib/mongodb/models'
import { createN8nClient } from '@/lib/n8n/client'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { workflowId, inputData, apiKeyType, apiKeyId, emailResults } = body

    if (!workflowId) {
      console.error(
        '[Execute] Missing workflowId. Received body:',
        JSON.stringify(body)
      )
      return NextResponse.json(
        { error: 'Workflow ID is required', receivedFields: Object.keys(body) },
        { status: 400 }
      )
    }

    const workspaceMember = await WorkspaceMember.findOne({
      userId: auth.user.id,
      status: 'active',
    }).sort({ createdAt: -1 })

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'No active workspace found' },
        { status: 403 }
      )
    }

    // Fetch workflow directly from n8n
    const n8nClient = createN8nClient()
    let n8nWorkflow
    try {
      n8nWorkflow = await n8nClient.getWorkflow(workflowId)
    } catch {
      return NextResponse.json(
        { error: 'Workflow not found in n8n' },
        { status: 404 }
      )
    }

    const analysis = n8nClient.analyzeWorkflow(n8nWorkflow)

    // Resolve API key
    let customerApiKey = null
    let actualApiKey = null
    let estimatedCost = 0

    if (apiKeyType === 'customer') {
      if (!apiKeyId) {
        return NextResponse.json(
          {
            error:
              'Customer API key ID is required when using customer API key',
          },
          { status: 400 }
        )
      }

      customerApiKey = await CustomerApiKey.findOne({
        _id: apiKeyId,
        userId: auth.user.id,
        workspaceId: workspaceMember.workspaceId,
        isActive: true,
      })

      if (!customerApiKey) {
        return NextResponse.json(
          { error: 'Customer API key not found or inactive' },
          { status: 404 }
        )
      }

      try {
        actualApiKey = customerApiKey.decryptApiKey()
        estimatedCost = 0
      } catch {
        return NextResponse.json(
          { error: 'Failed to decrypt customer API key' },
          { status: 500 }
        )
      }
    } else {
      actualApiKey = process.env.PLATFORM_OPENROUTER_API_KEY
      estimatedCost = analysis.estimatedCost

      if (!actualApiKey) {
        return NextResponse.json(
          { error: 'Platform API key not configured' },
          { status: 500 }
        )
      }
    }

    // Create execution record with a temporary unique ID (replaced after n8n responds)
    const execution = new WorkflowExecution({
      n8nWorkflowId: workflowId,
      n8nExecutionId: `pending-${crypto.randomUUID()}`,
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId,
      inputData: inputData || {},
      apiKeyUsed: {
        type: apiKeyType,
        provider: customerApiKey?.provider || 'openrouter',
        keyId: apiKeyType === 'customer' ? apiKeyId : undefined,
        cost: 0,
        tokensUsed: 0,
      },
      emailSent: false,
      status: 'running',
      startedAt: new Date(),
    })

    await execution.save()

    try {
      let n8nResult
      let inputsRequired: any[] = []

      if (analysis.hasWaitNodes) {
        const dynamicResult = await n8nClient.executeWorkflowWithDynamicInput(
          workflowId,
          {
            data: inputData || {},
            credentials:
              analysis.requiresApiKey && actualApiKey
                ? { openrouter: { apiKey: actualApiKey } }
                : undefined,
            inputCallback: async (inputSchema, webhookUrl) => {
              const UserInput = (await import('@/lib/mongodb/models')).UserInput

              const userInputRecord = new UserInput({
                executionId: execution._id,
                userId: auth.user.id,
                workspaceId: workspaceMember.workspaceId,
                step: execution.dynamicInput.currentStep + 1,
                webhookUrl,
                inputSchema,
                timeoutAt: new Date(Date.now() + 60 * 60 * 1000),
                metadata: {
                  workflowName: n8nWorkflow.name,
                  stepDescription: `Step ${execution.dynamicInput.currentStep + 1} - User input required`,
                  priority: 'medium',
                  requiresImmediate: false,
                },
              })

              await userInputRecord.save()
              await execution.markWaitingForInput(webhookUrl, inputSchema, 60)
            },
            timeoutMinutes: 60,
          }
        )

        n8nResult = dynamicResult.execution
        inputsRequired = dynamicResult.inputsRequired
      } else {
        if (analysis.requiresApiKey && actualApiKey) {
          n8nResult = await n8nClient.executeWorkflowWithCredentials(
            workflowId,
            {
              data: inputData || {},
              credentials: {
                openrouter: { apiKey: actualApiKey },
              },
            }
          )
        } else {
          n8nResult = await n8nClient.executeWorkflow(workflowId, {
            data: inputData || {},
          })
        }
      }

      if (inputsRequired.length > 0) {
        execution.status = 'waiting_for_input'
      } else if (n8nResult.finished) {
        execution.status = 'completed'
        execution.completedAt = new Date()
      } else {
        execution.status = 'running'
      }

      execution.n8nExecutionId =
        (n8nResult as any).id || n8nResult.startedAt || execution.n8nExecutionId

      const resultData = n8nResult.data?.resultData || {}
      const runData = resultData.runData || {}
      let extractedOutput: any = resultData

      const nodeOutputs = Object.values(runData)
      if (nodeOutputs.length > 0) {
        const items: any[] = []
        for (const nodeData of nodeOutputs) {
          if (Array.isArray(nodeData)) {
            for (const exec of nodeData) {
              const mainOutputs = exec?.data?.main?.[0]
              if (Array.isArray(mainOutputs)) {
                for (const item of mainOutputs) {
                  if (item?.json) items.push(item.json)
                }
              }
            }
          }
        }
        if (items.length === 1) {
          extractedOutput = items[0]
        } else if (items.length > 1) {
          extractedOutput = items
        }
      }

      execution.outputData = extractedOutput

      if (execution.completedAt && execution.startedAt) {
        execution.executionTimeMs =
          execution.completedAt.getTime() - execution.startedAt.getTime()
      }

      let tokensUsed = 0

      if (n8nResult.data?.resultData?.runData) {
        const runData = n8nResult.data.resultData.runData
        Object.values(runData).forEach((nodeData: any) => {
          if (Array.isArray(nodeData)) {
            nodeData.forEach((exec: any) => {
              if (exec?.data?.main?.[0]?.[0]?.json?.usage?.total_tokens) {
                tokensUsed += exec.data.main[0][0].json.usage.total_tokens
              }
            })
          }
        })
      }

      execution.apiKeyUsed = {
        type: apiKeyType,
        provider: customerApiKey?.provider || 'openrouter',
        cost: estimatedCost,
        tokensUsed,
      }

      await execution.save()

      if (customerApiKey) {
        await customerApiKey.recordUsage(tokensUsed)
      }

      return NextResponse.json({
        success: true,
        data: {
          _id: execution._id,
          status: execution.status,
          n8nExecutionId: execution.n8nExecutionId,
          outputData: execution.outputData,
          executionTimeMs: execution.executionTimeMs,
          apiKeyUsed: execution.apiKeyUsed,
          createdAt: execution.createdAt,
          completedAt: execution.completedAt,
          dynamicInput: {
            isWaitingForInput: execution.dynamicInput?.isWaitingForInput,
            currentStep: execution.dynamicInput?.currentStep,
            inputsRequired:
              inputsRequired.length > 0 ? inputsRequired : undefined,
          },
        },
      })
    } catch (n8nError) {
      execution.status = 'failed'
      execution.completedAt = new Date()
      execution.errorMessage =
        n8nError instanceof Error ? n8nError.message : 'Unknown execution error'
      execution.executionTimeMs =
        execution.completedAt.getTime() -
        (execution.startedAt?.getTime() || execution.createdAt.getTime())

      await execution.save()

      return NextResponse.json(
        {
          success: false,
          data: {
            _id: execution._id,
            status: execution.status,
            errorMessage: execution.errorMessage,
            executionTimeMs: execution.executionTimeMs,
            createdAt: execution.createdAt,
            completedAt: execution.completedAt,
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute workflow',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
