'use client'

import { TrendingUp, Users, DollarSign, Target } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatsCardSkeleton } from '@/components/ui/skeleton'
import { useAppSelector } from '@/lib/hooks'
import { useWorkspaceFormatting } from '@/lib/utils/workspace-formatting'
import { useGetDashboardAnalyticsQuery } from '@/lib/api/analyticsApi'

interface StatData {
  title: string
  value: string
  change: string
  trend: 'up' | 'down'
  icon: any
  color: string
}

const defaultStats: StatData[] = [
  {
    title: 'Total Leads',
    value: '0',
    change: '+0%',
    trend: 'up',
    icon: Users,
    color: 'text-blue-600',
  },
  {
    title: 'Conversion Rate',
    value: '0%',
    change: '+0%',
    trend: 'up',
    icon: Target,
    color: 'text-green-600',
  },
  {
    title: 'Revenue',
    value: '$0',
    change: '+0%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-yellow-600',
  },
  {
    title: 'Growth',
    value: '0%',
    change: '+0%',
    trend: 'up',
    icon: TrendingUp,
    color: 'text-purple-600',
  },
]

export function StatsCards() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { formatCurrency, formatPercentage } = useWorkspaceFormatting()

  const {
    data: analyticsData,
    isLoading,
    error,
  } = useGetDashboardAnalyticsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  const calculateChangePercentage = (
    current: number,
    previous: number
  ): { change: string; trend: 'up' | 'down' } => {
    if (previous === 0) return { change: '+0%', trend: 'up' }
    const changePercent = ((current - previous) / previous) * 100
    return {
      change: `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`,
      trend: changePercent >= 0 ? 'up' : 'down',
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <StatsCardSkeleton key={i} />
        ))}
      </div>
    )
  }

  if (error || !analyticsData?.data) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {defaultStats.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className="text-gray-500">{stat.change}</span> from last
                month
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { data } = analyticsData
  const leadsChange = calculateChangePercentage(
    data.totalLeads,
    data.totalLeadsPrevious
  )
  const conversionChange = calculateChangePercentage(
    data.conversionRate,
    data.conversionRatePrevious
  )
  const revenueChange = calculateChangePercentage(
    data.totalRevenue,
    data.totalRevenuePrevious
  )
  const growthChange = calculateChangePercentage(
    data.growth,
    data.growthPrevious
  )

  const stats: StatData[] = [
    {
      title: 'Total Leads',
      value: data.totalLeads.toString(),
      change: leadsChange.change,
      trend: leadsChange.trend,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Conversion Rate',
      value: formatPercentage(data.conversionRate),
      change: conversionChange.change,
      trend: conversionChange.trend,
      icon: Target,
      color: 'text-green-600',
    },
    {
      title: 'Revenue',
      value: formatCurrency(data.totalRevenue),
      change: revenueChange.change,
      trend: revenueChange.trend,
      icon: DollarSign,
      color: 'text-yellow-600',
    },
    {
      title: 'Growth',
      value: formatPercentage(data.growth),
      change: growthChange.change,
      trend: growthChange.trend,
      icon: TrendingUp,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(stat => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              <span
                className={
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }
              >
                {stat.change}
              </span>{' '}
              from last month
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
