import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { MongoDBClient } from '@/lib/mongodb/client'

const mongoClient = new MongoDBClient()

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request)
    if (!authResult) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { user } = authResult

    if (!user.lastActiveWorkspaceId) {
      return NextResponse.json({ lastActiveWorkspaceId: null }, { status: 200 })
    }

    // Verify user has access to this workspace
    const workspaceMember = await mongoClient.findWorkspaceMember(
      user.lastActiveWorkspaceId,
      user._id
    )

    if (!workspaceMember) {
      // User no longer has access to this workspace, clear it
      await mongoClient.updateUser(user._id, {
        lastActiveWorkspaceId: undefined,
      })
      return NextResponse.json({ lastActiveWorkspaceId: null }, { status: 200 })
    }

    // Get workspace details
    const workspace = await mongoClient.findWorkspaceById(
      user.lastActiveWorkspaceId
    )

    return NextResponse.json(
      {
        lastActiveWorkspaceId: user.lastActiveWorkspaceId,
        workspace: workspace,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get last active workspace error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request)
    if (!authResult) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { user } = authResult

    const { workspaceId } = await request.json()

    if (!workspaceId) {
      return NextResponse.json(
        { message: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    // Verify user has access to this workspace
    const workspaceMember = await mongoClient.findWorkspaceMember(
      workspaceId,
      user._id
    )

    if (!workspaceMember) {
      return NextResponse.json(
        { message: 'Access denied to workspace' },
        { status: 403 }
      )
    }

    // Update user's last active workspace
    await mongoClient.updateUser(user._id, {
      lastActiveWorkspaceId: workspaceId,
    })

    return NextResponse.json(
      { message: 'Last active workspace updated successfully' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Update last active workspace error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}
