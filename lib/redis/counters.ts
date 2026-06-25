import redis from './client'

export async function incrementNotificationCount(
  userId: string
): Promise<void> {
  try {
    await redis.incr(`notif:count:${userId}`)
  } catch {}
}

export async function getNotificationCount(userId: string): Promise<number> {
  try {
    const count = await redis.get(`notif:count:${userId}`)
    return parseInt(count || '0', 10)
  } catch {
    return 0
  }
}

export async function resetNotificationCount(userId: string): Promise<void> {
  try {
    await redis.set(`notif:count:${userId}`, '0')
  } catch {}
}

export async function incrementUnread(
  userId: string,
  chatRoomId: string
): Promise<void> {
  try {
    await redis.hincrby(`unread:${userId}`, chatRoomId, 1)
  } catch {}
}

export async function getUnreadCounts(
  userId: string
): Promise<Record<string, string>> {
  try {
    return await redis.hgetall(`unread:${userId}`)
  } catch {
    return {}
  }
}

export async function clearUnread(
  userId: string,
  chatRoomId: string
): Promise<void> {
  try {
    await redis.hdel(`unread:${userId}`, chatRoomId)
  } catch {}
}

export async function addOnlineUser(
  workspaceId: string,
  userId: string
): Promise<void> {
  try {
    await redis.sadd(`online:${workspaceId}`, userId)
    await redis.expire(`online:${workspaceId}`, 300)
  } catch {}
}

export async function removeOnlineUser(
  workspaceId: string,
  userId: string
): Promise<void> {
  try {
    await redis.srem(`online:${workspaceId}`, userId)
  } catch {}
}

export async function getOnlineUsers(workspaceId: string): Promise<string[]> {
  try {
    return await redis.smembers(`online:${workspaceId}`)
  } catch {
    return []
  }
}
