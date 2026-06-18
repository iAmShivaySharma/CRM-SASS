import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { Asset } from '@/lib/mongodb/models'
import { log } from '@/lib/logging/logger'

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

    const asset = await Asset.findById(id)
      .populate('createdBy', 'fullName email')

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ asset })
  } catch (error) {
    log.error('Get asset error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    const body = await request.json()

    const asset = await Asset.findById(id)

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    const allowedFields = [
      'name', 'category', 'subcategory', 'brand', 'model', 'serialNumber',
      'assetTag', 'purchaseDate', 'purchasePrice', 'vendor', 'condition',
      'status', 'location', 'department', 'warranty', 'specifications',
      'images', 'documents', 'depreciation', 'insurance', 'notes'
    ]

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        asset[field] = body[field]
      }
    }

    await asset.save()

    log.info('Asset updated', {
      assetId: id,
      updatedBy: auth.user._id
    })

    const updated = await Asset.findById(id)
      .populate('createdBy', 'fullName email')

    return NextResponse.json({ success: true, asset: updated })
  } catch (error) {
    log.error('Update asset error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const asset = await Asset.findById(id)

    if (!asset) {
      return NextResponse.json(
        { error: 'Asset not found' },
        { status: 404 }
      )
    }

    if (asset.status !== 'available') {
      return NextResponse.json(
        { error: 'Only available assets can be deleted. This asset is currently ' + asset.status },
        { status: 400 }
      )
    }

    await Asset.findByIdAndDelete(id)

    log.info('Asset deleted', {
      assetId: id,
      deletedBy: auth.user._id
    })

    return NextResponse.json({ success: true, message: 'Asset deleted' })
  } catch (error) {
    log.error('Delete asset error:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
