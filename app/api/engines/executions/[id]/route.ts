import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkflowExecution } from '@/lib/mongodb/models'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = params

    // Find execution
    const execution = await WorkflowExecution.findOne({
      _id: id,
      userId: auth.user.id,
      workspaceId: auth.workspace.id
    })
      .populate('workflowId', 'name description category')
      .lean()

    if (!execution) {
      return NextResponse.json(
        { error: 'Execution not found' },
        { status: 404 }
      )
    }

    const responseData = {
      _id: execution._id,
      status: execution.status,
      n8nExecutionId: execution.n8nExecutionId,
      inputData: execution.inputData,
      outputData: execution.outputData,
      executionTimeMs: execution.executionTimeMs,
      apiKeyUsed: execution.apiKeyUsed,
      errorMessage: execution.errorMessage,
      emailResults: execution.emailResults,
      createdAt: execution.createdAt,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      workflow: execution.workflowId
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Get execution details error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve execution details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}