import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkflowCatalog, WorkflowExecution, CustomerApiKey } from '@/lib/mongodb/models'
import { createN8nClient } from '@/lib/n8n/client'
import mongoose from 'mongoose'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    // Verify authentication
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { workflowId, inputData, apiKeyType, apiKeyId, emailResults } = await request.json()

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      )
    }

    // Get workflow from catalog
    const workflow = await WorkflowCatalog.findById(workflowId).populate('category')
    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    // Initialize execution record
    const execution = new WorkflowExecution({
      workflowId: workflow._id,
      userId: auth.user.id,
      workspaceId: auth.workspace.id,
      inputData: inputData || {},
      apiKeyType,
      apiKeyId,
      emailResults: emailResults || false,
      status: 'pending'
    })

    let customerApiKey = null
    let actualApiKey = null
    let estimatedCost = 0

    // Handle API key selection
    if (apiKeyType === 'customer') {
      if (!apiKeyId) {
        return NextResponse.json(
          { error: 'Customer API key ID is required when using customer API key' },
          { status: 400 }
        )
      }

      // Get and validate customer API key
      customerApiKey = await CustomerApiKey.findOne({
        _id: apiKeyId,
        userId: auth.user.id,
        workspaceId: auth.workspace.id,
        isActive: true
      })

      if (!customerApiKey) {
        return NextResponse.json(
          { error: 'Customer API key not found or inactive' },
          { status: 404 }
        )
      }

      try {
        actualApiKey = customerApiKey.decryptApiKey()
        estimatedCost = 0 // Free when using customer key
      } catch (error) {
        return NextResponse.json(
          { error: 'Failed to decrypt customer API key' },
          { status: 500 }
        )
      }
    } else {
      // Platform key - use environment variable
      actualApiKey = process.env.PLATFORM_OPENROUTER_API_KEY
      estimatedCost = workflow.estimatedCost

      if (!actualApiKey) {
        return NextResponse.json(
          { error: 'Platform API key not configured' },
          { status: 500 }
        )
      }
    }

    // Save initial execution record
    await execution.save()

    try {
      // Create n8n client
      const n8nClient = createN8nClient()

      // Update execution status
      execution.status = 'running'
      execution.startedAt = new Date()
      await execution.save()

      console.log(`Executing workflow ${workflow.name} for user ${auth.user.email}`)

      // Execute workflow in n8n with dynamic input support
      let n8nResult
      let inputsRequired: any[] = []

      // Check if workflow has wait nodes that might require dynamic input
      const hasWaitNodes = workflow.n8nData?.nodes?.some(node =>
        node.type.toLowerCase().includes('wait') ||
        node.type.toLowerCase().includes('webhook')
      )

      if (hasWaitNodes) {
        // Use dynamic input execution method
        const dynamicResult = await n8nClient.executeWorkflowWithDynamicInput(workflow.n8nWorkflowId, {
          data: inputData || {},
          credentials: workflow.requiresApiKey && actualApiKey ? {
            openrouter: { apiKey: actualApiKey }
          } : undefined,
          inputCallback: async (inputSchema, webhookUrl) => {
            // Create UserInput record for tracking
            const UserInput = (await import('@/lib/mongodb/models')).UserInput

            const userInputRecord = new UserInput({
              executionId: execution._id,
              userId: auth.user.id,
              workspaceId: auth.workspace.id,
              step: execution.dynamicInput.currentStep + 1,
              webhookUrl,
              inputSchema,
              timeoutAt: new Date(Date.now() + (60 * 60 * 1000)), // 1 hour timeout
              metadata: {
                workflowName: workflow.name,
                stepDescription: `Step ${execution.dynamicInput.currentStep + 1} - User input required`,
                priority: 'medium',
                requiresImmediate: false
              }
            })

            await userInputRecord.save()

            // Mark execution as waiting for input
            await execution.markWaitingForInput(webhookUrl, inputSchema, 60)

            console.log(`Workflow ${workflow.name} is waiting for input at step ${execution.dynamicInput.currentStep}`)
          },
          timeoutMinutes: 60
        })

        n8nResult = dynamicResult.execution
        inputsRequired = dynamicResult.inputsRequired
      } else {
        // Use regular execution for workflows without wait nodes
        if (workflow.requiresApiKey && actualApiKey) {
          n8nResult = await n8nClient.executeWorkflowWithCredentials(workflow.n8nWorkflowId, {
            data: inputData || {},
            credentials: {
              openrouter: {
                apiKey: actualApiKey
              }
            }
          })
        } else {
          n8nResult = await n8nClient.executeWorkflow(workflow.n8nWorkflowId, {
            data: inputData || {}
          })
        }
      }

      // Update execution with results
      if (inputsRequired.length > 0) {
        // Workflow is waiting for input, don't mark as completed yet
        execution.status = 'waiting_for_input'
      } else if (n8nResult.finished) {
        execution.status = 'completed'
        execution.completedAt = new Date()
      } else {
        execution.status = 'running'
      }

      execution.n8nExecutionId = n8nResult.startedAt // Use startedAt as execution ID for now
      execution.outputData = n8nResult.data?.resultData || {}

      if (execution.completedAt) {
        execution.executionTimeMs = execution.completedAt.getTime() - execution.startedAt.getTime()
      }

      // Calculate actual cost and token usage
      let tokensUsed = 0
      let actualCost = estimatedCost

      // Try to extract token usage from n8n result if available
      if (n8nResult.data?.resultData?.runData) {
        const runData = n8nResult.data.resultData.runData
        // Look for OpenRouter or AI node results that might contain token info
        Object.values(runData).forEach((nodeData: any) => {
          if (Array.isArray(nodeData)) {
            nodeData.forEach((execution: any) => {
              if (execution?.data?.main?.[0]?.[0]?.json?.usage?.total_tokens) {
                tokensUsed += execution.data.main[0][0].json.usage.total_tokens
              }
            })
          }
        })
      }

      execution.apiKeyUsed = {
        type: apiKeyType,
        provider: customerApiKey?.provider || 'openrouter',
        cost: actualCost,
        tokensUsed
      }

      await execution.save()

      // Update workflow usage stats
      await workflow.updateUsageStats(execution.executionTimeMs, true)

      // Update customer API key usage if applicable
      if (customerApiKey) {
        await customerApiKey.recordUsage(tokensUsed)
      }

      console.log(`Workflow execution completed successfully: ${execution._id}`)

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
            isWaitingForInput: execution.dynamicInput.isWaitingForInput,
            currentStep: execution.dynamicInput.currentStep,
            inputsRequired: inputsRequired.length > 0 ? inputsRequired : undefined
          }
        }
      })

    } catch (n8nError) {
      console.error('n8n execution error:', n8nError)

      // Update execution with error
      execution.status = 'failed'
      execution.completedAt = new Date()
      execution.errorMessage = n8nError instanceof Error ? n8nError.message : 'Unknown execution error'
      execution.executionTimeMs = execution.completedAt.getTime() - (execution.startedAt?.getTime() || execution.createdAt.getTime())

      await execution.save()

      // Update workflow usage stats (failed execution)
      await workflow.updateUsageStats(execution.executionTimeMs, false)

      return NextResponse.json({
        success: false,
        data: {
          _id: execution._id,
          status: execution.status,
          errorMessage: execution.errorMessage,
          executionTimeMs: execution.executionTimeMs,
          createdAt: execution.createdAt,
          completedAt: execution.completedAt
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Workflow execution API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to execute workflow',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}