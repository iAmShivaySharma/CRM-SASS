import {
  Notification,
  WorkspaceMember,
  Role,
  type INotification,
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

      const finalRecipients = recipientUserIds.filter(
        userId => !excludeUserIds.includes(userId) && userId !== createdBy
      )

      if (finalRecipients.length === 0) {
        return []
      }

      const actionUrl = this.generateActionUrl(entityType, entityId)

      const notifications: INotification[] = []

      for (const userId of finalRecipients) {
        try {
          if (activityId) {
            const existingActivity = await Notification.findOne({
              workspaceId,
              userId,
              activityId,
            })
            if (existingActivity) continue
          }

          if (entityType && entityId) {
            const recentDuplicate = await Notification.findOne({
              workspaceId,
              userId,
              entityType,
              entityId,
              type,
              createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) },
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
        } catch (error) {}
      }

      return notifications
    } catch (error) {
      throw error
    }
  }

  private static async getRecipientsByLevel(
    workspaceId: string,
    notificationLevel: string,
    requiredPermissions: string[],
    createdBy?: string
  ): Promise<string[]> {
    try {
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

        if (requiredPermissions.length > 0) {
          const hasPermissions = this.checkPermissions(
            userPermissions,
            requiredPermissions
          )
          if (!hasPermissions) continue
        }

        switch (notificationLevel) {
          case 'workspace':
            if (this.isOwnerOrAdmin(userPermissions)) {
              eligibleUserIds.push(member.userId)
            }
            break

          case 'team':
            if (this.isManagerOrAbove(userPermissions)) {
              eligibleUserIds.push(member.userId)
            }
            break

          case 'personal':
          default:
            eligibleUserIds.push(member.userId)
            break
        }
      }

      return eligibleUserIds
    } catch (error) {
      return []
    }
  }

  private static checkPermissions(
    userPermissions: string[],
    requiredPermissions: string[]
  ): boolean {
    if (userPermissions.includes('*:*')) {
      return true
    }

    return requiredPermissions.every(required => {
      return userPermissions.some(userPerm => {
        if (userPerm === required) return true

        const [entity, action] = required.split(':')
        return userPerm === `${entity}:*` || userPerm === '*:*'
      })
    })
  }

  private static isOwnerOrAdmin(permissions: string[]): boolean {
    return (
      permissions.includes('*:*') ||
      permissions.includes('workspace:manage') ||
      permissions.includes('users:delete')
    )
  }

  private static isManagerOrAbove(permissions: string[]): boolean {
    return (
      this.isOwnerOrAdmin(permissions) ||
      permissions.includes('leads:delete') ||
      permissions.includes('users:read')
    )
  }

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
      return false
    }
  }

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
      return 0
    }
  }

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
      return { notifications: [], total: 0, unreadCount: 0 }
    }
  }

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
          timeRemaining: Math.floor(userInput.timeRemaining / (1000 * 60)),
        },
      })
    } catch (error) {}
  }

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
          urgent: true,
        },
      })
    } catch (error) {}
  }

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
          hasOutput:
            !!execution.outputData &&
            Object.keys(execution.outputData).length > 0,
        },
      })
    } catch (error) {}
  }

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
          failedAt: execution.completedAt,
        },
      })
    } catch (error) {}
  }

  static async processWorkflowNotifications(): Promise<void> {
    try {
      const { UserInput, WorkflowExecution } = await import(
        '@/lib/mongodb/models'
      )

      const urgentInputs = await UserInput.find({
        status: 'pending',
        timeoutAt: {
          $gt: new Date(),
          $lt: new Date(Date.now() + 15 * 60 * 1000),
        },
        'metadata.priority': 'high',
      })
        .populate('executionId')
        .populate({
          path: 'executionId',
          populate: [
            { path: 'workflowCatalogId', select: 'name description' },
            { path: 'userId', select: 'name email' },
          ],
        })

      for (const userInput of urgentInputs) {
        const execution = userInput.executionId as any
        const workflow = execution.workflowCatalogId
        const user = execution.userId

        const recentWarning = await this.constructor.prototype.constructor
          .model('Notification')
          .findOne({
            entityType: 'workflow_input',
            entityId: execution._id.toString(),
            type: 'error',
            'metadata.urgent': true,
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) },
          })

        if (!recentWarning) {
          await this.notifyTimeoutWarning(userInput, execution, workflow, user)
        }
      }

      const newInputs = await UserInput.find({
        status: 'pending',
        timeoutAt: { $gt: new Date() },
        createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) },
      })
        .populate('executionId')
        .populate({
          path: 'executionId',
          populate: [
            { path: 'workflowCatalogId', select: 'name description' },
            { path: 'userId', select: 'name email' },
          ],
        })

      for (const userInput of newInputs) {
        const execution = userInput.executionId as any
        const workflow = execution.workflowCatalogId
        const user = execution.userId

        const existingNotification =
          await this.constructor.prototype.constructor
            .model('Notification')
            .findOne({
              entityType: 'workflow_input',
              entityId: execution._id.toString(),
              'metadata.step': userInput.step,
            })

        if (!existingNotification) {
          await this.notifyInputRequired(userInput, execution, workflow, user)
        }
      }
    } catch (error) {}
  }
}
