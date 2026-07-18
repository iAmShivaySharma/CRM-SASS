import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { createN8nClient } from '@/lib/n8n/client'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const n8nClient = createN8nClient()

    let n8nWorkflow
    try {
      n8nWorkflow = await n8nClient.getWorkflow(id)
    } catch {
      return NextResponse.json({ error: 'Workflow not found' }, { status: 404 })
    }

    const analysis = n8nClient.analyzeWorkflow(n8nWorkflow)

    return NextResponse.json({
      success: true,
      data: {
        _id: n8nWorkflow.id,
        n8nWorkflowId: n8nWorkflow.id,
        name: n8nWorkflow.name,
        description: n8nWorkflow.description?.trim() || n8nWorkflow.name,
        category: analysis.category,
        categoryName: analysis.category,
        tags: (n8nWorkflow.tags || []).map(t => t.name),
        requiresApiKey: analysis.requiresApiKey,
        estimatedCost: analysis.estimatedCost,
        inputSchema: analysis.inputSchema,
        outputSchema: analysis.outputSchema,
        hasWaitNodes: analysis.hasWaitNodes,
        isActive: n8nWorkflow.active,
        createdAt: n8nWorkflow.createdAt,
        updatedAt: n8nWorkflow.updatedAt,
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch workflow details',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
