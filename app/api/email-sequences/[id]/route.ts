import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  EmailSequence,
  SequenceEnrollment,
} from '@/lib/mongodb/models/EmailSequence'

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

    const sequence = await EmailSequence.findById(id).lean()
    if (!sequence) {
      return NextResponse.json(
        { message: 'Sequence not found' },
        { status: 404 }
      )
    }

    const enrollments = await SequenceEnrollment.find({
      sequenceId: id,
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()

    return NextResponse.json({
      success: true,
      sequence,
      enrollments,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch sequence' },
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

    const sequence = await EmailSequence.findById(id)
    if (!sequence) {
      return NextResponse.json(
        { message: 'Sequence not found' },
        { status: 404 }
      )
    }

    if (body.name) sequence.name = body.name
    if (body.description !== undefined) sequence.description = body.description
    if (body.steps) sequence.steps = body.steps
    if (body.status) sequence.status = body.status

    await sequence.save()

    return NextResponse.json({ success: true, sequence })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update sequence' },
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

    await SequenceEnrollment.deleteMany({ sequenceId: id })
    await EmailSequence.findByIdAndDelete(id)

    return NextResponse.json({ success: true, message: 'Sequence deleted' })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete sequence' },
      { status: 500 }
    )
  }
}
