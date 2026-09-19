import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Campaign, CampaignEnrollment } from '@/lib/mongodb/models/Campaign'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const campaign = await Campaign.findById(id).lean()
    if (!campaign) {
      return NextResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    const enrollments = await CampaignEnrollment.find({ campaignId: id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({ success: true, campaign, enrollments })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()

    const campaign = await Campaign.findById(id)
    if (!campaign) {
      return NextResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (body.name) {
      campaign.name = body.name
    }
    if (body.description !== undefined) {
      campaign.description = body.description
    }
    if (body.steps) {
      campaign.steps = body.steps
    }
    if (body.status) {
      campaign.status = body.status
    }

    await campaign.save()

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    await CampaignEnrollment.deleteMany({ campaignId: id })
    await Campaign.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Campaign deleted' })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
