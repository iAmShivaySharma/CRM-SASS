import redis from './client'

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const hit = await redis.get(key)
    if (hit) {
      return JSON.parse(hit) as T
    }
  } catch {}

  const data = await fetcher()

  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data))
  } catch {}

  return data
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH',
        pattern,
        'COUNT',
        100
      )
      cursor = nextCursor
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch {}
}

export async function invalidateKeys(...keys: string[]): Promise<void> {
  try {
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {}
}
