import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WorkspaceMember, Workspace } from '@/lib/mongodb/client'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId, userId: targetUserId } = await params
    const { roleId } = await request.json()

    if (!roleId) {
      return NextResponse.json(
        { message: 'roleId is required' },
        { status: 400 }
      )
    }

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'members:edit'
    )
    if (permError) return permError

    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return NextResponse.json(
        { message: 'Workspace not found' },
        { status: 404 }
      )
    }

    if (workspace.ownerId === targetUserId) {
      return NextResponse.json(
        { message: 'Cannot change the role of the workspace owner' },
        { status: 400 }
      )
    }

    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: targetUserId,
      status: 'active',
    })

    if (!member) {
      return NextResponse.json({ message: 'Member not found' }, { status: 404 })
    }

    member.roleId = roleId
    await member.save()

    return NextResponse.json({
      success: true,
      message: 'Member role updated',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to update member role' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const { id: workspaceId, userId: targetUserId } = await params

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'members:delete'
    )
    if (permError) return permError

    const workspace = await Workspace.findById(workspaceId)
    if (!workspace) {
      return NextResponse.json(
        { message: 'Workspace not found' },
        { status: 404 }
      )
    }

    if (workspace.ownerId === targetUserId) {
      return NextResponse.json(
        { message: 'Cannot remove the workspace owner' },
        { status: 400 }
      )
    }

    if (auth.user.id === targetUserId) {
      return NextResponse.json(
        { message: 'Cannot remove yourself. Use leave workspace instead.' },
        { status: 400 }
      )
    }

    const member = await WorkspaceMember.findOne({
      workspaceId,
      userId: targetUserId,
      status: 'active',
    })

    if (!member) {
      return NextResponse.json({ message: 'Member not found' }, { status: 404 })
    }

    member.status = 'removed'
    await member.save()

    return NextResponse.json({
      success: true,
      message: 'Member removed from workspace',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to remove member' },
      { status: 500 }
    )
  }
}
