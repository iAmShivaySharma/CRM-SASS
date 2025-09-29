'use client'

import { useState, useMemo } from 'react'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetNotificationsQuery,
  useUpdateNotificationMutation,
} from '@/lib/api/notificationsApi'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  XCircle,
  MarkEmailRead,
  Filter,
  Clock,
  User,
  Building,
  Users,
  Shield,
  Mail,
  Webhook,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  timestamp: Date
  read: boolean
  actionUrl?: string
  entityType?: string
  entityId?: string
  createdBy?: string
  notificationLevel: 'personal' | 'team' | 'workspace'
}

export default function NotificationsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [activeTab, setActiveTab] = useState('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [limit, setLimit] = useState(20)
  const [offset, setOffset] = useState(0)

  // RTK Query hooks
  const {
    data: notificationsData,
    isLoading,
    error,
    refetch,
  } = useGetNotificationsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      limit,
      offset,
      unreadOnly: activeTab === 'unread',
      entityType: entityFilter !== 'all' ? entityFilter : undefined,
    },
    {
      skip: !currentWorkspace?.id,
      pollingInterval: 30000, // Poll every 30 seconds
    }
  )

  const [updateNotification, { isLoading: updateLoading }] =
    useUpdateNotificationMutation()

  const notifications = notificationsData?.notifications || []
  const totalCount = notificationsData?.total || 0
  const unreadCount = notificationsData?.unreadCount || 0

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Info className="h-5 w-5 text-blue-500" />
    }
  }

  const getEntityIcon = (entityType?: string) => {
    switch (entityType) {
      case 'user':
        return <User className="h-4 w-4" />
      case 'workspace':
        return <Building className="h-4 w-4" />
      case 'role':
        return <Shield className="h-4 w-4" />
      case 'invitation':
        return <Mail className="h-4 w-4" />
      case 'webhook':
        return <Webhook className="h-4 w-4" />
      case 'lead':
      case 'contact':
        return <Users className="h-4 w-4" />
      default:
        return <Bell className="h-4 w-4" />
    }
  }

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
      default:
        return 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    if (!currentWorkspace?.id) return

    try {
      await updateNotification({
        notificationId,
        action: 'markAsRead',
        workspaceId: currentWorkspace.id,
      }).unwrap()
      toast.success('Notification marked as read')
    } catch (error: any) {
      toast.error('Failed to mark notification as read')
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
      toast.success('All notifications marked as read')
    } catch (error: any) {
      toast.error('Failed to mark all notifications as read')
      console.error('Error marking all notifications as read:', error)
    }
  }

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification: NotificationItem) => {
      if (activeTab === 'unread' && notification.read) return false
      if (activeTab === 'read' && !notification.read) return false
      return true
    })
  }, [notifications, activeTab])

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view notifications.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Stay updated with workspace activities and updates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={updateLoading}
            >
              <MarkEmailRead className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-primary" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Total Notifications
                </p>
                <p className="text-2xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <EyeOff className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Unread
                </p>
                <p className="text-2xl font-bold">{unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Read
                </p>
                <p className="text-2xl font-bold">{totalCount - unreadCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Tabs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                View and manage your workspace notifications
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="lead">Leads</SelectItem>
                  <SelectItem value="contact">Contacts</SelectItem>
                  <SelectItem value="user">Users</SelectItem>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  <SelectItem value="invitation">Invitations</SelectItem>
                  <SelectItem value="webhook">Webhooks</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All ({totalCount})
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread ({unreadCount})
              </TabsTrigger>
              <TabsTrigger value="read">
                Read ({totalCount - unreadCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading notifications...</span>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                  <h3 className="text-lg font-medium">Error Loading Notifications</h3>
                  <p className="text-muted-foreground">
                    Failed to load notifications. Please try again.
                  </p>
                  <Button className="mt-4" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8">
                  <Bell className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="text-lg font-medium">No Notifications</h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'unread'
                      ? "You're all caught up! No unread notifications."
                      : activeTab === 'read'
                        ? 'No read notifications found.'
                        : 'No notifications found.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification: NotificationItem) => (
                    <div
                      key={notification.id}
                      className={cn(
                        'rounded-lg border p-4 transition-all hover:shadow-md',
                        !notification.read
                          ? 'bg-primary/5 border-primary/20'
                          : 'bg-background border-border',
                        getNotificationTypeColor(notification.type)
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 mt-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="text-sm font-medium text-foreground">
                                {notification.title}
                              </h4>
                              {!notification.read && (
                                <Badge variant="secondary" className="text-xs">
                                  New
                                </Badge>
                              )}
                              {notification.entityType && (
                                <Badge variant="outline" className="text-xs">
                                  {getEntityIcon(notification.entityType)}
                                  <span className="ml-1 capitalize">
                                    {notification.entityType}
                                  </span>
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {notification.message}
                            </p>
                            <div className="mt-2 flex items-center text-xs text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDistanceToNow(new Date(notification.timestamp), {
                                addSuffix: true,
                              })}
                              {notification.notificationLevel && (
                                <>
                                  <span className="mx-2">•</span>
                                  <Badge variant="outline" className="text-xs capitalize">
                                    {notification.notificationLevel}
                                  </Badge>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={updateLoading}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {notification.actionUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // Navigate to action URL
                                window.location.href = notification.actionUrl!
                              }}
                            >
                              View
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Load More */}
          {filteredNotifications.length > 0 &&
            filteredNotifications.length < totalCount && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setLimit(limit + 20)}
                  disabled={isLoading}
                >
                  Load More Notifications
                </Button>
              </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}