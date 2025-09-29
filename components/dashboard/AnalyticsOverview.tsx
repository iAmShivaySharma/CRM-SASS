'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  Users,
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useWorkspaceFormatting } from '@/lib/utils/workspace-formatting'
import {
  useGetDashboardAnalyticsQuery,
  useGetPerformanceMetricsQuery,
} from '@/lib/api/analyticsApi'

// Mock analytics data
const analyticsData = {
  revenue: {
    current: 45280,
    previous: 38950,
    change: 16.3,
    trend: 'up',
  },
  leads: {
    current: 1247,
    previous: 1089,
    change: 14.5,
    trend: 'up',
  },
  conversion: {
    current: 23.8,
    previous: 21.2,
    change: 12.3,
    trend: 'up',
  },
  customers: {
    current: 892,
    previous: 945,
    change: -5.6,
    trend: 'down',
  },
}

const quickStats = [
  {
    label: 'Active Deals',
    value: '47',
    icon: Target,
    color: 'text-blue-600',
  },
  {
    label: 'This Month',
    value: '$12.4k',
    icon: DollarSign,
    color: 'text-green-600',
  },
  {
    label: 'New Leads',
    value: '156',
    icon: Users,
    color: 'text-purple-600',
  },
]

export function AnalyticsOverview() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { formatCurrency, formatNumber, formatPercentage } =
    useWorkspaceFormatting()

  const { data: analyticsData, isLoading: analyticsLoading } =
    useGetDashboardAnalyticsQuery(
      { workspaceId: currentWorkspace?.id || '' },
      { skip: !currentWorkspace?.id }
    )

  const { data: performanceData, isLoading: performanceLoading } =
    useGetPerformanceMetricsQuery(
      { workspaceId: currentWorkspace?.id || '' },
      { skip: !currentWorkspace?.id }
    )

  const isLoading = analyticsLoading || performanceLoading

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 rounded bg-gray-200"></div>
                  <div className="h-8 rounded bg-gray-200"></div>
                  <div className="h-3 rounded bg-gray-200"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const analytics = analyticsData?.data
  const performance = performanceData?.data

  if (!analytics || !performance) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Analytics Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Unable to load analytics data
          </p>
        </CardContent>
      </Card>
    )
  }

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return { value: 0, trend: 'up' as const }
    const change = ((current - previous) / previous) * 100
    return {
      value: Math.abs(change),
      trend: change >= 0 ? ('up' as const) : ('down' as const),
    }
  }

  const revenueChange = calculateChange(
    analytics.totalRevenue,
    analytics.totalRevenuePrevious
  )
  const leadsChange = calculateChange(
    analytics.totalLeads,
    analytics.totalLeadsPrevious
  )
  const conversionChange = calculateChange(
    analytics.conversionRate,
    analytics.conversionRatePrevious
  )

  const quickStats = [
    {
      label: 'Active Deals',
      value: analytics.activeDeals.toString(),
      icon: Target,
      color: 'text-blue-600',
    },
    {
      label: 'This Month',
      value: formatCurrency(analytics.monthlyRevenue, { compact: true }),
      icon: DollarSign,
      color: 'text-green-600',
    },
    {
      label: 'New Leads',
      value: analytics.newLeads.toString(),
      icon: Users,
      color: 'text-purple-600',
    },
  ]

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-lg font-semibold">
          Analytics Overview
        </CardTitle>
        <Button variant="outline" size="sm" className="text-xs">
          <BarChart3 className="mr-1 h-4 w-4" />
          View Details
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Revenue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Revenue
              </span>
              <div
                className={`flex items-center space-x-1 text-xs ${
                  revenueChange.trend === 'up'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {revenueChange.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{formatPercentage(revenueChange.value)}</span>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(analytics.totalRevenue)}
            </div>
            <div className="text-xs text-gray-500">
              vs {formatCurrency(analytics.totalRevenuePrevious)} last month
            </div>
          </div>

          {/* Leads */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Total Leads
              </span>
              <div
                className={`flex items-center space-x-1 text-xs ${
                  leadsChange.trend === 'up' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {leadsChange.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{formatPercentage(leadsChange.value)}</span>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(analytics.totalLeads)}
            </div>
            <div className="text-xs text-gray-500">
              vs {formatNumber(analytics.totalLeadsPrevious)} last month
            </div>
          </div>

          {/* Conversion Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Conversion
              </span>
              <div
                className={`flex items-center space-x-1 text-xs ${
                  conversionChange.trend === 'up'
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >
                {conversionChange.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{formatPercentage(conversionChange.value)}</span>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {formatPercentage(analytics.conversionRate)}
            </div>
            <div className="text-xs text-gray-500">
              vs {formatPercentage(analytics.conversionRatePrevious)} last month
            </div>
          </div>

          {/* Growth */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Growth
              </span>
              <div
                className={`flex items-center space-x-1 text-xs ${
                  analytics.growth >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                {analytics.growth >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>{formatPercentage(Math.abs(analytics.growth))}</span>
              </div>
            </div>
            <div className="text-2xl font-bold">
              {formatPercentage(analytics.growth)}
            </div>
            <div className="text-xs text-gray-500">overall growth rate</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="border-t pt-4">
          <h4 className="mb-3 text-sm font-medium text-gray-900 dark:text-white">
            Quick Stats
          </h4>
          <div className="grid grid-cols-3 gap-4">
            {quickStats.map((stat, index) => (
              <div key={index} className="text-center">
                <div
                  className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-lg font-semibold">{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="border-t pt-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
              Performance
            </h4>
            <Badge variant="secondary" className="text-xs">
              This Month
            </Badge>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Sales Target
              </span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-20 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-green-600"
                    style={{
                      width: `${Math.min(performance.salesTargetProgress, 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(performance.salesTargetProgress)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Lead Quality
              </span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-20 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{
                      width: `${Math.min(performance.leadQualityScore, 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(performance.leadQualityScore)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Customer Satisfaction
              </span>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-20 rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full bg-purple-600"
                    style={{
                      width: `${Math.min(performance.customerSatisfaction, 100)}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium">
                  {Math.round(performance.customerSatisfaction)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
