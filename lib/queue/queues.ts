import { Queue } from 'bullmq'
import { getQueueConnection } from './connection'

const connection = getQueueConnection()

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },
    removeOnFail: { count: 5000 },
  },
})

export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  },
})

export const webhookQueue = new Queue('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 10000 },
  },
})

export const activityQueue = new Queue('activity', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  },
})
