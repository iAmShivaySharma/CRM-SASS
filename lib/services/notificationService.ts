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
      case 'workflow_execution':
        return `/engines/executions/${entityId}`
      case 'workflow_input':
        return `/engines/executions/${entityId}/input`
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

  /**
   * Create notification for workflow input required
   */
  static async notifyInputRequired(
    userInput: any,
    execution: any,
    workflow: any,
    user: any
  ): Promise<void> {
    try {
      await this.createNotification({
        workspaceId: execution.workspaceId.toString(),
        title: 'Input Required',
        message: `Your workflow "${workflow.name}" is waiting for input at step ${userInput.step}`,
        type: 'warning',
        entityType: 'workflow_input',
        entityId: execution._id.toString(),
        targetUserIds: [user._id.toString()],
        metadata: {
          executionId: execution._id.toString(),
          workflowName: workflow.name,
          step: userInput.step,
          timeoutAt: userInput.timeoutAt,
          webhookUrl: userInput.webhookUrl,
          priority: userInput.metadata.priority,
          timeRemaining: Math.floor(userInput.timeRemaining / (1000 * 60)) // minutes
        }
      })

      console.log(`Input required notification created for execution ${execution._id}`)
    } catch (error) {
      console.error('Error creating input required notification:', error)
    }
  }

  /**
   * Create notification for workflow timeout warning
   */
  static async notifyTimeoutWarning(
    userInput: any,
    execution: any,
    workflow: any,
    user: any
  ): Promise<void> {
    try {
      await this.createNotification({
        workspaceId: execution.workspaceId.toString(),
        title: 'Input Timeout Warning',
        message: `Your workflow "${workflow.name}" will timeout in ${Math.floor(userInput.timeRemaining / (1000 * 60))} minutes. Please provide input.`,
        type: 'error',
        entityType: 'workflow_input',
        entityId: execution._id.toString(),
        targetUserIds: [user._id.toString()],
        metadata: {
          executionId: execution._id.toString(),
          workflowName: workflow.name,
          step: userInput.step,
          timeoutAt: userInput.timeoutAt,
          timeRemaining: Math.floor(userInput.timeRemaining / (1000 * 60)),
          urgent: true
        }
      })

      console.log(`Timeout warning notification created for execution ${execution._id}`)
    } catch (error) {
      console.error('Error creating timeout warning notification:', error)
    }
  }

  /**
   * Create notification for workflow execution completed
   */
  static async notifyExecutionCompleted(
    execution: any,
    workflow: any,
    user: any
  ): Promise<void> {
    try {
      await this.createNotification({
        workspaceId: execution.workspaceId.toString(),
        title: 'Workflow Completed',
        message: `Your workflow "${workflow.name}" has completed successfully`,
        type: 'success',
        entityType: 'workflow_execution',
        entityId: execution._id.toString(),
        targetUserIds: [user._id.toString()],
        metadata: {
          executionId: execution._id.toString(),
          workflowName: workflow.name,
          executionTime: execution.executionTimeMs,
          completedAt: execution.completedAt,
          hasOutput: !!execution.outputData && Object.keys(execution.outputData).length > 0
        }
      })

      console.log(`Completion notification created for execution ${execution._id}`)
    } catch (error) {
      console.error('Error creating completion notification:', error)
    }
  }

  /**
   * Create notification for workflow execution failed
   */
  static async notifyExecutionFailed(
    execution: any,
    workflow: any,
    user: any
  ): Promise<void> {
    try {
      await this.createNotification({
        workspaceId: execution.workspaceId.toString(),
        title: 'Workflow Failed',
        message: `Your workflow "${workflow.name}" has failed: ${execution.errorMessage || 'Unknown error'}`,
        type: 'error',
        entityType: 'workflow_execution',
        entityId: execution._id.toString(),
        targetUserIds: [user._id.toString()],
        metadata: {
          executionId: execution._id.toString(),
          workflowName: workflow.name,
          errorMessage: execution.errorMessage,
          failedAt: execution.completedAt
        }
      })

      console.log(`Failure notification created for execution ${execution._id}`)
    } catch (error) {
      console.error('Error creating failure notification:', error)
    }
  }

  /**
   * Process pending workflow notifications
   */
  static async processWorkflowNotifications(): Promise<void> {
    try {
      // Import models dynamically to avoid circular dependencies
      const { UserInput, WorkflowExecution } = await import('@/lib/mongodb/models')

      // Find high priority pending inputs that need timeout warnings (expiring in 15 minutes)
      const urgentInputs = await UserInput.find({
        status: 'pending',
        timeoutAt: {
          $gt: new Date(),
          $lt: new Date(Date.now() + (15 * 60 * 1000)) // Expiring in 15 minutes
        },
        'metadata.priority': 'high'
      })
      .populate('executionId')
      .populate({
        path: 'executionId',
        populate: [
          { path: 'workflowCatalogId', select: 'name description' },
          { path: 'userId', select: 'name email' }
        ]
      })

      for (const userInput of urgentInputs) {
        const execution = userInput.executionId as any
        const workflow = execution.workflowCatalogId
        const user = execution.userId

        // Check if we haven't sent a timeout warning recently
        const recentWarning = await this.constructor.prototype.constructor.model('Notification').findOne({
          entityType: 'workflow_input',
          entityId: execution._id.toString(),
          type: 'error',
          'metadata.urgent': true,
          createdAt: { $gte: new Date(Date.now() - (10 * 60 * 1000)) } // Within last 10 minutes
        })

        if (!recentWarning) {
          await this.notifyTimeoutWarning(userInput, execution, workflow, user)
        }
      }

      // Find new input requests that need notifications (created in last 5 minutes, no notification sent)
      const newInputs = await UserInput.find({
        status: 'pending',
        timeoutAt: { $gt: new Date() },
        createdAt: { $gte: new Date(Date.now() - (5 * 60 * 1000)) } // Created in last 5 minutes
      })
      .populate('executionId')
      .populate({
        path: 'executionId',
        populate: [
          { path: 'workflowCatalogId', select: 'name description' },
          { path: 'userId', select: 'name email' }
        ]
      })

      for (const userInput of newInputs) {
        const execution = userInput.executionId as any
        const workflow = execution.workflowCatalogId
        const user = execution.userId

        // Check if we haven't sent an input required notification for this execution step
        const existingNotification = await this.constructor.prototype.constructor.model('Notification').findOne({
          entityType: 'workflow_input',
          entityId: execution._id.toString(),
          'metadata.step': userInput.step
        })

        if (!existingNotification) {
          await this.notifyInputRequired(userInput, execution, workflow, user)
        }
      }

      console.log(`Processed ${urgentInputs.length} urgent and ${newInputs.length} new workflow notifications`)

    } catch (error) {
      console.error('Error processing workflow notifications:', error)
    }
  }
}
