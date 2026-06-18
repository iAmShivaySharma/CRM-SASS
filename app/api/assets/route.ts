import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Asset } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

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
    const workspaceId = searchParams.get('workspaceId') || auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query
    const query: any = { workspaceId }

    if (category) {
      query.category = category
    }

    if (status) {
      query.status = status
    }

    if (search) {
      query.$text = { $search: search }
    }

    // Get total count
    const total = await Asset.countDocuments(query)

    // Get assets
    let assetsQuery = Asset.find(query)
      .populate('createdBy', 'fullName email')

    if (search) {
      assetsQuery = assetsQuery.sort({ score: { $meta: 'textScore' } })
    } else {
      assetsQuery = assetsQuery.sort({ createdAt: -1 })
    }

    const assets = await assetsQuery
      .skip((page - 1) * limit)
      .limit(limit)

    return NextResponse.json({
      assets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    log.error('Get assets error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const workspaceId = body.workspaceId || auth.user.lastActiveWorkspaceId

    if (!workspaceId) {
      return NextResponse.json({ error: 'No workspace selected' }, { status: 400 })
    }

    const {
      name,
      category,
      brand,
      model,
      serialNumber,
      purchaseDate,
      purchasePrice,
      location,
      subcategory,
      assetTag,
      vendor,
      condition,
      status,
      department,
      warranty,
      specifications,
      images,
      documents,
      depreciation,
      insurance,
      notes
    } = body

    if (!name || !category || !brand || !model || !serialNumber || !purchaseDate || purchasePrice === undefined || !location) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, brand, model, serialNumber, purchaseDate, purchasePrice, location' },
        { status: 400 }
      )
    }

    const asset = new Asset({
      workspaceId,
      name,
      category,
      brand,
      model,
      serialNumber,
      purchaseDate: new Date(purchaseDate),
      purchasePrice,
      location,
      createdBy: auth.user._id,
      subcategory,
      assetTag,
      vendor,
      condition,
      status,
      department,
      warranty,
      specifications,
      images,
      documents,
      depreciation,
      insurance,
      notes
    })

    await asset.save()

    log.info('Asset created', {
      userId: auth.user._id,
      workspaceId,
      assetId: asset._id,
      name,
      category,
      serialNumber
    })

    return NextResponse.json(
      { success: true, asset },
      { status: 201 }
    )
  } catch (error) {
    log.error('Create asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create asset' },
      { status: 500 }
    )
  }
}
