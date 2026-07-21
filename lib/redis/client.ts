import Redis from 'ioredis'
import { log } from '@/lib/logging/logger'

let redis: Redis | null = null
let redisReady = false

export function getRedisClient(): Redis | null {
  if (!process.env.REDIS_URL) {
    return null
  }

  if (!redis) {
    redis = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: true,
      retryStrategy(times) {
        if (times > 5) return null
        return Math.min(times * 500, 3000)
      },
      enableReadyCheck: true,
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT']
        return targetErrors.some(e => err.message.includes(e))
      },
    })

    redis.on('error', err => {
      redisReady = false
      log.error('Redis error:', { message: err.message })
    })

    redis.on('ready', () => {
      redisReady = true
      log.info('Redis connected successfully')
    })

    redis.on('close', () => {
      redisReady = false
    })

    redis.connect().catch(err => {
      log.error('Redis initial connection failed:', { message: err.message })
    })
  }

  return redis
}

export function isRedisReady(): boolean {
  return redisReady
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
