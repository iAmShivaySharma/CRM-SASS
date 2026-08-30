import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Lead, WorkspaceMember, ChatRoom } from '@/lib/mongodb/client'

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'workspaceId is required' },
        { status: 400 }
      )
    }

    const [leadCount, memberCount, chatRoomCount, projectCount] =
      await Promise.all([
        Lead.countDocuments({ workspaceId }),
        WorkspaceMember.countDocuments({ workspaceId, status: 'active' }),
        ChatRoom.countDocuments({ workspaceId }),
        (async () => {
          const { Project } = await import('@/lib/mongodb/client')
          return Project.countDocuments({ workspaceId })
        })(),
      ])

    const { User } = await import('@/lib/mongodb/models')
    const user = (await User.findById(auth.user.id).lean()) as any

    const steps = [
      {
        id: 'create_workspace',
        title: 'Create your workspace',
        completed: true,
      },
      {
        id: 'complete_profile',
        title: 'Complete your profile',
        completed: !!(user?.fullName && user.fullName.trim().length > 0),
      },
      {
        id: 'invite_team',
        title: 'Invite a team member',
        completed: memberCount > 1,
      },
      {
        id: 'create_lead',
        title: 'Create your first lead',
        completed: leadCount > 0,
      },
      {
        id: 'create_project',
        title: 'Create a project',
        completed: projectCount > 0,
      },
      {
        id: 'send_message',
        title: 'Send a chat message',
        completed: chatRoomCount > 0,
      },
    ]

    const completedCount = steps.filter(s => s.completed).length
    const progress = Math.round((completedCount / steps.length) * 100)

    return NextResponse.json({
      success: true,
      steps,
      progress,
      completedCount,
      totalSteps: steps.length,
      isComplete: completedCount === steps.length,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch onboarding status' },
      { status: 500 }
    )
  }
}
