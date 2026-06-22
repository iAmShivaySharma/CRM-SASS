'use client'

import { useState } from 'react'
import {
  Clock,
  Users,
  Calendar,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Timer,
  MapPin,
} from 'lucide-react'
import { format } from 'date-fns'
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
import { useGetEmployeesQuery } from '@/lib/api/attendanceApi'
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

  // Get employees with today's attendance data
  const {
    data: employeesData,
    isLoading,
    error,
  } = useGetEmployeesQuery(
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
          <Badge className="bg-gray-100 text-gray-800">
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

  // Filter employees by status if needed
  const employees = employeesData?.employees || []
  const filteredEmployees = employees.filter(employee => {
    if (statusFilter === 'all') return true
    const attendance = employee.todayAttendance
    if (!attendance) return statusFilter === 'absent'
    return attendance.status === statusFilter
  })

  return (
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
                <Button variant="outline" size="sm" className="h-8">
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
                      {/* Clock In Time */}
                      {attendance?.clockIn && (
                        <div className="text-center">
                          <div className="text-muted-foreground">In</div>
                          <div className="font-medium">
                            {format(new Date(attendance.clockIn), 'HH:mm')}
                          </div>
                        </div>
                      )}

                      {/* Work Time */}
                      {attendance && (
                        <div className="text-center">
                          <div className="text-muted-foreground">Hours</div>
                          <div className="font-medium">
                            {formatWorkTime(attendance.totalWorkTime || 0)}
                          </div>
                        </div>
                      )}

                      {/* Status */}
                      <div className="text-right">
                        {getStatusBadge(displayStatus)}
                      </div>
                    </div>
                  </div>
                )
              })
            )}

            {detailed && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-center">
                  <Button variant="outline" size="sm">
                    Load More Employees
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
