export const dynamic = 'force-dynamic'

import { type NextRequest, NextResponse } from 'next/server'
import { collectMetrics } from '@/lib/monitoring/metrics'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const metricsKey = process.env.METRICS_API_KEY

  if (metricsKey && authHeader !== `Bearer ${metricsKey}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const metrics = await collectMetrics()
  return new NextResponse(metrics, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
