import { webhookQueue } from '@/lib/queue/queues'
import { Webhook } from '@/lib/mongodb/client'

export async function dispatchWebhookEvent(
  workspaceId: string,
  event: string,
  payload: Record<string, any>
) {
  try {
    const webhooks = await Webhook.find({
      workspaceId,
      isActive: true,
      events: event,
    }).lean()

    for (const webhook of webhooks as any[]) {
      await webhookQueue.add(`${event}:${webhook._id}`, {
        url: webhook.url,
        payload: {
          event,
          timestamp: new Date().toISOString(),
          data: payload,
        },
        secret: webhook.secret,
        headers: webhook.headers || {},
        webhookId: webhook._id.toString(),
      })
    }
  } catch {}
}
