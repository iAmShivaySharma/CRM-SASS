import Redis from 'ioredis'
import { log } from '@/lib/logging/logger'

let redis: Redis | null = null
let connectionAttempted = false

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryStrategy(times) {
        if (times > 10) return null
        return Math.min(times * 200, 3000)
      },
      enableReadyCheck: true,
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
        return targetErrors.some(e => err.message.includes(e))
      },
    })

    redis.on('error', err => {
      if (!connectionAttempted) {
        log.error('Redis connection error:', err)
        connectionAttempted = true
      }
    })

    redis.on('connect', () => {
      log.info('Redis connected successfully')
      connectionAttempted = true
    })
  }

  return redis
}

const lazyRedis = new Proxy({} as Redis, {
  get(_, prop) {
    const client = getRedisClient()
    if (client) {
      const value = (client as any)[prop]
      return typeof value === 'function' ? value.bind(client) : value
    }
    if (typeof prop === 'string') {
      return (..._args: any[]) => Promise.resolve(null)
    }
    return undefined
  },
})

export default lazyRedis
