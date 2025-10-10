import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { UserInput, WorkflowExecution } from '@/lib/mongodb/models'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const priority = searchParams.get('priority')
    const workflowId = searchParams.get('workflowId')

    // Build query
    const query: any = {
      userId: auth.user.id,
      workspaceId: auth.workspace.id,
      status: 'pending',
      timeoutAt: { $gt: new Date() }
    }

    if (priority) {
      query['metadata.priority'] = priority
    }

    if (workflowId) {
      // First get executions for this workflow
      const executions = await WorkflowExecution.find({
        workflowCatalogId: workflowId,
        userId: auth.user.id,
        workspaceId: auth.workspace.id
      }).select('_id')

      const executionIds = executions.map(e => e._id)
      query.executionId = { $in: executionIds }
    }

    // Get pending inputs
    const pendingInputs = await UserInput.find(query)
      .populate('executionId', 'workflowCatalogId status startedAt')
      .populate({
        path: 'executionId',
        populate: {
          path: 'workflowCatalogId',
          select: 'name description category'
        }
      })
      .sort({ 'metadata.priority': -1, timeoutAt: 1 })
      .limit(limit)

    // Format response
    const formattedInputs = pendingInputs.map(input => ({
      _id: input._id,
      execution: {
        _id: input.executionId._id,
        workflowName: input.executionId.workflowCatalogId?.name,
        status: input.executionId.status,
        startedAt: input.executionId.startedAt
      },
      step: input.step,
      inputSchema: input.inputSchema,
      timeoutAt: input.timeoutAt,
      timeRemaining: input.timeRemaining,
      timeRemainingMinutes: input.timeRemainingMinutes,
      isExpired: input.isExpired,
      metadata: input.metadata,
      webhookUrl: input.webhookUrl,
      createdAt: input.createdAt,
      inputUrl: input.generateInputUrl(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    }))

    // Get summary stats
    const totalPending = await UserInput.countDocuments({
      userId: auth.user.id,
      workspaceId: auth.workspace.id,
      status: 'pending',
      timeoutAt: { $gt: new Date() }
    })

    const highPriorityCount = await UserInput.countDocuments({
      userId: auth.user.id,
      workspaceId: auth.workspace.id,
      status: 'pending',
      timeoutAt: { $gt: new Date() },
      'metadata.priority': 'high'
    })

    const expiringCount = await UserInput.countDocuments({
      userId: auth.user.id,
      workspaceId: auth.workspace.id,
      status: 'pending',
      timeoutAt: {
        $gt: new Date(),
        $lt: new Date(Date.now() + (15 * 60 * 1000)) // Expiring in 15 minutes
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        inputs: formattedInputs,
        pagination: {
          total: totalPending,
          limit,
          hasMore: formattedInputs.length === limit
        },
        summary: {
          totalPending,
          highPriorityCount,
          expiringCount
        }
      }
    })

  } catch (error) {
    console.error('Get pending inputs API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get pending inputs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}