'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  MapPin
} from 'lucide-react'
import { format } from 'date-fns'
import { useGetAttendanceRecordsQuery } from '@/lib/api/attendanceApi'

interface AttendanceOverviewProps {
  detailed?: boolean
}

export function AttendanceOverview({ detailed = false }: AttendanceOverviewProps) {
  const [dateFilter, setDateFilter] = useState('today')
  const [statusFilter, setStatusFilter] = useState('all')

  // Get attendance records
  const { data: attendanceData, isLoading } = useGetAttendanceRecordsQuery({
    startDate: getStartDate(dateFilter),
    endDate: getEndDate(dateFilter),
    limit: detailed ? 50 : 10
  })

  function getStartDate(filter: string) {
    const today = new Date()
    switch (filter) {
      case 'today':
        return today.toISOString().split('T')[0]
      case 'week':
        const weekStart = new Date(today.setDate(today.getDate() - today.getDay()))
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
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Working</Badge>
      case 'clocked_out':
        return <Badge className="bg-gray-100 text-gray-800"><Clock className="h-3 w-3 mr-1" />Finished</Badge>
      case 'on_break':
        return <Badge className="bg-yellow-100 text-yellow-800"><Timer className="h-3 w-3 mr-1" />On Break</Badge>
      case 'late':
        return <Badge className="bg-red-100 text-red-800"><AlertTriangle className="h-3 w-3 mr-1" />Late</Badge>
      case 'absent':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Absent</Badge>
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

  const mockEmployees = [
    { id: '1', name: 'John Doe', avatar: null, email: 'john@company.com' },
    { id: '2', name: 'Jane Smith', avatar: null, email: 'jane@company.com' },
    { id: '3', name: 'Mike Johnson', avatar: null, email: 'mike@company.com' },
    { id: '4', name: 'Sarah Wilson', avatar: null, email: 'sarah@company.com' },
    { id: '5', name: 'Tom Brown', avatar: null, email: 'tom@company.com' },
  ]

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Employee Attendance</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
              </SelectContent>
            </Select>
            {detailed && (
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="clocked_in">Working</SelectItem>
                    <SelectItem value="clocked_out">Finished</SelectItem>
                    <SelectItem value="on_break">On Break</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center space-x-3 p-3 bg-gray-100 rounded-lg animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-1">
                  <div className="w-32 h-4 bg-gray-200 rounded" />
                  <div className="w-24 h-3 bg-gray-200 rounded" />
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {mockEmployees.map((employee, index) => {
              // Mock attendance data for each employee
              const attendance = {
                status: ['clocked_in', 'clocked_out', 'on_break', 'late'][Math.floor(Math.random() * 4)],
                clockIn: new Date(new Date().setHours(9, Math.floor(Math.random() * 30), 0)),
                clockOut: Math.random() > 0.3 ? new Date(new Date().setHours(17, Math.floor(Math.random() * 30), 0)) : null,
                workTime: Math.floor(Math.random() * 480) + 360, // 6-14 hours in minutes
                workType: ['office', 'remote', 'hybrid'][Math.floor(Math.random() * 3)],
                location: Math.random() > 0.7 ? 'Remote' : 'Office'
              }

              return (
                <div
                  key={employee.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={employee.avatar || undefined} />
                      <AvatarFallback>
                        {employee.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{employee.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center space-x-2">
                        <span>{employee.email}</span>
                        {attendance.location && (
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {attendance.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    {/* Clock In Time */}
                    <div className="text-sm">
                      <div className="text-muted-foreground">Clock In</div>
                      <div className="font-medium">
                        {format(attendance.clockIn, 'HH:mm')}
                      </div>
                    </div>

                    {/* Work Time */}
                    <div className="text-sm">
                      <div className="text-muted-foreground">Work Time</div>
                      <div className="font-medium">
                        {formatWorkTime(attendance.workTime)}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="min-w-0">
                      {getStatusBadge(attendance.status)}
                    </div>
                  </div>
                </div>
              )
            })}

            {detailed && (
              <div className="pt-4 border-t">
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