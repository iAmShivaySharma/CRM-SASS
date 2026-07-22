'use client'

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/lib/hooks'
import { useGetPipelineAnalyticsQuery } from '@/lib/api/analyticsApi'

const COLORS = [
  '#3b82f6',
  '#f59e0b',
  '#f97316',
  '#10b981',
  '#8b5cf6',
  '#ec4899',
  '#6366f1',
  '#ef4444',
]

export function PipelineChart() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const { data, isLoading, error } = useGetPipelineAnalyticsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const pipeline = data?.data || []

  if (error || pipeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No pipeline data available
          </div>
        </CardContent>
      </Card>
    )
  }

  const chartData = pipeline.map(s => ({
    name: s.statusName,
    value: s.count,
  }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                `${value} (${total > 0 ? ((value / total) * 100).toFixed(1) : 0}%)`,
                name,
              ]}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
