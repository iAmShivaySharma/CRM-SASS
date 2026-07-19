import { httpRequestsTotal, httpRequestDuration } from './metrics'

export function trackRequest(
  method: string,
  path: string,
  status: number,
  durationMs: number
) {
  const normalizedPath = normalizePath(path)
  httpRequestsTotal.inc({
    method,
    path: normalizedPath,
    status: String(status),
  })
  httpRequestDuration.observe(
    { method, path: normalizedPath, status: String(status) },
    durationMs / 1000
  )
}

function normalizePath(path: string): string {
  return path
    .replace(/\/[a-f0-9]{24}/g, '/:id')
    .replace(/\/[0-9]+/g, '/:id')
    .replace(/\?.*$/, '')
}
