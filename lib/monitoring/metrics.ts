import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client'

const register = new Registry()

collectDefaultMetrics({ register })

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
})

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

export const mongodbConnectionErrors = new Counter({
  name: 'mongodb_connection_errors_total',
  help: 'Total MongoDB connection errors',
  registers: [register],
})

export const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [register],
})

export async function collectMetrics(): Promise<string> {
  return await register.metrics()
}

export { register }
