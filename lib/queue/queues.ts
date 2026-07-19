import { Queue } from 'bullmq'
import { getQueueConnection } from './connection'

function createQueue(name: string, options: object) {
  let queue: Queue | null = null
  return {
    get instance() {
      if (!queue) {
        queue = new Queue(name, {
          connection: getQueueConnection(),
          defaultJobOptions: options,
        })
      }
      return queue
    },
    add: (...args: Parameters<Queue['add']>) => {
      if (!process.env.REDIS_URL) return Promise.resolve(null)
      if (!queue) {
        queue = new Queue(name, {
          connection: getQueueConnection(),
          defaultJobOptions: options,
        })
      }
      return queue.add(...args)
    },
  }
}

export const emailQueue = createQueue('email', {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5000 },
  removeOnComplete: { count: 1000 },
  removeOnFail: { count: 5000 },
})

export const notificationQueue = createQueue('notifications', {
  attempts: 2,
  backoff: { type: 'fixed', delay: 2000 },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 2000 },
})

export const webhookQueue = createQueue('webhooks', {
  attempts: 5,
  backoff: { type: 'exponential', delay: 10000 },
  removeOnComplete: { count: 2000 },
  removeOnFail: { count: 10000 },
})

export const activityQueue = createQueue('activity', {
  attempts: 2,
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 },
})
