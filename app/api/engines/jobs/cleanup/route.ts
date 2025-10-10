import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { CleanupExpiredInputsJob, runManualCleanup } from '@/lib/jobs/cleanupExpiredInputs'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    // This assumes your auth system has a way to check admin status
    // Adjust according to your actual permission system
    const isAdmin = auth.user.role === 'admin' || auth.user.permissions?.includes('admin:*')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    // Get cleanup job status
    const status = CleanupExpiredInputsJob.getStatus()

    return NextResponse.json({
      success: true,
      data: {
        status: status.isRunning ? 'running' : 'idle',
        isRunning: status.isRunning,
        lastRun: status.lastRun,
        nextRun: status.nextRun,
        description: 'Cleanup job for expired workflow inputs and timed out executions'
      }
    })

  } catch (error) {
    console.error('Get cleanup job status error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to get cleanup job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin permissions
    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user has admin permissions
    const isAdmin = auth.user.role === 'admin' || auth.user.permissions?.includes('admin:*')
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Admin permissions required' },
        { status: 403 }
      )
    }

    const { action } = await request.json()

    if (action !== 'run') {
      return NextResponse.json(
        { error: 'Invalid action. Only "run" is supported.' },
        { status: 400 }
      )
    }

    // Check if job is already running
    if (CleanupExpiredInputsJob.getIsRunning()) {
      return NextResponse.json(
        { error: 'Cleanup job is already running' },
        { status: 409 }
      )
    }

    console.log(`Manual cleanup job triggered by user ${auth.user.email}`)

    // Run cleanup job manually
    const stats = await runManualCleanup()

    return NextResponse.json({
      success: true,
      message: 'Cleanup job completed successfully',
      data: {
        stats,
        triggeredBy: auth.user.email,
        runAt: new Date()
      }
    })

  } catch (error) {
    console.error('Manual cleanup job error:', error)

    return NextResponse.json({
      success: false,
      error: 'Failed to run cleanup job',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}