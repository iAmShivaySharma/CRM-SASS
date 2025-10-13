import { NextRequest, NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { CustomerApiKey, WorkspaceMember } from '@/lib/mongodb/models'

// GET - Retrieve user's API keys
export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

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

    // Get all active API keys for the user
    const apiKeys = await CustomerApiKey.find({
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId,
      isActive: true
    }).sort({ createdAt: -1 })

    const responseData = apiKeys.map(key => ({
      _id: key._id,
      keyName: key.keyName,
      provider: key.provider,
      isDefault: key.isDefault,
      isActive: key.isActive,
      keyPreview: key.keyPreview,
      lastUsedAt: key.lastUsedAt,
      totalUsage: {
        executions: key.totalUsage.executions,
        tokensUsed: key.totalUsage.tokensUsed
      },
      createdAt: key.createdAt
    }))

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    console.error('Get API keys error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve API keys',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Add new API key
export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { keyName, apiKey, setAsDefault } = await request.json()

    if (!keyName || !apiKey) {
      return NextResponse.json(
        { error: 'Key name and API key are required' },
        { status: 400 }
      )
    }

    // Validate API key format (basic validation for OpenRouter)
    if (!apiKey.startsWith('sk-or-v1-') || apiKey.length < 20) {
      return NextResponse.json(
        { error: 'Invalid OpenRouter API key format' },
        { status: 400 }
      )
    }

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

    // Check if key name already exists for this user
    const existingKey = await CustomerApiKey.findOne({
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId,
      keyName,
      isActive: true
    })

    if (existingKey) {
      return NextResponse.json(
        { error: 'An API key with this name already exists' },
        { status: 400 }
      )
    }

    // Create new API key
    const newApiKey = new CustomerApiKey({
      userId: auth.user.id,
      workspaceId: workspaceMember.workspaceId,
      provider: 'openrouter',
      keyName,
      isActive: true,
      isDefault: setAsDefault || false
    })

    // Encrypt and set the API key
    newApiKey.setApiKey(apiKey)

    // Validate the API key
    const isValid = await newApiKey.validateApiKey()
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid API key format' },
        { status: 400 }
      )
    }

    await newApiKey.save()

    console.log(`New API key created for user ${auth.user.email}: ${keyName}`)

    return NextResponse.json({
      success: true,
      data: {
        _id: newApiKey._id
      }
    })

  } catch (error) {
    console.error('Add API key error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to add API key',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}