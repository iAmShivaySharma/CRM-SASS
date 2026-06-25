import { Worker } from 'bullmq'
import crypto from 'crypto'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { getQueueConnection } from '../connection'

const webhookWorker = new Worker(
  'webhooks',
  async job => {
    await connectToMongoDB()

    const { url, payload, secret, headers, webhookId } = job.data

    const body = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', secret || '')
      .update(body)
      .digest('hex')

    const startTime = Date.now()

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Id': webhookId || '',
        'X-Webhook-Timestamp': new Date().toISOString(),
        ...headers,
      },
      body,
      signal: AbortSignal.timeout(30000),
    })

    const duration = Date.now() - startTime

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status}`)
    }

    return { status: response.status, duration }
  },
  {
    connection: getQueueConnection(),
    concurrency: 20,
    limiter: { max: 100, duration: 1000 },
  }
)

export default webhookWorker
