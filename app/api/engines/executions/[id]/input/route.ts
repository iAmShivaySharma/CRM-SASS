import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkflowExecution, UserInput } from '@/lib/mongodb/models'
import { createN8nClient } from '@/lib/n8n/client'
import mongoose from 'mongoose'

interface RouteContext {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteContext) {
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

    const { id } = params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid execution ID' },
        { status: 400 }
      )
    }

    // Get execution
    const execution = await WorkflowExecution.findOne({
      _id: id,
      userId: auth.user.id,
      workspaceId: auth.workspace.id
    }).populate('workflowCatalogId', 'name description')

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Get current input requirement
    const inputRequirement = execution.getCurrentInputRequirement()

    if (!inputRequirement) {
      return NextResponse.json({
        success: true,
        data: {
          isWaitingForInput: false,
          message: 'Execution is not waiting for input'
        }
      })
    }

    // Get pending input request
    const userInput = await UserInput.findOne({
      executionId: execution._id,
      status: 'pending',
      timeoutAt: { $gt: new Date() }
    })

    return NextResponse.json({
      success: true,
      data: {
        isWaitingForInput: true,
        execution: {
          _id: execution._id,
          status: execution.status,
          workflowName: execution.workflowCatalogId?.name,
          createdAt: execution.createdAt
        },
        inputRequirement: {
          step: inputRequirement.step,
          inputSchema: inputRequirement.inputSchema,
          timeoutAt: inputRequirement.timeoutAt,
          timeRemaining: userInput?.timeRemaining || 0,
          isExpired: inputRequirement.isExpired
        },
        userInput: userInput ? {
          _id: userInput._id,
          step: userInput.step,
          metadata: userInput.metadata,
          createdAt: userInput.createdAt
        } : null
      }
    })

  } catch (error) {
    console.error('Get execution input API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get execution input status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
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

    const { id } = params
    const { inputData, validateOnly = false } = await request.json()

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: 'Invalid execution ID' },
        { status: 400 }
      )
    }

    if (!inputData || typeof inputData !== 'object') {
      return NextResponse.json(
        { error: 'Input data is required and must be an object' },
        { status: 400 }
      )
    }

    // Get execution
    const execution = await WorkflowExecution.findOne({
      _id: id,
      userId: auth.user.id,
      workspaceId: auth.workspace.id
    }).populate('workflowCatalogId', 'name description')

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    // Check if execution is waiting for input
    if (!execution.dynamicInput.isWaitingForInput) {
      return NextResponse.json(
        { error: 'Execution is not waiting for input' },
        { status: 400 }
      )
    }

    // Check if input has expired
    const inputRequirement = execution.getCurrentInputRequirement()
    if (inputRequirement?.isExpired) {
      return NextResponse.json(
        { error: 'Input request has expired' },
        { status: 410 }
      )
    }

    // Get pending user input
    const userInput = await UserInput.findOne({
      executionId: execution._id,
      status: 'pending',
      timeoutAt: { $gt: new Date() }
    })

    if (!userInput) {
      return NextResponse.json(
        { error: 'No pending input request found' },
        { status: 404 }
      )
    }

    // Validate input data against schema
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

    // If validation only, return success
    if (validateOnly) {
      return NextResponse.json({
        success: true,
        message: 'Input data is valid',
        data: {
          isValid: true,
          sanitizedInput: validationResult.sanitizedData
        }
      })
    }

    try {
      // Create n8n client
      const n8nClient = createN8nClient()

      // Resume workflow with input
      const n8nResult = await n8nClient.resumeWorkflowWithInput(
        execution.n8nExecutionId,
        execution.dynamicInput.webhookUrl!,
        validationResult.sanitizedData
      )

      // Update execution with received input
      await execution.receiveInput(validationResult.sanitizedData)

      // Mark user input as received
      await userInput.markReceived(validationResult.sanitizedData)

      // Check if workflow is now complete or waiting for more input
      if (n8nResult.finished) {
        await execution.markAsCompleted(n8nResult.data?.resultData || {},
          Date.now() - (execution.startedAt?.getTime() || execution.createdAt.getTime()))
      }

      console.log(`Input received for execution ${execution._id} at step ${userInput.step}`)

      return NextResponse.json({
        success: true,
        message: 'Input received successfully',
        data: {
          execution: {
            _id: execution._id,
            status: execution.status,
            currentStep: execution.dynamicInput.currentStep
          },
          userInput: {
            _id: userInput._id,
            status: userInput.status,
            receivedAt: userInput.receivedAt
          },
          workflowStatus: {
            finished: n8nResult.finished,
            isWaitingForMoreInput: execution.dynamicInput.isWaitingForInput
          }
        }
      })

    } catch (n8nError) {
      console.error('n8n resume execution error:', n8nError)

      return NextResponse.json({
        success: false,
        error: 'Failed to resume workflow execution',
        details: n8nError instanceof Error ? n8nError.message : 'Unknown n8n error'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Provide execution input API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to provide execution input',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to validate input data against schema
function validateInputData(inputData: any, schema: any): {
  isValid: boolean
  errors: string[]
  sanitizedData?: any
} {
  const errors: string[] = []
  const sanitizedData: any = {}

  if (!schema || typeof schema !== 'object') {
    return {
      isValid: true,
      errors: [],
      sanitizedData: inputData
    }
  }

  // Validate each field in the schema
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fieldConfig = fieldSchema as any
    const value = inputData[fieldName]

    // Check required fields
    if (fieldConfig.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${fieldName}' is required`)
      continue
    }

    // Skip validation for optional empty fields
    if (!fieldConfig.required && (value === undefined || value === null || value === '')) {
      continue
    }

    // Type validation
    switch (fieldConfig.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`Field '${fieldName}' must be a string`)
        } else {
          sanitizedData[fieldName] = value.trim()

          // Length validation
          if (fieldConfig.minLength && value.length < fieldConfig.minLength) {
            errors.push(`Field '${fieldName}' must be at least ${fieldConfig.minLength} characters`)
          }
          if (fieldConfig.maxLength && value.length > fieldConfig.maxLength) {
            errors.push(`Field '${fieldName}' must be at most ${fieldConfig.maxLength} characters`)
          }
        }
        break

      case 'number':
        const numValue = Number(value)
        if (isNaN(numValue)) {
          errors.push(`Field '${fieldName}' must be a number`)
        } else {
          sanitizedData[fieldName] = numValue

          // Range validation
          if (fieldConfig.min !== undefined && numValue < fieldConfig.min) {
            errors.push(`Field '${fieldName}' must be at least ${fieldConfig.min}`)
          }
          if (fieldConfig.max !== undefined && numValue > fieldConfig.max) {
            errors.push(`Field '${fieldName}' must be at most ${fieldConfig.max}`)
          }
        }
        break

      case 'boolean':
        if (typeof value !== 'boolean') {
          errors.push(`Field '${fieldName}' must be a boolean`)
        } else {
          sanitizedData[fieldName] = value
        }
        break

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`Field '${fieldName}' must be an array`)
        } else {
          sanitizedData[fieldName] = value
        }
        break

      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          errors.push(`Field '${fieldName}' must be an object`)
        } else {
          sanitizedData[fieldName] = value
        }
        break

      default:
        sanitizedData[fieldName] = value
    }

    // Enum validation
    if (fieldConfig.enum && Array.isArray(fieldConfig.enum)) {
      if (!fieldConfig.enum.includes(value)) {
        errors.push(`Field '${fieldName}' must be one of: ${fieldConfig.enum.join(', ')}`)
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: errors.length === 0 ? sanitizedData : undefined
  }
}