import { Worker } from 'bullmq'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Activity } from '@/lib/mongodb/models'
import { getQueueConnection } from '../connection'

const activityWorker = new Worker(
  'activity',
  async job => {
    await connectToMongoDB()

    const activities = Array.isArray(job.data) ? job.data : [job.data]
    await Activity.insertMany(activities, { ordered: false })

    return { logged: activities.length }
  },
  {
    connection: getQueueConnection(),
    concurrency: 5,
  }
)

export default activityWorker
