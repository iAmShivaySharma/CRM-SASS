import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Meeting } from '@/lib/mongodb/models/Meeting'
import { User } from '@/lib/mongodb/models'
import { emailService } from '@/lib/services/emailService'

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
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { message: 'userIds array is required' },
        { status: 400 }
      )
    }

    const meeting = await Meeting.findById(id).populate(
      'organizer',
      'fullName email'
    )

    if (!meeting) {
      return NextResponse.json(
        { message: 'Meeting not found' },
        { status: 404 }
      )
    }

    const users = await User.find({ _id: { $in: userIds } })
      .select('fullName email')
      .lean()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const meetingDate = meeting.scheduledAt
      ? new Date(meeting.scheduledAt).toLocaleString('en-US', {
          dateStyle: 'full',
          timeStyle: 'short',
        })
      : 'To be determined'

    let invited = 0

    for (const user of users as any[]) {
      const existingParticipant = meeting.participants.find(
        (p: any) => p.userId.toString() === user._id.toString()
      )

      if (!existingParticipant) {
        meeting.participants.push({
          userId: user._id.toString(),
          role: 'participant',
        })
      }

      try {
        await emailService.sendEmail({
          to: user.email,
          subject: `Meeting Invite: ${meeting.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1e40af;">Meeting Invitation</h2>
              <p>Hi ${user.fullName},</p>
              <p><strong>${(meeting.organizer as any)?.fullName}</strong> has invited you to a meeting.</p>
              <div style="background: #f3f4f6; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 4px 0;"><strong>Title:</strong> ${meeting.title}</p>
                <p style="margin: 4px 0;"><strong>When:</strong> ${meetingDate}</p>
                <p style="margin: 4px 0;"><strong>Type:</strong> ${meeting.type === 'video' ? 'Video Call' : meeting.type === 'voice' ? 'Voice Call' : 'Scheduled Meeting'}</p>
                ${meeting.description ? `<p style="margin: 4px 0;"><strong>Description:</strong> ${meeting.description}</p>` : ''}
              </div>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${appUrl}/chat" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Join Meeting
                </a>
              </div>
            </div>
          `,
          text: `Meeting: ${meeting.title}\nWhen: ${meetingDate}\nJoin at: ${appUrl}/chat`,
        })
        invited++
      } catch {}
    }

    await meeting.save()

    return NextResponse.json({
      success: true,
      invited,
      message: `Invited ${invited} participants`,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to send invitations' },
      { status: 500 }
    )
  }
}
