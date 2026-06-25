import { Worker } from 'bullmq'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Notification } from '@/lib/mongodb/models/Notification'
import { getQueueConnection } from '../connection'

const notificationWorker = new Worker(
  'notifications',
  async job => {
    await connectToMongoDB()

    const {
      recipients,
      workspaceId,
      title,
      message,
      type,
      entityType,
      entityId,
      actionUrl,
    } = job.data

    const docs = recipients.map((userId: string) => ({
      workspaceId,
      userId,
      title,
      message,
      type,
      entityType,
      entityId,
      actionUrl,
      read: false,
      createdAt: new Date(),
    }))

    await Notification.insertMany(docs, { ordered: false })

    return { notified: recipients.length }
  },
  {
    connection: getQueueConnection(),
    concurrency: 5,
    limiter: { max: 100, duration: 1000 },
  }
)

export default notificationWorker
