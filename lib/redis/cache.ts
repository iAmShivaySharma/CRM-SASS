import redis, { isRedisReady } from './client'

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  if (isRedisReady()) {
    try {
      const hit = await redis.get(key)
      if (hit) {
        return JSON.parse(hit) as T
      }
    } catch {}
  }

  const data = await fetcher()

  if (isRedisReady()) {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(data))
    } catch {}
  }

  return data
}

export async function invalidateCache(pattern: string): Promise<void> {
  if (!isRedisReady()) return

  try {
    let cursor = '0'
    do {
      const result = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      if (!result) break
      cursor = result[0]
      const keys = result[1]
      if (keys && keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch {}
}

export async function invalidateKeys(...keys: string[]): Promise<void> {
  if (!isRedisReady()) return

  try {
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {}
}
