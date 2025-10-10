import { connectToMongoDB } from '@/lib/mongodb/connection'
import { UserInput, WorkflowExecution } from '@/lib/mongodb/models'
import { NotificationService } from '@/lib/services/notificationService'

export interface CleanupStats {
  expiredInputs: number
  timedOutExecutions: number
  processedNotifications: number
  errors: number
}

/**
 * Cleanup job for expired workflow inputs and related data
 */
export class CleanupExpiredInputsJob {
  private static isRunning = false
  private static lastRun: Date | null = null

  /**
   * Run the cleanup job
   */
  static async run(): Promise<CleanupStats> {
    if (this.isRunning) {
      console.log('Cleanup job is already running, skipping...')
      return { expiredInputs: 0, timedOutExecutions: 0, processedNotifications: 0, errors: 0 }
    }

    this.isRunning = true
    const stats: CleanupStats = {
      expiredInputs: 0,
      timedOutExecutions: 0,
      processedNotifications: 0,
      errors: 0
    }

    try {
      await connectToMongoDB()

      console.log('Starting cleanup job for expired workflow inputs...')

      // 1. Find and handle expired user inputs
      stats.expiredInputs = await this.handleExpiredInputs()

      // 2. Find and timeout expired executions
      stats.timedOutExecutions = await this.handleTimedOutExecutions()

      // 3. Process workflow notifications
      try {
        await NotificationService.processWorkflowNotifications()
        stats.processedNotifications = 1
      } catch (error) {
        console.error('Error processing workflow notifications:', error)
        stats.errors++
      }

      // 4. Clean up old UserInput records (older than 90 days)
      await this.cleanupOldInputRecords()

      this.lastRun = new Date()

      console.log('Cleanup job completed:', stats)

    } catch (error) {
      console.error('Error in cleanup job:', error)
      stats.errors++
    } finally {
      this.isRunning = false
    }

    return stats
  }

  /**
   * Handle expired user inputs
   */
  private static async handleExpiredInputs(): Promise<number> {
    try {
      // Find expired user inputs
      const expiredInputs = await UserInput.findExpired()

      let processedCount = 0

      for (const userInput of expiredInputs) {
        try {
          // Mark input as expired
          await userInput.markExpired()

          // Get related execution
          const execution = await WorkflowExecution.findById(userInput.executionId)
            .populate('workflowCatalogId', 'name description')
            .populate('userId', 'name email')

          if (execution && execution.dynamicInput.isWaitingForInput) {
            // Mark execution as timed out
            await execution.markTimeout()

            // Send timeout notification
            try {
              const workflow = execution.workflowCatalogId as any
              const user = execution.userId as any

              await NotificationService.notifyExecutionFailed(execution, workflow, user)
            } catch (notificationError) {
              console.error('Error sending timeout notification:', notificationError)
            }
          }

          processedCount++
          console.log(`Processed expired input: ${userInput._id}`)

        } catch (error) {
          console.error(`Error processing expired input ${userInput._id}:`, error)
        }
      }

      return processedCount

    } catch (error) {
      console.error('Error handling expired inputs:', error)
      return 0
    }
  }

  /**
   * Handle timed out executions
   */
  private static async handleTimedOutExecutions(): Promise<number> {
    try {
      // Find executions that are waiting for input but have expired timeouts
      const expiredExecutions = await WorkflowExecution.find({
        'dynamicInput.isWaitingForInput': true,
        'dynamicInput.timeoutAt': { $lt: new Date() },
        status: 'waiting_for_input'
      })
      .populate('workflowCatalogId', 'name description')
      .populate('userId', 'name email')

      let processedCount = 0

      for (const execution of expiredExecutions) {
        try {
          // Mark execution as timed out
          await execution.markTimeout()

          // Send timeout notification
          try {
            const workflow = execution.workflowCatalogId as any
            const user = execution.userId as any

            await NotificationService.notifyExecutionFailed(execution, workflow, user)
          } catch (notificationError) {
            console.error('Error sending timeout notification:', notificationError)
          }

          processedCount++
          console.log(`Processed timed out execution: ${execution._id}`)

        } catch (error) {
          console.error(`Error processing timed out execution ${execution._id}:`, error)
        }
      }

      return processedCount

    } catch (error) {
      console.error('Error handling timed out executions:', error)
      return 0
    }
  }

  /**
   * Clean up old input records (older than 90 days)
   */
  private static async cleanupOldInputRecords(): Promise<number> {
    try {
      const ninetyDaysAgo = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000))

      const result = await UserInput.deleteMany({
        status: { $in: ['received', 'expired', 'cancelled'] },
        createdAt: { $lt: ninetyDaysAgo }
      })

      if (result.deletedCount > 0) {
        console.log(`Cleaned up ${result.deletedCount} old input records`)
      }

      return result.deletedCount

    } catch (error) {
      console.error('Error cleaning up old input records:', error)
      return 0
    }
  }

  /**
   * Get the last run time
   */
  static getLastRun(): Date | null {
    return this.lastRun
  }

  /**
   * Check if the job is currently running
   */
  static getIsRunning(): boolean {
    return this.isRunning
  }

  /**
   * Get job status
   */
  static getStatus(): {
    isRunning: boolean
    lastRun: Date | null
    nextRun?: Date
  } {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      nextRun: this.lastRun ? new Date(this.lastRun.getTime() + (5 * 60 * 1000)) : undefined // Next run in 5 minutes
    }
  }
}

/**
 * Start the periodic cleanup job
 */
export function startCleanupJob() {
  // Run immediately
  CleanupExpiredInputsJob.run()

  // Run every 5 minutes
  setInterval(async () => {
    try {
      await CleanupExpiredInputsJob.run()
    } catch (error) {
      console.error('Error in cleanup job interval:', error)
    }
  }, 5 * 60 * 1000)

  console.log('Cleanup job scheduled to run every 5 minutes')
}

/**
 * Manual cleanup function for API endpoints
 */
export async function runManualCleanup(): Promise<CleanupStats> {
  return CleanupExpiredInputsJob.run()
}

export default CleanupExpiredInputsJob