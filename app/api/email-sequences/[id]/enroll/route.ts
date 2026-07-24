import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import {
  EmailSequence,
  SequenceEnrollment,
} from '@/lib/mongodb/models/EmailSequence'

export async function POST(
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

    const { id: sequenceId } = await params
    const { emails, leadIds, contactIds } = await request.json()

    const sequence = await EmailSequence.findById(sequenceId)
    if (!sequence) {
      return NextResponse.json(
        { message: 'Sequence not found' },
        { status: 404 }
      )
    }

    if (sequence.status !== 'active') {
      return NextResponse.json(
        { message: 'Sequence must be active to enroll contacts' },
        { status: 400 }
      )
    }

    if (!sequence.steps || sequence.steps.length === 0) {
      return NextResponse.json(
        { message: 'Sequence has no steps' },
        { status: 400 }
      )
    }

    const firstStep = sequence.steps[0]
    const delayMs =
      (firstStep.delayDays * 24 * 60 + firstStep.delayHours * 60) * 60 * 1000
    const firstSendAt = new Date(Date.now() + delayMs)

    let enrolled = 0
    let skipped = 0

    const enrollList: Array<{
      email: string
      leadId?: string
      contactId?: string
    }> = []

    if (emails && Array.isArray(emails)) {
      emails.forEach((email: string) => enrollList.push({ email }))
    }

    if (leadIds && Array.isArray(leadIds)) {
      const { Lead } = await import('@/lib/mongodb/client')
      const leads = await Lead.find({
        _id: { $in: leadIds },
        email: { $exists: true, $ne: '' },
      })
        .select('email')
        .lean()
      ;(leads as any[]).forEach(l =>
        enrollList.push({ email: l.email, leadId: l._id.toString() })
      )
    }

    if (contactIds && Array.isArray(contactIds)) {
      const { Contact } = await import('@/lib/mongodb/client')
      const contacts = await Contact.find({
        _id: { $in: contactIds },
        email: { $exists: true, $ne: '' },
      })
        .select('email')
        .lean()
      ;(contacts as any[]).forEach(c =>
        enrollList.push({ email: c.email, contactId: c._id.toString() })
      )
    }

    for (const item of enrollList) {
      try {
        await SequenceEnrollment.create({
          workspaceId: sequence.workspaceId,
          sequenceId,
          email: item.email,
          leadId: item.leadId,
          contactId: item.contactId,
          currentStep: 0,
          status: 'active',
          nextSendAt: firstSendAt,
        })
        enrolled++
      } catch {
        skipped++
      }
    }

    await EmailSequence.findByIdAndUpdate(sequenceId, {
      $inc: { enrolledCount: enrolled },
    })

    return NextResponse.json({
      success: true,
      enrolled,
      skipped,
      message: `Enrolled ${enrolled} contacts, skipped ${skipped}`,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to enroll contacts' },
      { status: 500 }
    )
  }
}
