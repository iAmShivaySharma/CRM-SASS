export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { collectMetrics } from '@/lib/monitoring/metrics'

export async function GET() {
  const metrics = await collectMetrics()
  return new NextResponse(metrics, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
