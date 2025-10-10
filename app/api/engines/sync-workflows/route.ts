import { NextRequest, NextResponse } from 'next/server'
import { workflowSyncService } from '@/lib/n8n/sync'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    // Verify authentication
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log(`Starting workflow sync initiated by user ${auth.user.email}`)

    // Perform the sync
    const syncResult = await workflowSyncService.syncAllWorkflows()

    if (syncResult.success) {
      return NextResponse.json({
        success: true,
        message: 'Workflows synced successfully',
        data: {
          syncedCount: syncResult.syncedCount,
          updatedCount: syncResult.updatedCount,
          totalProcessed: syncResult.syncedCount + syncResult.updatedCount,
          errorCount: syncResult.errorCount,
          workflows: syncResult.workflows
        }
      })
    } else {
      return NextResponse.json({
        success: false,
        message: 'Workflow sync completed with errors',
        data: {
          syncedCount: syncResult.syncedCount,
          updatedCount: syncResult.updatedCount,
          errorCount: syncResult.errorCount,
          errors: syncResult.errors
        }
      }, { status: 207 }) // 207 Multi-Status for partial success
    }
  } catch (error) {
    console.error('Workflow sync API error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to sync workflows',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectToMongoDB()

    // Test n8n connection
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const connectionTest = await workflowSyncService.testN8nConnection()

    return NextResponse.json({
      success: connectionTest.success,
      message: connectionTest.success
        ? 'n8n connection is healthy'
        : 'n8n connection failed',
      version: connectionTest.version
    })
  } catch (error) {
    console.error('n8n connection test error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to test n8n connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}