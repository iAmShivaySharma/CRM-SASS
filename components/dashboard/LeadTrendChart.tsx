'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/lib/hooks'
import { useGetTimeSeriesAnalyticsQuery } from '@/lib/api/analyticsApi'

export function LeadTrendChart() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data, isLoading, error } = useGetTimeSeriesAnalyticsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      granularity: 'day',
    },
    { skip: !currentWorkspace?.id }
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead & Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = data?.data || []

  if (error || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Lead & Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No trend data available yet
          </div>
        </CardContent>
      </Card>
    )
  }

  const formatted = chartData.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead & Revenue Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={formatted}>
            <defs>
              <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="leads"
              stroke="#3b82f6"
              fill="url(#leadGrad)"
              strokeWidth={2}
              name="Leads"
            />
            <Area
              yAxisId="right"
              type="monotone"
              dataKey="revenue"
              stroke="#10b981"
              fill="url(#revenueGrad)"
              strokeWidth={2}
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
