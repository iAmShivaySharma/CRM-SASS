import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

// Analytics API Types
export interface DashboardAnalytics {
  totalLeads: number
  totalLeadsPrevious: number
  conversionRate: number
  conversionRatePrevious: number
  totalRevenue: number
  totalRevenuePrevious: number
  growth: number
  growthPrevious: number

  // Quick stats
  activeDeals: number
  monthlyRevenue: number
  newLeads: number

  // Performance metrics
  salesTargetProgress: number
  leadQualityScore: number
  customerSatisfaction: number
}

export interface PipelineAnalytics {
  statusName: string
  count: number
  percentage: number
  value: number
}

export interface TimeSeriesData {
  date: string
  leads: number
  revenue: number
  conversions: number
}

export interface LeadSourceAnalytics {
  source: string
  count: number
  percentage: number
  conversionRate: number
}

export interface AnalyticsFilters {
  workspaceId: string
  dateRange?: {
    from: string
    to: string
  }
  compareWith?: {
    from: string
    to: string
  }
}

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/analytics',
    credentials: 'include',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: [
    'Analytics',
    'Dashboard',
    'Pipeline',
    'TimeSeries',
    'LeadSource',
    'Workspace',
  ],
  endpoints: builder => ({
    // Dashboard Analytics
    getDashboardAnalytics: builder.query<
      { success: boolean; data: DashboardAnalytics },
      AnalyticsFilters
    >({
      query: ({ workspaceId, dateRange, compareWith }) => {
        const params = new URLSearchParams({ workspaceId })
        if (dateRange) {
          params.append('from', dateRange.from)
          params.append('to', dateRange.to)
        }
        if (compareWith) {
          params.append('compareFrom', compareWith.from)
          params.append('compareTo', compareWith.to)
        }
        return `dashboard?${params}`
      },
      providesTags: ['Analytics', 'Dashboard', 'Workspace'],
    }),

    // Pipeline Analytics
    getPipelineAnalytics: builder.query<
      { success: boolean; data: PipelineAnalytics[] },
      AnalyticsFilters
    >({
      query: ({ workspaceId, dateRange }) => {
        const params = new URLSearchParams({ workspaceId })
        if (dateRange) {
          params.append('from', dateRange.from)
          params.append('to', dateRange.to)
        }
        return `pipeline?${params}`
      },
      providesTags: ['Analytics', 'Pipeline', 'Workspace'],
    }),

    // Time Series Analytics
    getTimeSeriesAnalytics: builder.query<
      { success: boolean; data: TimeSeriesData[] },
      AnalyticsFilters & { granularity?: 'day' | 'week' | 'month' }
    >({
      query: ({ workspaceId, dateRange, granularity = 'day' }) => {
        const params = new URLSearchParams({ workspaceId, granularity })
        if (dateRange) {
          params.append('from', dateRange.from)
          params.append('to', dateRange.to)
        }
        return `timeseries?${params}`
      },
      providesTags: ['Analytics', 'TimeSeries', 'Workspace'],
    }),

    // Lead Source Analytics
    getLeadSourceAnalytics: builder.query<
      { success: boolean; data: LeadSourceAnalytics[] },
      AnalyticsFilters
    >({
      query: ({ workspaceId, dateRange }) => {
        const params = new URLSearchParams({ workspaceId })
        if (dateRange) {
          params.append('from', dateRange.from)
          params.append('to', dateRange.to)
        }
        return `lead-sources?${params}`
      },
      providesTags: ['Analytics', 'LeadSource', 'Workspace'],
    }),

    // Performance Metrics
    getPerformanceMetrics: builder.query<
      {
        success: boolean
        data: {
          salesTargetProgress: number
          leadQualityScore: number
          customerSatisfaction: number
          averageDealSize: number
          salesCycleLength: number
          winRate: number
        }
      },
      AnalyticsFilters
    >({
      query: ({ workspaceId, dateRange }) => {
        const params = new URLSearchParams({ workspaceId })
        if (dateRange) {
          params.append('from', dateRange.from)
          params.append('to', dateRange.to)
        }
        return `performance?${params}`
      },
      providesTags: ['Analytics', 'Workspace'],
    }),
  }),
})

export const {
  useGetDashboardAnalyticsQuery,
  useGetPipelineAnalyticsQuery,
  useGetTimeSeriesAnalyticsQuery,
  useGetLeadSourceAnalyticsQuery,
  useGetPerformanceMetricsQuery,
} = analyticsApi
