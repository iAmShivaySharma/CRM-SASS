import redis from './client'

const SESSION_TTL = 7 * 24 * 60 * 60

export async function createSession(
  userId: string,
  tokenId: string,
  metadata: { workspaceId?: string; role?: string; ip?: string; ua?: string }
): Promise<void> {
  try {
    await redis.setex(
      `session:${userId}:${tokenId}`,
      SESSION_TTL,
      JSON.stringify({ ...metadata, createdAt: Date.now() })
    )
  } catch {}
}

export async function verifySession(
  userId: string,
  tokenId: string
): Promise<boolean> {
  try {
    const exists = await redis.exists(`session:${userId}:${tokenId}`)
    return exists === 1
  } catch {
    return true
  }
}

export async function revokeSession(
  userId: string,
  tokenId: string
): Promise<void> {
  try {
    await redis.del(`session:${userId}:${tokenId}`)
  } catch {}
}

export async function revokeAllSessions(userId: string): Promise<void> {
  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        `session:${userId}:*`,
        'COUNT',
        100
      )
      cursor = nextCursor
      if (keys.length > 0) await redis.del(...keys)
    } while (cursor !== '0')
  } catch {}
}
