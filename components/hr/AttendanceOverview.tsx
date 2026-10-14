'use client'

import { useState, useEffect } from 'react'
import {
  Clock,
  Users,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  MapPin,
  Play,
  LogOut,
  Loader2,
  Coffee,
  Pause,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  useGetAttendanceEmployeesQuery,
  useGetTodayAttendanceQuery,
  useAttendanceActionMutation,
} from '@/lib/api/attendanceApi'
import { useAppSelector } from '@/lib/hooks'

interface AttendanceOverviewProps {
  detailed?: boolean
}

export function AttendanceOverview({
  detailed = false,
}: AttendanceOverviewProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [dateFilter, setDateFilter] = useState('today')
  const [statusFilter, setStatusFilter] = useState('all')

  const {
    data: employeesData,
    isLoading,
    error,
  } = useGetAttendanceEmployeesQuery(
    {
      limit: detailed ? 50 : 10,
      includeAttendance: true,
      workspaceId: currentWorkspace?.id || '',
    },
    {
      skip: !currentWorkspace?.id,
    }
  )

  function getStartDate(filter: string) {
    const today = new Date()
    switch (filter) {
      case 'today':
        return today.toISOString().split('T')[0]
      case 'week':
        const weekStart = new Date(
          today.setDate(today.getDate() - today.getDay())
        )
        return weekStart.toISOString().split('T')[0]
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
        return monthStart.toISOString().split('T')[0]
      default:
        return today.toISOString().split('T')[0]
    }
  }

  function getEndDate(filter: string) {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clocked_in':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="mr-1 h-3 w-3" />
            Working
          </Badge>
        )
      case 'clocked_out':
        return (
          <Badge className="bg-muted text-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Finished
          </Badge>
        )
      case 'on_break':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Timer className="mr-1 h-3 w-3" />
            On Break
          </Badge>
        )
      case 'late':
        return (
          <Badge className="bg-red-100 text-red-800">
            <AlertTriangle className="mr-1 h-3 w-3" />
            Late
          </Badge>
        )
      case 'absent':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="mr-1 h-3 w-3" />
            Absent
          </Badge>
        )
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const formatWorkTime = (minutes: number) => {
    if (!minutes) return '0h 0m'
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const {
    data: todayData,
    isLoading: isTodayLoading,
    refetch: refetchToday,
  } = useGetTodayAttendanceQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )
  const [attendanceAction, { isLoading: isActionLoading }] =
    useAttendanceActionMutation()

  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleAction = async (
    action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
  ) => {
    try {
      let locationData: {
        latitude: number
        longitude: number
        address?: string
      } | undefined

      if (
        (action === 'clock_in' || action === 'clock_out') &&
        navigator.geolocation
      ) {
        try {
          const pos = await new Promise<GeolocationPosition>(
            (resolve, reject) =>
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 300000,
              })
          )
          locationData = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            address: 'Current Location',
          }
        } catch {}
      }

      const result = await attendanceAction({
        action,
        workType: action === 'clock_in' ? 'office' : undefined,
        location: locationData,
        workspaceId: currentWorkspace?.id || '',
      }).unwrap()

      toast.success(result.message)
      refetchToday()
    } catch (error: any) {
      toast.error(error.data?.error || `Failed to ${action.replace('_', ' ')}`)
    }
  }

  const myAttendance = todayData?.attendance
  const actions = todayData?.actions
  const currentWorkTime = todayData?.currentWorkTime

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const getMyStatusBadge = () => {
    if (!myAttendance) return null
    switch (myAttendance.status) {
      case 'clocked_in':
        return (
          <Badge className="border-0 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle className="mr-1 h-3 w-3" />
            Working
          </Badge>
        )
      case 'on_break':
        return (
          <Badge className="border-0 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Pause className="mr-1 h-3 w-3" />
            On Break
          </Badge>
        )
      case 'clocked_out':
        return (
          <Badge className="border-0 bg-muted text-muted-foreground">
            <Clock className="mr-1 h-3 w-3" />
            Finished
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            {myAttendance.displayStatus || myAttendance.status}
          </Badge>
        )
    }
  }

  const employees = employeesData?.employees || []
  const filteredEmployees = employees.filter(employee => {
    if (statusFilter === 'all') return true
    const attendance = employee.todayAttendance
    if (!attendance) return statusFilter === 'absent'
    return attendance.status === statusFilter
  })

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardContent className="p-4">
          {isTodayLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                Loading your attendance...
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-xl font-bold tabular-nums text-transparent">
                      {format(currentTime, 'HH:mm:ss')}
                    </span>
                    {getMyStatusBadge()}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{format(currentTime, 'EEEE, MMMM do')}</span>
                    {myAttendance?.clockIn && (
                      <span className="flex items-center gap-1">
                        <Play className="h-3 w-3" />
                        In at {format(new Date(myAttendance.clockIn), 'HH:mm')}
                      </span>
                    )}
                    {myAttendance &&
                      myAttendance.status !== 'clocked_out' &&
                      currentWorkTime !== undefined && (
                        <span className="font-medium text-primary">
                          {formatDuration(currentWorkTime)} worked
                        </span>
                      )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {actions?.canClockIn && (
                  <Button
                    onClick={() => handleAction('clock_in')}
                    disabled={isActionLoading}
                    className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-600 font-medium text-white shadow-md hover:from-emerald-600 hover:to-emerald-700"
                  >
                    {isActionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Clock In
                  </Button>
                )}
                {actions?.canClockOut && (
                  <Button
                    onClick={() => handleAction('clock_out')}
                    disabled={isActionLoading}
                    className="border-0 bg-gradient-to-r from-destructive to-destructive/90 font-medium text-destructive-foreground shadow-md hover:from-destructive/90 hover:to-destructive"
                  >
                    {isActionLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    Clock Out
                  </Button>
                )}
                {actions?.canStartBreak && (
                  <Button
                    onClick={() => handleAction('break_start')}
                    disabled={isActionLoading}
                    variant="outline"
                    className="border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 text-amber-700 hover:from-amber-100 hover:to-amber-200 dark:border-amber-800 dark:from-amber-950 dark:to-amber-900 dark:text-amber-300"
                  >
                    <Coffee className="mr-2 h-4 w-4" />
                    Break
                  </Button>
                )}
                {actions?.canEndBreak && (
                  <Button
                    onClick={() => handleAction('break_end')}
                    disabled={isActionLoading}
                    className="border-0 bg-gradient-to-r from-primary to-primary/90 font-medium text-primary-foreground shadow-md hover:from-primary/90 hover:to-primary"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    End Break
                  </Button>
                )}
                {!actions?.canClockIn &&
                  !actions?.canClockOut &&
                  !actions?.canStartBreak &&
                  !actions?.canEndBreak &&
                  !myAttendance && (
                    <span className="text-sm text-muted-foreground">
                      No attendance actions available
                    </span>
                  )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Users className="h-5 w-5" />
            <span>Employee Attendance</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
            {detailed && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 w-28">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="clocked_in">Working</SelectItem>
                    <SelectItem value="clocked_out">Done</SelectItem>
                    <SelectItem value="on_break">Break</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    const rows = [
                      ['Name', 'Status', 'Clock In', 'Clock Out'],
                      ...filteredEmployees.map((emp: any) => [
                        emp.name || emp.fullName || emp.email,
                        emp.todayAttendance?.status || 'absent',
                        emp.todayAttendance?.clockIn
                          ? format(
                              new Date(emp.todayAttendance.clockIn),
                              'HH:mm'
                            )
                          : '-',
                        emp.todayAttendance?.clockOut
                          ? format(
                              new Date(emp.todayAttendance.clockOut),
                              'HH:mm'
                            )
                          : '-',
                      ]),
                    ]
                    const csv = rows.map(r => r.join(',')).join('\n')
                    const blob = new Blob([csv], { type: 'text/csv' })
                    const url = URL.createObjectURL(blob)
                    const a = document.createElement('a')
                    a.href = url
                    a.download = `attendance-${dateFilter}-${new Date().toISOString().split('T')[0]}.csv`
                    a.click()
                    URL.revokeObjectURL(url)
                  }}
                >
                  <Download className="mr-1 h-3 w-3" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className="flex animate-pulse items-center space-x-3 rounded-md bg-muted/30 p-3"
              >
                <div className="h-8 w-8 rounded-full bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-28 rounded bg-muted" />
                  <div className="h-2.5 w-40 rounded bg-muted" />
                </div>
                <div className="h-5 w-12 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <p className="mb-2 text-sm text-red-500">
              Failed to load attendance data
            </p>
            <p className="text-xs text-muted-foreground">
              Please check your connection and try again.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEmployees.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No employees found with the selected filter.
                </p>
              </div>
            ) : (
              filteredEmployees.map(employee => {
                const attendance = employee.todayAttendance
                const displayStatus = attendance?.status || 'absent'

                return (
                  <div
                    key={employee.userId}
                    className="flex items-center justify-between rounded-md bg-muted/50 p-3 transition-colors hover:bg-muted/70"
                  >
                    <div className="flex flex-1 items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={employee.avatar || undefined} />
                        <AvatarFallback className="text-xs">
                          {employee.fullName
                            .split(' ')
                            .map(n => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {employee.fullName}
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                          <span className="truncate">{employee.email}</span>
                          <span className="text-nowrap rounded bg-background px-1.5 py-0.5 text-xs">
                            {employee.role.name}
                          </span>
                          {attendance?.workType && (
                            <span className="text-nowrap flex items-center">
                              <MapPin className="mr-1 h-3 w-3" />
                              {attendance.workType === 'office'
                                ? 'Office'
                                : attendance.workType === 'remote'
                                  ? 'Remote'
                                  : attendance.workType === 'hybrid'
                                    ? 'Hybrid'
                                    : 'Field'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      {attendance?.clockIn && (
                        <div className="text-center">
                          <div className="text-muted-foreground">In</div>
                          <div className="font-medium">
                            {format(new Date(attendance.clockIn), 'HH:mm')}
                          </div>
                        </div>
                      )}

                      {attendance && (
                        <div className="text-center">
                          <div className="text-muted-foreground">Hours</div>
                          <div className="font-medium">
                            {formatWorkTime(attendance.totalWorkTime || 0)}
                          </div>
                        </div>
                      )}

                      <div className="text-right">
                        {getStatusBadge(displayStatus)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </CardContent>
    </Card>
    </div>
  )
}
