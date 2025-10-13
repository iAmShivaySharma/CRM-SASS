import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { CustomerApiKey, WorkspaceMember } from '@/lib/mongodb/models'

// PATCH - Update API key
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { keyName, isDefault, isActive } = await request.json()
    const { id } = await params

    // Get user's current workspace
    const workspaceMember = await WorkspaceMember.findOne({
      userId: auth.user.id,
      status: 'active'
    }).sort({ createdAt: -1 }) // Get most recent active membership

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'No active workspace found' },
        { status: 403 }
      )
    }

    // Find the API key
    const apiKey = await CustomerApiKey.findOne({
      _id: id,
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    // Update fields
    if (keyName) {
      // Check if new name already exists
      const existingKey = await CustomerApiKey.findOne({
        userId: auth.user.id,
        workspaceId: workspaceMember.workspaceId,
        keyName,
        _id: { $ne: id },
        isActive: true
      })

      if (existingKey) {
        return NextResponse.json(
          { error: 'An API key with this name already exists' },
          { status: 400 }
        )
      }

      apiKey.keyName = keyName
    }

    if (typeof isActive === 'boolean') {
      apiKey.isActive = isActive
    }

    if (typeof isDefault === 'boolean') {
      if (isDefault) {
        // Set this key as default (will automatically unset others via pre-save middleware)
        apiKey.isDefault = true
      } else {
        apiKey.isDefault = false
      }
    }

    await apiKey.save()

    console.log(`API key updated for user ${auth.user.email}: ${apiKey.keyName}`)

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Update API key error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to update API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Remove API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get user's current workspace
    const workspaceMember = await WorkspaceMember.findOne({
      userId: auth.user.id,
      status: 'active'
    }).sort({ createdAt: -1 })

    if (!workspaceMember) {
      return NextResponse.json(
        { error: 'No active workspace found' },
        { status: 403 }
      )
    }

    // Find and delete the API key
    const apiKey = await CustomerApiKey.findOneAndDelete({
      _id: id,
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId
    })

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not found' },
        { status: 404 }
      )
    }

    console.log(`API key deleted for user ${auth.user.email}: ${apiKey.keyName}`)

    return NextResponse.json({
      success: true
    })

  } catch (error) {
    console.error('Delete API key error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to delete API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}