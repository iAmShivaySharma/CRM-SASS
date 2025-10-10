import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkflowExecution } from '@/lib/mongodb/models'

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    const query: any = {
      userId: auth.user.id,
      workspaceId: auth.workspace.id
    }

    if (workflowId) {
      query.workflowId = workflowId
    }

    if (status) {
      query.status = status
    }

    // Get total count
    const total = await WorkflowExecution.countDocuments(query)

    // Get executions with pagination
    const executions = await WorkflowExecution.find(query)
      .populate('workflowId', 'name description')
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()

    const responseData = executions.map(execution => ({
      _id: execution._id,
      status: execution.status,
      n8nExecutionId: execution.n8nExecutionId,
      outputData: execution.outputData,
      executionTimeMs: execution.executionTimeMs,
      apiKeyUsed: execution.apiKeyUsed,
      errorMessage: execution.errorMessage,
      createdAt: execution.createdAt,
      completedAt: execution.completedAt,
      workflow: execution.workflowId
    }))

    return NextResponse.json({
      success: true,
      data: {
        data: responseData,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    })

  } catch (error) {
    console.error('Get executions error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve executions',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}