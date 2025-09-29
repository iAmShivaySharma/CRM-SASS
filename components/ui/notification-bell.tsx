/**
 * Notification Bell Component
 *
 * A reusable notification bell component with badge support,
 * dropdown menu, and responsive design.
 */

'use client'

import { useState } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetNotificationsQuery,
  useUpdateNotificationMutation,
} from '@/lib/api/notificationsApi'
import { useWorkspaceFormatting } from '@/lib/utils/workspace-formatting'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Bell,
  Check,
  X,
  Settings,
  User,
  MessageSquare,
  AlertCircle,
  Info,
  CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  actionUrl?: string
}

interface NotificationBellProps {
  className?: string
}

// Removed mock notifications - now using real API data

function getNotificationIcon(type: Notification['type']) {
  switch (type) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-green-500" />
    case 'warning':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />
    case 'error':
      return <AlertCircle className="h-4 w-4 text-red-500" />
    default:
      return <Info className="h-4 w-4 text-blue-500" />
  }
}

// Moved to workspace formatting utility

export function NotificationBell({ className }: NotificationBellProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { getTimeAgo } = useWorkspaceFormatting()
  const [isOpen, setIsOpen] = useState(false)

  // RTK Query hooks
  const {
    data: notificationsData,
    isLoading,
    error,
  } = useGetNotificationsQuery(
    { workspaceId: currentWorkspace?.id || '', limit: 20 },
    { skip: !currentWorkspace?.id, pollingInterval: 30000 } // Poll every 30 seconds
  )

  const [updateNotification] = useUpdateNotificationMutation()

  const notifications = notificationsData?.notifications || []
  const unreadCount = notificationsData?.unreadCount || 0
  const hasUnread = unreadCount > 0

  const handleMarkAsRead = async (id: string) => {
    if (!currentWorkspace?.id) return
    try {
      await updateNotification({
        notificationId: id,
        action: 'markAsRead',
        workspaceId: currentWorkspace.id,
      }).unwrap()
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!currentWorkspace?.id) return
    try {
      await updateNotification({
        action: 'markAllAsRead',
        workspaceId: currentWorkspace.id,
      }).unwrap()
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }

  const handleClearAll = async () => {
    await handleMarkAllAsRead()
    setIsOpen(false)
  }

  // Don't render if no workspace
  if (!currentWorkspace) {
    return null
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'relative h-9 w-9 rounded-full p-2 hover:bg-accent',
            className
          )}
          aria-label={`Notifications${hasUnread ? ` (${unreadCount} unread)` : ''}`}
          disabled={isLoading}
        >
          <Bell className={cn('h-5 w-5', isLoading && 'animate-pulse')} />
          {hasUnread && !isLoading && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs font-medium"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 sm:w-96" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-2">
          <DropdownMenuLabel className="p-0 font-semibold">
            Notifications
          </DropdownMenuLabel>
          <div className="flex items-center space-x-1">
            {hasUnread && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={handleMarkAllAsRead}
              >
                <Check className="mr-1 h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={handleClearAll}
              title="Clear all notifications"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <DropdownMenuSeparator />

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-gray-600"></div>
            <p className="mt-2 text-sm text-muted-foreground">
              Loading notifications...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="mb-2 h-8 w-8 text-red-500" />
            <p className="text-sm text-muted-foreground">
              Failed to load notifications
            </p>
            <p className="text-xs text-muted-foreground">
              Please try again later
            </p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Bell className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground">
              You&apos;re all caught up!
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-1">
              {notifications.map(notification => (
                <DropdownMenuItem
                  key={notification.id}
                  className={cn(
                    'flex cursor-pointer items-start space-x-3 p-4 focus:bg-accent',
                    !notification.read && 'bg-accent/50'
                  )}
                  onClick={() => {
                    if (!notification.read) {
                      handleMarkAsRead(notification.id)
                    }
                    if (notification.actionUrl) {
                      window.location.href = notification.actionUrl
                    }
                  }}
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p
                        className={cn(
                          'truncate text-sm font-medium',
                          !notification.read && 'font-semibold'
                        )}
                      >
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="ml-2 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {getTimeAgo(notification.timestamp.toString())}
                    </p>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          </ScrollArea>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="flex items-center justify-center py-2 text-sm text-muted-foreground hover:text-foreground"
              onClick={() => {
                // Navigate to notifications page
                window.location.href = '/notifications'
                setIsOpen(false)
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              View all notifications
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
