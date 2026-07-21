'use client'

import {
  useState,
  useCallback,
  useEffect,
  useState as useStateHook,
} from 'react'
import {
  Clock,
  Calendar,
  TrendingUp,
  UserCheck,
  UserX,
  Timer,
  BarChart3,
  Settings,
  Plus,
  Download,
  PieChart,
  Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AttendanceWidget } from '@/components/attendance/AttendanceWidget'
import { AttendanceOverview } from '@/components/hr/AttendanceOverview'
import dynamic from 'next/dynamic'

const AttendanceReports = dynamic(
  () =>
    import('@/components/hr/AttendanceReports').then(mod => ({
      default: mod.AttendanceReports,
    })),
  { ssr: false }
)
import { ShiftManagement } from '@/components/hr/ShiftManagement'
import { useAppSelector } from '@/lib/hooks'

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [hrStats, setHrStats] = useStateHook<any>(null)
  const [statsLoading, setStatsLoading] = useStateHook(true)

  const fetchStats = useCallback(async () => {
    if (!currentWorkspace?.id) return
    try {
      const res = await fetch(
        `/api/hr/stats?workspaceId=${currentWorkspace.id}`,
        { credentials: 'include' }
      )
      if (res.ok) setHrStats(await res.json())
    } catch {}
    setStatsLoading(false)
  }, [currentWorkspace?.id])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const stats = {
    totalEmployees: hrStats?.totalEmployees || 0,
    presentToday: hrStats?.todayAttendance?.present || 0,
    absentToday: hrStats?.todayAttendance?.absent || 0,
    lateToday: hrStats?.todayAttendance?.late || 0,
    avgWorkHours: 0,
    totalWorkHours: 0,
    attendanceRate: hrStats?.attendanceRate || 0,
    workspaceId: currentWorkspace?.id,
  }

  const getStatusColor = (status: string, value: number) => {
    switch (status) {
      case 'present':
        return value > 85
          ? 'text-green-600'
          : value > 70
            ? 'text-yellow-600'
            : 'text-red-600'
      case 'absent':
        return value > 15
          ? 'text-red-600'
          : value > 10
            ? 'text-yellow-600'
            : 'text-green-600'
      case 'rate':
        return value > 90
          ? 'text-green-600'
          : value > 80
            ? 'text-yellow-600'
            : 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold">No Workspace Selected</h3>
          <p className="text-muted-foreground">
            Please select a workspace to view attendance data.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Attendance Management
          </h1>
          <p className="mt-1 text-muted-foreground">
            Track employee attendance and work hours for {currentWorkspace.name}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Manual Entry
          </Button>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Present Today</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.presentToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((stats.presentToday / stats.totalEmployees) * 100)}%
              attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Absent Today</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.absentToday}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.lateToday} arrived late
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Work Hours
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgWorkHours}h</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalWorkHours}h total this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Attendance Rate
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${getStatusColor('rate', stats.attendanceRate)}`}
            >
              {stats.attendanceRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days average
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Live Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center space-x-2">
            <PieChart className="h-4 w-4" />
            <span>Reports</span>
          </TabsTrigger>
          <TabsTrigger value="shifts" className="flex items-center space-x-2">
            <Timer className="h-4 w-4" />
            <span>Shifts</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid w-full grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="lg:col-span-1">
              <AttendanceWidget compact={false} showDetails={true} />
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Calendar className="h-5 w-5" />
                    <span>Today&apos;s Overview</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.presentToday}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Present
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {stats.absentToday}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Absent
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {stats.lateToday}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Late
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Attendance Rate</span>
                        <span
                          className={getStatusColor(
                            'rate',
                            stats.attendanceRate
                          )}
                        >
                          {stats.attendanceRate}%
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${stats.attendanceRate}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex space-x-2 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setActiveTab('reports')}
                      >
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Reports
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setActiveTab('shifts')}
                      >
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Shifts
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <AttendanceOverview />
        </TabsContent>

        <TabsContent value="tracking" className="space-y-4">
          <AttendanceOverview detailed={true} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <AttendanceReports />
        </TabsContent>

        <TabsContent value="shifts" className="space-y-4">
          <ShiftManagement />
        </TabsContent>
      </Tabs>
    </div>
  )
}
