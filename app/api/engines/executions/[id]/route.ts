import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkflowExecution, WorkspaceMember } from '@/lib/mongodb/models'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id } = await params

    // Get user's current workspace
    const workspaceMember = await WorkspaceMember.findOne({
      userId: auth.user.id,
      status: 'active'
    }).sort({ createdAt: -1 })

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'No active workspace found' },
        { status: 403 }
      )
    }

    // Find execution
    const execution = await WorkflowExecution.findOne({
      _id: id,
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId
    })
      .populate('workflowCatalogId', 'name description category')

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
      emailSent: execution.emailSent,
      emailSentAt: execution.emailSentAt,
      createdAt: execution.createdAt,
      startedAt: execution.startedAt,
      completedAt: execution.completedAt,
      workflow: execution.workflowCatalogId
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