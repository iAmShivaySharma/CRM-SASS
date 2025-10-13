import { NextRequest, NextResponse } from 'next/server'
import { WorkflowCatalog, WorkflowCategory } from '@/lib/mongodb/models'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'

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
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const requiresApiKey = searchParams.get('requiresApiKey')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    const query: any = { isActive: true }

    if (category && category !== 'All Categories') {
      const categoryDoc = await WorkflowCategory.findOne({ name: category })
      if (categoryDoc) {
        query.category = categoryDoc._id
      }
    }

    if (requiresApiKey !== null) {
      query.requiresApiKey = requiresApiKey === 'true'
    }

    // Build aggregation pipeline
    const pipeline: any[] = [
      { $match: query }
    ]

    // Add text search if provided
    if (search) {
      pipeline.unshift({
        $match: {
          $text: { $search: search }
        }
      })
    }

    // Add lookup for category
    pipeline.push(
      {
        $lookup: {
          from: 'workflowcategories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDoc'
        }
      },
      {
        $unwind: '$categoryDoc'
      },
      {
        $addFields: {
          categoryName: '$categoryDoc.name',
          categoryIcon: '$categoryDoc.icon'
        }
      },
      {
        $project: {
          categoryDoc: 0,
          n8nData: 0 // Exclude large n8n data from list view
        }
      }
    )

    // Add sorting
    pipeline.push({
      $sort: search
        ? { score: { $meta: 'textScore' }, 'usage.totalExecutions': -1 }
        : { 'usage.totalExecutions': -1, updatedAt: -1 }
    })

    // Get total count
    const countPipeline = [...pipeline]
    countPipeline.push({ $count: 'total' })

    // Add pagination
    pipeline.push(
      { $skip: offset },
      { $limit: limit }
    )

    const [workflows, countResult] = await Promise.all([
      WorkflowCatalog.aggregate(pipeline),
      WorkflowCatalog.aggregate(countPipeline)
    ])

    const total = countResult[0]?.total || 0

    // Get categories for filtering
    const categories = await WorkflowCategory.find({ isActive: true }).sort({ name: 1 })

    return NextResponse.json({
      success: true,
      data: {
        workflows,
        categories,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      }
    })
  } catch (error) {
    console.error('Get workflow catalog error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to fetch workflow catalog',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}