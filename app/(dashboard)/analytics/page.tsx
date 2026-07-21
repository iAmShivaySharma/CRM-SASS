'use client'

import dynamic from 'next/dynamic'
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  Calendar,
  Download,
  Filter,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  StatsCardSkeleton,
  CardSkeleton,
  PageHeaderSkeleton,
} from '@/components/ui/skeleton'
import { useAppSelector } from '@/lib/hooks'
import { useGetDashboardAnalyticsQuery } from '@/lib/api/analyticsApi'
import { useWorkspaceFormatting } from '@/lib/utils/workspace-formatting'

const AnalyticsCharts = dynamic(
  () =>
    import('@/components/analytics/AnalyticsCharts').then(mod => ({
      default: mod.AnalyticsCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    ),
  }
)

export default function AnalyticsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { formatCurrency, formatPercentage } = useWorkspaceFormatting()

  const { data: analyticsData, isLoading } = useGetDashboardAnalyticsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  const data = analyticsData?.data

  const formatChange = (current: number, previous: number) => {
    if (previous === 0) return { value: '-', trend: 'up' as const }
    const change = ((current - previous) / previous) * 100
    return {
      value: `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`,
      trend: change >= 0 ? ('up' as const) : ('down' as const),
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-6 p-4 sm:p-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatsCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  const revenueChange = data
    ? formatChange(data.totalRevenue, data.totalRevenuePrevious)
    : { value: '-', trend: 'up' as const }
  const leadsChange = data
    ? formatChange(data.totalLeads, data.totalLeadsPrevious)
    : { value: '-', trend: 'up' as const }
  const conversionChange = data
    ? formatChange(data.conversionRate, data.conversionRatePrevious)
    : { value: '-', trend: 'up' as const }

  const stats = [
    {
      title: 'Total Revenue',
      value: data ? formatCurrency(data.totalRevenue) : '-',
      change: revenueChange,
      icon: DollarSign,
      iconColor: 'text-green-600',
    },
    {
      title: 'Conversion Rate',
      value: data ? `${data.conversionRate.toFixed(1)}%` : '-',
      change: conversionChange,
      icon: Target,
      iconColor: 'text-blue-600',
    },
    {
      title: 'Total Leads',
      value: data ? data.totalLeads.toLocaleString() : '-',
      change: leadsChange,
      icon: Users,
      iconColor: 'text-purple-600',
    },
    {
      title: 'Avg Deal Size',
      value:
        data && data.totalLeads > 0
          ? formatCurrency(data.totalRevenue / data.totalLeads)
          : '-',
      change: { value: '-', trend: 'up' as const },
      icon: Calendar,
      iconColor: 'text-orange-600',
    },
  ]

  return (
    <div className="flex flex-col space-y-6 p-4 sm:p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Track your business performance and insights
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        {stats.map(stat => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                <span
                  className={`flex items-center ${stat.change.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}
                >
                  {stat.change.value !== '-' &&
                    (stat.change.trend === 'up' ? (
                      <TrendingUp className="mr-1 h-3 w-3" />
                    ) : (
                      <TrendingDown className="mr-1 h-3 w-3" />
                    ))}
                  {stat.change.value}
                </span>
                from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnalyticsCharts />
    </div>
  )
}
