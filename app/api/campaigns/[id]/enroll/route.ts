import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'
import { Campaign, CampaignEnrollment } from '@/lib/mongodb/models/Campaign'

const enrollSchema = z.object({
  workspaceId: z.string().min(1),
  entries: z
    .array(
      z.object({
        email: z.string().optional(),
        phone: z.string().optional(),
        leadId: z.string().optional(),
        contactId: z.string().optional(),
      })
    )
    .min(1),
})

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

    const { id } = await params
    const body = await request.json()
    const parsed = enrollSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { workspaceId, entries } = parsed.data

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.edit'
    )
    if (permError) {
      return permError
    }

    const campaign = await Campaign.findById(id)
    if (!campaign) {
      return NextResponse.json(
        { message: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (campaign.steps.length === 0) {
      return NextResponse.json(
        { message: 'Campaign has no steps' },
        { status: 400 }
      )
    }

    const firstStep = campaign.steps.sort(
      (a: any, b: any) => a.order - b.order
    )[0]
    const delayMs =
      (firstStep.delayDays || 0) * 86400000 +
      (firstStep.delayHours || 0) * 3600000
    const nextSendAt = new Date(Date.now() + delayMs)

    let enrolled = 0
    let skipped = 0

    for (const entry of entries) {
      const filter: Record<string, any> = { campaignId: id, workspaceId }
      if (entry.leadId) {
        filter.leadId = entry.leadId
      } else if (entry.contactId) {
        filter.contactId = entry.contactId
      } else if (entry.email) {
        filter.email = entry.email
      } else if (entry.phone) {
        filter.phone = entry.phone
      } else {
        skipped++
        continue
      }

      const existing = await CampaignEnrollment.findOne(filter)
      if (existing) {
        skipped++
        continue
      }

      await CampaignEnrollment.create({
        workspaceId,
        campaignId: id,
        leadId: entry.leadId,
        contactId: entry.contactId,
        email: entry.email,
        phone: entry.phone,
        currentStep: 0,
        status: 'active',
        nextSendAt,
      })
      enrolled++
    }

    await Campaign.findByIdAndUpdate(id, { $inc: { enrolledCount: enrolled } })

    return NextResponse.json({ success: true, enrolled, skipped })
  } catch {
    return NextResponse.json(
      { message: 'Failed to enroll contacts' },
      { status: 500 }
    )
  }
}
