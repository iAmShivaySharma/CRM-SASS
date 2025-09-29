import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { NotificationService } from '@/lib/services/notificationService'
import { connectToMongoDB } from '@/lib/mongodb/connection'

export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request)
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const entityType = searchParams.get('entityType')

    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      )
    }

    await connectToMongoDB()

    const result = await NotificationService.getUserNotifications(
      workspaceId,
      authResult.user.id,
      {
        limit,
        offset,
        unreadOnly,
        entityType: entityType || undefined,
      }
    )

    // Transform notifications to match the frontend interface
    const notifications = result.notifications.map(notification => ({
      id: notification.id || notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      timestamp: notification.createdAt,
      read: notification.read,
      actionUrl: notification.actionUrl,
      entityType: notification.entityType,
      entityId: notification.entityId,
    }))

    return NextResponse.json({
      success: true,
      notifications,
      total: result.total,
      unreadCount: result.unreadCount,
      pagination: {
        page: Math.floor(offset / limit) + 1,
        limit,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    })
  } catch (error) {
    console.error('Get notifications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authResult = await verifyAuthToken(request)
    if (!authResult || !authResult.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, action, workspaceId } = body

    if (!action || !workspaceId) {
      return NextResponse.json(
        { error: 'Action and workspace ID are required' },
        { status: 400 }
      )
    }

    await connectToMongoDB()

    let result: boolean | number = false

    switch (action) {
      case 'markAsRead':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required for markAsRead action' },
            { status: 400 }
          )
        }
        result = await NotificationService.markAsRead(
          notificationId,
          authResult.user.id
        )
        break

      case 'markAllAsRead':
        result = await NotificationService.markAllAsRead(
          workspaceId,
          authResult.user.id
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      result,
      message:
        action === 'markAllAsRead'
          ? `Marked ${result} notifications as read`
          : result
            ? 'Notification marked as read'
            : 'Notification not found or already read',
    })
  } catch (error) {
    console.error('Update notification error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
