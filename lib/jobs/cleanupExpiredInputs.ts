import { connectToMongoDB } from '@/lib/mongodb/connection'
import { UserInput, WorkflowExecution } from '@/lib/mongodb/models'
import { NotificationService } from '@/lib/services/notificationService'

export interface CleanupStats {
  expiredInputs: number
  timedOutExecutions: number
  processedNotifications: number
  errors: number
}

export class CleanupExpiredInputsJob {
  private static isRunning = false
  private static lastRun: Date | null = null

  static async run(): Promise<CleanupStats> {
    if (this.isRunning) {
      return {
        expiredInputs: 0,
        timedOutExecutions: 0,
        processedNotifications: 0,
        errors: 0,
      }
    }

    this.isRunning = true
    const stats: CleanupStats = {
      expiredInputs: 0,
      timedOutExecutions: 0,
      processedNotifications: 0,
      errors: 0,
    }

    try {
      await connectToMongoDB()

      stats.expiredInputs = await this.handleExpiredInputs()

      stats.timedOutExecutions = await this.handleTimedOutExecutions()

      try {
        await NotificationService.processWorkflowNotifications()
        stats.processedNotifications = 1
      } catch (error) {
        stats.errors++
      }

      await this.cleanupOldInputRecords()

      this.lastRun = new Date()
    } catch (error) {
      stats.errors++
    } finally {
      this.isRunning = false
    }

    return stats
  }

  private static async handleExpiredInputs(): Promise<number> {
    try {
      const expiredInputs = await UserInput.findExpired()

      let processedCount = 0

      for (const userInput of expiredInputs) {
        try {
          await userInput.markExpired()

          const execution = await WorkflowExecution.findById(
            userInput.executionId
          )
            .populate('workflowCatalogId', 'name description')
            .populate('userId', 'name email')

          if (execution && execution.dynamicInput.isWaitingForInput) {
            await execution.markTimeout()

            try {
              const workflow = execution.workflowCatalogId as any
              const user = execution.userId as any

              await NotificationService.notifyExecutionFailed(
                execution,
                workflow,
                user
              )
            } catch (notificationError) {}
          }

          processedCount++
        } catch (error) {}
      }

      return processedCount
    } catch (error) {
      return 0
    }
  }

  private static async handleTimedOutExecutions(): Promise<number> {
    try {
      const expiredExecutions = await WorkflowExecution.find({
        'dynamicInput.isWaitingForInput': true,
        'dynamicInput.timeoutAt': { $lt: new Date() },
        status: 'waiting_for_input',
      })
        .populate('workflowCatalogId', 'name description')
        .populate('userId', 'name email')

      if (expiredExecutions.length === 0) return 0

      let processedCount = 0

      for (const execution of expiredExecutions) {
        try {
          await execution.markTimeout()

          try {
            const workflow = execution.workflowCatalogId as any
            const user = execution.userId as any
            await NotificationService.notifyExecutionFailed(
              execution,
              workflow,
              user
            )
          } catch {}

          processedCount++
        } catch {}
      }

      return processedCount
    } catch {
      return 0
    }
  }

  private static async cleanupOldInputRecords(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

      const result = await UserInput.deleteMany({
        status: { $in: ['received', 'expired', 'cancelled'] },
        createdAt: { $lt: ninetyDaysAgo },
      })

      return result.deletedCount
    } catch (error) {
      return 0
    }
  }

  static getLastRun(): Date | null {
    return this.lastRun
  }

  static getIsRunning(): boolean {
    return this.isRunning
  }

  static getStatus(): {
    isRunning: boolean
    lastRun: Date | null
    nextRun?: Date
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.lastRun
        ? new Date(this.lastRun.getTime() + 5 * 60 * 1000)
        : undefined,
    }
  }
}

export function startCleanupJob() {
  CleanupExpiredInputsJob.run()

  setInterval(
    async () => {
      try {
        await CleanupExpiredInputsJob.run()
      } catch (error) {}
    },
    5 * 60 * 1000
  )
}

export async function runManualCleanup(): Promise<CleanupStats> {
  return CleanupExpiredInputsJob.run()
}

export default CleanupExpiredInputsJob
