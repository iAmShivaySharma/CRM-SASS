import {
  Notification,
  WorkspaceMember,
  Role,
  INotification,
} from '@/lib/mongodb/models'

export interface CreateNotificationInput {
  workspaceId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
  entityType?: string
  entityId?: string
  createdBy?: string
  activityId?: string
  notificationLevel?: 'personal' | 'team' | 'workspace'
  requiredPermissions?: string[]
  targetUserIds?: string[] // Specific users to notify
  excludeUserIds?: string[] // Users to exclude from notification
  metadata?: Record<string, any>
}

export class NotificationService {
  /**
   * Create notifications based on user roles and permissions
   */
  static async createNotification(
    input: CreateNotificationInput
  ): Promise<INotification[]> {
    const {
      workspaceId,
      title,
      message,
      type = 'info',
      entityType,
      entityId,
      createdBy,
      activityId,
      notificationLevel = 'personal',
      requiredPermissions = [],
      targetUserIds,
      excludeUserIds = [],
      metadata = {},
    } = input

    try {
      let recipientUserIds: string[] = []

      if (targetUserIds && targetUserIds.length > 0) {
        // Specific users targeted
        recipientUserIds = targetUserIds
      } else {
        // Determine recipients based on notification level and permissions
        recipientUserIds = await this.getRecipientsByLevel(
          workspaceId,
          notificationLevel,
          requiredPermissions,
          createdBy
        )
      }

      // Remove excluded users and the creator (to avoid self-notification)
      const finalRecipients = recipientUserIds.filter(
        userId => !excludeUserIds.includes(userId) && userId !== createdBy
      )

      if (finalRecipients.length === 0) {
        return []
      }

      // Generate action URL if entity info is provided
      const actionUrl = this.generateActionUrl(entityType, entityId)

      // Create notifications for all recipients
      const notifications: INotification[] = []

      for (const userId of finalRecipients) {
        try {
          // Check for duplicates before creating
          if (activityId) {
            const existingActivity = await Notification.findOne({
              workspaceId,
              userId,
              activityId,
            })
            if (existingActivity) continue
          }

          // Check for recent duplicates for entity-based notifications
          if (entityType && entityId) {
            const recentDuplicate = await Notification.findOne({
              workspaceId,
              userId,
              entityType,
              entityId,
              type,
              createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Within last hour
            })
            if (recentDuplicate) continue
          }

          const notification = new Notification({
            workspaceId,
            userId,
            title,
            message,
            type,
            entityType,
            entityId,
            actionUrl,
            createdBy,
            activityId,
            notificationLevel,
            requiredPermissions,
            metadata,
          })

          const savedNotification = await notification.save()
          notifications.push(savedNotification)
        } catch (error) {
          // Log error but continue with other notifications
          console.error(
            `Failed to create notification for user ${userId}:`,
            error
          )
        }
      }

      return notifications
    } catch (error) {
      console.error('Error creating notifications:', error)
      throw error
    }
  }

  /**
   * Get recipients based on notification level and user roles
   */
  private static async getRecipientsByLevel(
    workspaceId: string,
    notificationLevel: string,
    requiredPermissions: string[],
    createdBy?: string
  ): Promise<string[]> {
    try {
      // Get all workspace members with their roles
      const members = await WorkspaceMember.aggregate([
        { $match: { workspaceId, status: 'active' } },
        {
          $lookup: {
            from: 'roles',
            localField: 'roleId',
            foreignField: '_id',
            as: 'role',
          },
        },
        { $unwind: '$role' },
      ])

      const eligibleUserIds: string[] = []

      for (const member of members) {
        const userPermissions = member.role.permissions || []

        // Check if user has required permissions
        if (requiredPermissions.length > 0) {
          const hasPermissions = this.checkPermissions(
            userPermissions,
            requiredPermissions
          )
          if (!hasPermissions) continue
        }

        // Apply notification level filtering
        switch (notificationLevel) {
          case 'workspace':
            // Workspace-level: Only owners and admins
            if (this.isOwnerOrAdmin(userPermissions)) {
              eligibleUserIds.push(member.userId)
            }
            break

          case 'team':
            // Team-level: Managers and above
            if (this.isManagerOrAbove(userPermissions)) {
              eligibleUserIds.push(member.userId)
            }
            break

          case 'personal':
          default:
            // Personal-level: All users with required permissions
            eligibleUserIds.push(member.userId)
            break
        }
      }

      return eligibleUserIds
    } catch (error) {
      console.error('Error getting recipients by level:', error)
      return []
    }
  }

  /**
   * Check if user has required permissions
   */
  private static checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    // Owners have full access
    if (userPermissions.includes('*:*')) {
      return true
    }

    // Check each required permission
    return requiredPermissions.every(required => {
      return userPermissions.some(userPerm => {
        // Exact match
        if (userPerm === required) return true

        // Wildcard permission (e.g., 'leads:*' matches 'leads:read')
        const [entity, action] = required.split(':')
        return userPerm === `${entity}:*` || userPerm === '*:*'
      })
    })
  }

  /**
   * Check if user is owner or admin
   */
  private static isOwnerOrAdmin(permissions: string[]): boolean {
    return (
      permissions.includes('*:*') ||
      permissions.includes('workspace:manage') ||
      permissions.includes('users:delete')
    )
  }

  /**
   * Check if user is manager or above
   */
  private static isManagerOrAbove(permissions: string[]): boolean {
    return (
      this.isOwnerOrAdmin(permissions) ||
      permissions.includes('leads:delete') ||
      permissions.includes('users:read')
    )
  }

  /**
   * Generate action URL based on entity type
   */
  private static generateActionUrl(
    entityType?: string,
    entityId?: string
  ): string | undefined {
    if (!entityType || !entityId) return undefined

    switch (entityType) {
      case 'lead':
        return `/leads?id=${entityId}`
      case 'contact':
        return `/contacts?id=${entityId}`
      case 'user':
        return `/settings`
      case 'workspace':
        return `/workspace`
      case 'role':
        return `/roles`
      case 'webhook':
        return `/webhooks`
      default:
        return undefined
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const result = await Notification.findOneAndUpdate(
        { _id: notificationId, userId, read: false },
        { read: true, readAt: new Date() },
        { new: true }
      )
      return !!result
    } catch (error) {
      console.error('Error marking notification as read:', error)
      return false
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(
    workspaceId: string,
    userId: string
  ): Promise<number> {
    try {
      const result = await Notification.updateMany(
        { workspaceId, userId, read: false },
        { read: true, readAt: new Date() }
      )
      return result.modifiedCount
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      return 0
    }
  }

  /**
   * Get notifications for a user with filtering
   */
  static async getUserNotifications(
    workspaceId: string,
    userId: string,
    options: {
      limit?: number
      offset?: number
      unreadOnly?: boolean
      entityType?: string
    } = {}
  ): Promise<{
    notifications: INotification[]
    total: number
    unreadCount: number
  }> {
    const { limit = 20, offset = 0, unreadOnly = false, entityType } = options

    try {
      const filter: any = { workspaceId, userId }

      if (unreadOnly) filter.read = false
      if (entityType) filter.entityType = entityType

      const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ workspaceId, userId, read: false }),
      ])

      return {
        notifications: notifications as unknown as INotification[],
        total,
        unreadCount,
      }
    } catch (error) {
      console.error('Error getting user notifications:', error)
      return { notifications: [], total: 0, unreadCount: 0 }
    }
  }
}
