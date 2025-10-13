import { NextRequest, NextResponse } from 'next/server'
import { WorkflowCatalog } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'

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
    const workflow = await WorkflowCatalog.findById(id)
      .populate('category', 'name description icon')

    if (!workflow) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      )
    }

    if (!workflow.isActive) {
      return NextResponse.json(
        { error: 'Workflow is not active' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: workflow
    })
  } catch (error) {
    console.error('Get workflow details error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch workflow details',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}