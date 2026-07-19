import Redis from 'ioredis'

let redis: Redis | null = null

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      lazyConnect: true,
      enableReadyCheck: true,
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
        return targetErrors.some(e => err.message.includes(e))
      },
    })

    redis.on('error', () => {})
  }

  return redis
}

const noopRedis = new Proxy({} as Redis, {
  get(_, prop) {
    if (typeof prop === 'string') {
      return (..._args: any[]) => Promise.resolve(null)
    }
    return undefined
  },
})

export default getRedisClient() || noopRedis
