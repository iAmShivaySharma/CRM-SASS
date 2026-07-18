import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { createN8nClient } from '@/lib/n8n/client'

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')?.toLowerCase()
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const n8nClient = createN8nClient()
    const { data: n8nWorkflows } = await n8nClient.getWorkflows()

    const workflows = n8nWorkflows.map(workflow => {
      const analysis = n8nClient.analyzeWorkflow(workflow)

      return {
        _id: workflow.id,
        n8nWorkflowId: workflow.id,
        name: workflow.name,
        description: workflow.description?.trim() || workflow.name,
        category: analysis.category,
        categoryName: analysis.category,
        categoryIcon: 'Zap',
        tags: (workflow.tags || []).map(t => t.name),
        requiresApiKey: analysis.requiresApiKey,
        estimatedCost: analysis.estimatedCost,
        apiKeyProvider: analysis.requiresApiKey ? 'openrouter' : 'platform',
        inputSchema: analysis.inputSchema,
        outputSchema: analysis.outputSchema,
        hasWaitNodes: analysis.hasWaitNodes,
        isActive: workflow.active,
        usage: {
          totalExecutions: 0,
          avgExecutionTime: 0,
          successRate: 100,
        },
        createdAt: workflow.createdAt,
        updatedAt: workflow.updatedAt,
      }
    })

    // Filter by search
    const filtered = search
      ? workflows.filter(
          w =>
            w.name.toLowerCase().includes(search) ||
            w.description.toLowerCase().includes(search) ||
            w.tags.some(t => t.toLowerCase().includes(search))
        )
      : workflows

    // Paginate
    const total = filtered.length
    const paginated = filtered.slice(offset, offset + limit)

    // Extract unique categories
    const categorySet = new Set(workflows.map(w => w.categoryName))
    const categories = Array.from(categorySet).map((name, i) => ({
      _id: name,
      name,
      description: '',
      icon: 'Zap',
      sortOrder: i,
    }))

    return NextResponse.json({
      success: true,
      data: {
        workflows: paginated,
        categories,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch workflows from n8n',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
