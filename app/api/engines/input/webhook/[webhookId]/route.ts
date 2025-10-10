import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { WorkflowExecution, UserInput } from '@/lib/mongodb/models'
import { createN8nClient } from '@/lib/n8n/client'

interface RouteContext {
  params: {
    webhookId: string
  }
}

// Public webhook endpoint for n8n callbacks
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    await connectToMongoDB()

    const { webhookId } = params
    const webhookUrl = `${process.env.N8N_BASE_URL}/webhook/${webhookId}`

    // Get the execution waiting for this webhook
    const execution = await WorkflowExecution.findByWebhookUrl(webhookUrl)

    if (!execution) {
      return NextResponse.json(
        { error: 'No execution found waiting for this webhook' },
        { status: 404 }
      )
    }

    // Check if execution has timed out
    const inputRequirement = execution.getCurrentInputRequirement()
    if (inputRequirement?.isExpired) {
      await execution.markTimeout()
      return NextResponse.json(
        { error: 'Execution has timed out waiting for input' },
        { status: 410 }
      )
    }

    const inputData = await request.json()

    // Validate that we have some input data
    if (!inputData || typeof inputData !== 'object') {
      return NextResponse.json(
        { error: 'Invalid input data' },
        { status: 400 }
      )
    }

    // Get the corresponding user input record
    const userInput = await UserInput.findOne({
      executionId: execution._id,
      status: 'pending',
      timeoutAt: { $gt: new Date() }
    })

    if (userInput) {
      // Validate input against schema
      const validationResult = validateInputData(inputData, userInput.inputSchema)
      if (!validationResult.isValid) {
        return NextResponse.json(
          {
            error: 'Input validation failed',
            details: validationResult.errors
          },
          { status: 400 }
        )
      }

      // Mark user input as received
      await userInput.markReceived(validationResult.sanitizedData || inputData)
    }

    try {
      // Create n8n client
      const n8nClient = createN8nClient()

      // Resume workflow with input (this actually sends the data to n8n)
      const n8nResult = await n8nClient.resumeWorkflowWithInput(
        execution.n8nExecutionId,
        webhookUrl,
        inputData
      )

      // Update execution
      await execution.receiveInput(inputData)

      // Check if workflow is complete
      if (n8nResult.finished) {
        await execution.markAsCompleted(
          n8nResult.data?.resultData || {},
          Date.now() - (execution.startedAt?.getTime() || execution.createdAt.getTime())
        )
      }

      console.log(`Webhook input received for execution ${execution._id}`)

      // Return success response that n8n expects
      return NextResponse.json({
        success: true,
        message: 'Input received and workflow resumed',
        executionId: execution._id,
        status: execution.status
      })

    } catch (n8nError) {
      console.error('n8n webhook resume error:', n8nError)

      // Mark execution as failed
      await execution.markAsFailed(
        `Failed to resume workflow: ${n8nError instanceof Error ? n8nError.message : 'Unknown error'}`
      )

      return NextResponse.json({
        success: false,
        error: 'Failed to resume workflow',
        details: n8nError instanceof Error ? n8nError.message : 'Unknown error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Webhook input API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to process webhook input',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET endpoint to check webhook status
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    await connectToMongoDB()

    const { webhookId } = params
    const webhookUrl = `${process.env.N8N_BASE_URL}/webhook/${webhookId}`

    // Get the execution waiting for this webhook
    const execution = await WorkflowExecution.findByWebhookUrl(webhookUrl)
      .populate('workflowCatalogId', 'name description')
      .populate('userId', 'name email')

    if (!execution) {
      return NextResponse.json(
        { error: 'No execution found waiting for this webhook' },
        { status: 404 }
      )
    }

    // Get the input requirement
    const inputRequirement = execution.getCurrentInputRequirement()

    // Get user input record
    const userInput = await UserInput.findOne({
      executionId: execution._id,
      status: 'pending',
      timeoutAt: { $gt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        execution: {
          _id: execution._id,
          workflowName: execution.workflowCatalogId?.name,
          status: execution.status,
          user: {
            name: execution.userId?.name,
            email: execution.userId?.email
          }
        },
        inputRequirement: inputRequirement ? {
          step: inputRequirement.step,
          inputSchema: inputRequirement.inputSchema,
          timeoutAt: inputRequirement.timeoutAt,
          isExpired: inputRequirement.isExpired
        } : null,
        userInput: userInput ? {
          _id: userInput._id,
          metadata: userInput.metadata,
          timeRemaining: userInput.timeRemaining,
          timeRemainingMinutes: userInput.timeRemainingMinutes
        } : null
      }
    })

  } catch (error) {
    console.error('Get webhook status API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get webhook status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to validate input data (simplified version)
function validateInputData(inputData: any, schema: any): {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
} {
  if (!schema || typeof schema !== 'object') {
    return {
      isValid: true,
      errors: [],
      sanitizedData: inputData
    }
  }

  const errors: string[] = []
  const sanitizedData: any = {}

  for (const [fieldName, fieldConfig] of Object.entries(schema)) {
    const config = fieldConfig as any
    const value = inputData[fieldName]

    if (config.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${fieldName}' is required`)
      continue
    }

    if (value !== undefined && value !== null) {
      sanitizedData[fieldName] = value
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  }
}