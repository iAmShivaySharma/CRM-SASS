'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CardSkeleton } from '@/components/ui/skeleton'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetTimeSeriesAnalyticsQuery,
  useGetLeadSourceAnalyticsQuery,
  useGetPerformanceMetricsQuery,
} from '@/lib/api/analyticsApi'

const SOURCE_COLORS: Record<string, string> = {
  website: '#3b82f6',
  social: '#10b981',
  social_media: '#10b981',
  email: '#f59e0b',
  referral: '#ef4444',
  phone: '#8b5cf6',
  manual: '#6366f1',
  other: '#94a3b8',
}

type RechartsModule = typeof import('recharts')

function useRecharts() {
  const [mod, setMod] = useState<RechartsModule | null>(null)
  useEffect(() => {
    import('recharts').then(setMod)
  }, [])
  return mod
}

export function AnalyticsCharts() {
  const recharts = useRecharts()
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const workspaceId = currentWorkspace?.id || ''

  const { data: timeSeriesData, isLoading: tsLoading } =
    useGetTimeSeriesAnalyticsQuery(
      { workspaceId, granularity: 'month' },
      { skip: !workspaceId }
    )

  const { data: leadSourceData, isLoading: lsLoading } =
    useGetLeadSourceAnalyticsQuery({ workspaceId }, { skip: !workspaceId })

  const { data: performanceData, isLoading: perfLoading } =
    useGetPerformanceMetricsQuery({ workspaceId }, { skip: !workspaceId })

  if (!recharts || tsLoading || lsLoading || perfLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    )
  }

  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
  } = recharts

  const timeSeries = timeSeriesData?.data || []
  const leadSources = leadSourceData?.data || []
  const performance = performanceData?.data

  const chartData = timeSeries.map(d => ({
    month: new Date(d.date).toLocaleDateString('en', { month: 'short' }),
    leads: d.leads,
    converted: d.conversions,
    revenue: d.revenue,
  }))

  const pieData = leadSources.map(s => ({
    name:
      s.source.charAt(0).toUpperCase() + s.source.slice(1).replace('_', ' '),
    value: s.count,
    color: SOURCE_COLORS[s.source] || SOURCE_COLORS.other,
  }))

  const emptyState = (msg: string) => (
    <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
      {msg}
    </div>
  )

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="leads">Lead Analytics</TabsTrigger>
        <TabsTrigger value="revenue">Revenue</TabsTrigger>
        <TabsTrigger value="team">Performance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead Conversion Trend</CardTitle>
              <CardDescription>
                Monthly lead generation and conversion rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="leads" fill="#3b82f6" name="Total Leads" />
                    <Bar dataKey="converted" fill="#10b981" name="Converted" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                emptyState('No lead data available yet')
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Lead Sources</CardTitle>
              <CardDescription>Distribution of lead sources</CardDescription>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={({
                        name,
                        value,
                      }: {
                        name: string
                        value: number
                      }) => `${name}: ${value}`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                emptyState('No lead source data available yet')
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="leads" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Lead Trend</CardTitle>
            <CardDescription>Monthly leads over time</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="leads"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="converted"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              emptyState('No lead data available yet')
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="revenue" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue growth</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toLocaleString()}`,
                      'Revenue',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              emptyState('No revenue data available yet')
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="team" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Performance Metrics</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent>
            {performance ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    label: 'Win Rate',
                    value: `${performance.winRate.toFixed(1)}%`,
                  },
                  {
                    label: 'Avg Deal Size',
                    value: `$${performance.averageDealSize.toLocaleString()}`,
                  },
                  {
                    label: 'Sales Cycle',
                    value: `${performance.salesCycleLength} days`,
                  },
                  {
                    label: 'Lead Quality',
                    value: `${performance.leadQualityScore.toFixed(1)}%`,
                  },
                  {
                    label: 'Sales Target',
                    value: `${performance.salesTargetProgress.toFixed(1)}%`,
                  },
                  {
                    label: 'Satisfaction',
                    value: `${performance.customerSatisfaction.toFixed(1)}%`,
                  },
                ].map(metric => (
                  <div
                    key={metric.label}
                    className="rounded-lg border p-4 text-center"
                  >
                    <p className="text-sm text-muted-foreground">
                      {metric.label}
                    </p>
                    <p className="mt-1 text-2xl font-bold">{metric.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              emptyState('No performance data available yet')
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
