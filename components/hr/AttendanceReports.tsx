'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  FileBarChart,
  Download,
  Calendar as CalendarIcon,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Filter,
  Search,
  Loader2,
} from 'lucide-react'
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetAttendanceRecordsQuery,
  useGetAttendanceSummaryQuery,
  useGetEmployeesQuery,
} from '@/lib/api/attendanceApi'

const WORK_TYPE_COLORS: Record<string, string> = {
  office: '#8884d8',
  remote: '#82ca9d',
  hybrid: '#ffc658',
  field: '#ff7c7c',
}

type RechartsModule = typeof import('recharts')

function useRecharts() {
  const [mod, setMod] = useState<RechartsModule | null>(null)
  useEffect(() => {
    import('recharts').then(setMod)
  }, [])
  return mod
}

export function AttendanceReports() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const recharts = useRecharts()
  const [selectedPeriod, setSelectedPeriod] = useState('this_month')
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  })

  const getPeriodDates = (period: string) => {
    const today = new Date()
    switch (period) {
      case 'today':
        return { from: today, to: today }
      case 'yesterday':
        return { from: subDays(today, 1), to: subDays(today, 1) }
      case 'this_week':
        return { from: startOfWeek(today), to: endOfWeek(today) }
      case 'this_month':
        return { from: startOfMonth(today), to: endOfMonth(today) }
      case 'last_month': {
        const lastMonth = subDays(startOfMonth(today), 1)
        return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) }
      }
      default:
        return dateRange
    }
  }

  const activeDates = getPeriodDates(selectedPeriod)

  // API hooks
  const { data: summaryData, isLoading: summaryLoading } =
    useGetAttendanceSummaryQuery(
      {
        workspaceId: currentWorkspace?.id || '',
        startDate: activeDates.from.toISOString(),
        endDate: activeDates.to.toISOString(),
      },
      { skip: !currentWorkspace?.id }
    )

  const { data: recordsData, isLoading: recordsLoading } =
    useGetAttendanceRecordsQuery(
      {
        workspaceId: currentWorkspace?.id || '',
        startDate: activeDates.from.toISOString(),
        endDate: activeDates.to.toISOString(),
        limit: 500,
      },
      { skip: !currentWorkspace?.id }
    )

  const { data: employeesData } = useGetEmployeesQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      includeAttendance: true,
      limit: 100,
    },
    { skip: !currentWorkspace?.id }
  )

  const isLoading = summaryLoading || recordsLoading

  // Compute chart data from real records
  const attendanceData = useMemo(() => {
    if (!recordsData?.attendanceRecords) return []
    const dayMap: Record<
      string,
      { present: number; absent: number; late: number }
    > = {
      Sun: { present: 0, absent: 0, late: 0 },
      Mon: { present: 0, absent: 0, late: 0 },
      Tue: { present: 0, absent: 0, late: 0 },
      Wed: { present: 0, absent: 0, late: 0 },
      Thu: { present: 0, absent: 0, late: 0 },
      Fri: { present: 0, absent: 0, late: 0 },
      Sat: { present: 0, absent: 0, late: 0 },
    }
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    for (const rec of recordsData.attendanceRecords) {
      const dayName = dayNames[new Date(rec.date).getDay()]
      if (rec.status === 'late') {
        dayMap[dayName].late += 1
      } else if (rec.status === 'absent') {
        dayMap[dayName].absent += 1
      } else {
        dayMap[dayName].present += 1
      }
    }

    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => ({
      day,
      ...dayMap[day],
    }))
  }, [recordsData])

  const workTypeData = useMemo(() => {
    if (!recordsData?.attendanceRecords) return []
    const typeMap: Record<string, number> = {}
    for (const rec of recordsData.attendanceRecords) {
      const wt = rec.workType || 'office'
      typeMap[wt] = (typeMap[wt] || 0) + 1
    }
    return Object.entries(typeMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      color: WORK_TYPE_COLORS[name] || '#8884d8',
    }))
  }, [recordsData])

  const weeklyTrend = useMemo(() => {
    if (!recordsData?.attendanceRecords) return []
    const weekMap: Record<number, { total: number; present: number }> = {}

    for (const rec of recordsData.attendanceRecords) {
      const d = new Date(rec.date)
      const weekNum = Math.ceil(d.getDate() / 7)
      if (!weekMap[weekNum]) weekMap[weekNum] = { total: 0, present: 0 }
      weekMap[weekNum].total += 1
      if (rec.status !== 'absent') weekMap[weekNum].present += 1
    }

    return Object.entries(weekMap)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([week, data]) => ({
        week: `Week ${week}`,
        attendance:
          data.total > 0 ? Math.round((data.present / data.total) * 100) : 0,
      }))
  }, [recordsData])

  const topPerformers = useMemo(() => {
    if (!employeesData?.employees) return []
    return employeesData.employees
      .filter(e => e.todayAttendance)
      .slice(0, 5)
      .map(emp => ({
        name: emp.fullName,
        department: emp.role?.name || 'N/A',
        hours: emp.todayAttendance?.totalWorkTime
          ? Math.round(emp.todayAttendance.totalWorkTime / 60)
          : 0,
      }))
  }, [employeesData])

  const summary = summaryData?.summary
  const attendanceRate = summary?.attendanceRate ?? 0

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view reports.
          </p>
        </div>
      </div>
    )
  }

  const getAttendanceColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600'
    if (rate >= 85) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive attendance analytics and insights
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Report Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div>
              <Label>Time Period</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="this_month">This Month</SelectItem>
                  <SelectItem value="last_month">Last Month</SelectItem>
                  <SelectItem value="custom">Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <>
                <div>
                  <Label>From</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dateRange.from, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={date =>
                          date && setDateRange({ ...dateRange, from: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label>To</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(dateRange.to, 'PPP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={date =>
                          date && setDateRange({ ...dateRange, to: date })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {isLoading || !recharts ? (
        <div className="flex h-64 items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-muted-foreground">Loading report data...</p>
          </div>
        </div>
      ) : (
        <AttendanceChartsContent
          recharts={recharts}
          summary={summary}
          attendanceRate={attendanceRate}
          getAttendanceColor={getAttendanceColor}
          attendanceData={attendanceData}
          weeklyTrend={weeklyTrend}
          workTypeData={workTypeData}
          topPerformers={topPerformers}
        />
      )}
    </div>
  )
}

function AttendanceChartsContent({
  recharts,
  summary,
  attendanceRate,
  getAttendanceColor,
  attendanceData,
  weeklyTrend,
  workTypeData,
  topPerformers,
}: {
  recharts: RechartsModule
  summary: any
  attendanceRate: number
  getAttendanceColor: (rate: number) => string
  attendanceData: Array<{
    day: string
    present: number
    absent: number
    late: number
  }>
  weeklyTrend: Array<{ week: string; attendance: number }>
  workTypeData: Array<{ name: string; value: number; color: string }>
  topPerformers: Array<{ name: string; department: string; hours: number }>
}) {
  const {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
  } = recharts

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="trends">Trends</TabsTrigger>
        <TabsTrigger value="worktype">Work Types</TabsTrigger>
        <TabsTrigger value="employees">Employees</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Attendance Rate
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${getAttendanceColor(attendanceRate)}`}
              >
                {attendanceRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {summary?.presentDays || 0} present /{' '}
                {summary?.workingDays || 0} working days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Work Hours
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(summary?.totalWorkHours || 0)}h
              </div>
              <p className="text-xs text-muted-foreground">
                Avg {(summary?.averageWorkHours || 0).toFixed(1)}h/day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Late Arrivals
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {summary?.lateDays || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Absent Days</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {summary?.absentDays || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Overtime: {Math.round(summary?.totalOvertimeHours || 0)}h
              </p>
            </CardContent>
          </Card>
        </div>

        {attendanceData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Daily Attendance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="present"
                    stackId="a"
                    fill="#22c55e"
                    name="Present"
                  />
                  <Bar dataKey="late" stackId="a" fill="#eab308" name="Late" />
                  <Bar
                    dataKey="absent"
                    stackId="a"
                    fill="#ef4444"
                    name="Absent"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="trends" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Line
                    type="monotone"
                    dataKey="attendance"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', strokeWidth: 2, r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No trend data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="worktype" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Work Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {workTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={workTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({
                      name,
                      percent,
                    }: {
                      name: string
                      percent: number
                    }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {workTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No work type data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="employees" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Employee Activity (Today)</CardTitle>
          </CardHeader>
          <CardContent>
            {topPerformers.length > 0 ? (
              <div className="space-y-4">
                {topPerformers.map((employee, index) => (
                  <div
                    key={employee.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="font-medium">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {employee.department}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{employee.hours}h</div>
                      <p className="text-sm text-muted-foreground">
                        worked today
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center text-muted-foreground">
                No employee activity data available
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
