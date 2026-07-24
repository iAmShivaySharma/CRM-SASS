import webpush from 'web-push'
import { PushSubscription } from '@/lib/mongodb/models/PushSubscription'
import { log } from '@/lib/logging/logger'

let configured = false

function ensureConfigured() {
  if (configured) return

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY
  const vapidEmail = process.env.VAPID_EMAIL || 'mailto:admin@example.com'

  if (!vapidPublic || !vapidPrivate) return

  webpush.setVapidDetails(vapidEmail, vapidPublic, vapidPrivate)
  configured = true
}

export async function sendPushToUser(
  userId: string,
  workspaceId: string,
  payload: { title: string; body: string; url?: string; icon?: string }
) {
  ensureConfigured()
  if (!configured) return

  try {
    const subscriptions = await PushSubscription.find({
      userId,
      workspaceId,
    }).lean()

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: payload.icon || '/icons/icon-192x192.png',
    })

    for (const sub of subscriptions as any[]) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys,
          },
          notification
        )
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(sub._id)
        }
      }
    }
  } catch (error) {
    log.error('Push notification error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}

export async function sendPushToWorkspace(
  workspaceId: string,
  payload: { title: string; body: string; url?: string },
  excludeUserIds: string[] = []
) {
  ensureConfigured()
  if (!configured) return

  try {
    const query: any = { workspaceId }
    if (excludeUserIds.length > 0) {
      query.userId = { $nin: excludeUserIds }
    }

    const subscriptions = await PushSubscription.find(query).lean()

    const notification = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      icon: '/icons/icon-192x192.png',
    })

    for (const sub of subscriptions as any[]) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          notification
        )
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.findByIdAndDelete(sub._id)
        }
      }
    }
  } catch (error) {
    log.error('Push notification broadcast error', {
      error: error instanceof Error ? error.message : 'Unknown',
    })
  }
}
