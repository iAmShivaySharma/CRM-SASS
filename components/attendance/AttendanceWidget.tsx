'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Clock,
  MapPin,
  Coffee,
  LogOut,
  Timer,
  Calendar,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useGetTodayAttendanceQuery, useAttendanceActionMutation } from '@/lib/api/attendanceApi'
import { format } from 'date-fns'

interface AttendanceWidgetProps {
  compact?: boolean
  showDetails?: boolean
}

export function AttendanceWidget({ compact = false, showDetails = true }: AttendanceWidgetProps) {
  const [workType, setWorkType] = useState<'office' | 'remote' | 'hybrid' | 'field'>('office')
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const { data: todayData, isLoading, refetch } = useGetTodayAttendanceQuery()
  const [attendanceAction, { isLoading: isActionLoading }] = useAttendanceActionMutation()

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Get user location
  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; address?: string }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'))
        return
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords

          // Try to get address from coordinates (optional)
          try {
            // You can integrate with a geocoding service here
            resolve({ latitude, longitude, address: 'Current Location' })
          } catch {
            resolve({ latitude, longitude })
          }
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      )
    })
  }

  const handleAttendanceAction = async (action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end') => {
    try {
      let locationData = null

      // Get location for clock in/out actions
      if (action === 'clock_in' || action === 'clock_out') {
        try {
          locationData = await getCurrentLocation()
          setLocation(locationData)
        } catch (error) {
          // Location is optional - continue without it
          console.warn('Could not get location:', error)
        }
      }

      const result = await attendanceAction({
        action,
        workType: action === 'clock_in' ? workType : undefined,
        location: locationData || undefined,
        notes: notes || undefined
      }).unwrap()

      toast.success(result.message)
      setNotes('')
      setShowLocationDialog(false)
      refetch()
    } catch (error: any) {
      toast.error(error.data?.error || `Failed to ${action.replace('_', ' ')}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in': return 'bg-green-100 text-green-800'
      case 'on_break': return 'bg-yellow-100 text-yellow-800'
      case 'clocked_out': return 'bg-gray-100 text-gray-800'
      case 'late': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clocked_in': return <CheckCircle className="h-4 w-4" />
      case 'on_break': return <Pause className="h-4 w-4" />
      case 'clocked_out': return <Clock className="h-4 w-4" />
      case 'late': return <AlertCircle className="h-4 w-4" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const formatTime = (date: Date | string) => {
    return format(new Date(date), 'HH:mm')
  }

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  if (isLoading) {
    return (
      <Card className={compact ? 'w-full' : 'w-full max-w-md'}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading attendance...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { attendance, actions, currentWorkTime, expectedClockOut, shift } = todayData || {}

  if (compact) {
    return (
      <div className="space-y-3">
        {/* Current Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{format(currentTime, 'HH:mm:ss')}</span>
          </div>
          {attendance && (
            <Badge className={getStatusColor(attendance.status)}>
              {getStatusIcon(attendance.status)}
              <span className="ml-1">{attendance.displayStatus}</span>
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          {actions?.canClockIn && (
            <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full">
                  <Play className="h-4 w-4 mr-1" />
                  Clock In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clock In</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Work Type</Label>
                    <Select value={workType} onValueChange={(value: any) => setWorkType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">🏢 Office</SelectItem>
                        <SelectItem value="remote">🏠 Remote</SelectItem>
                        <SelectItem value="hybrid">🔄 Hybrid</SelectItem>
                        <SelectItem value="field">🚗 Field Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes for today..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => handleAttendanceAction('clock_in')}
                    disabled={isActionLoading}
                    className="w-full"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Clock In
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {actions?.canClockOut && (
            <Button
              onClick={() => handleAttendanceAction('clock_out')}
              disabled={isActionLoading}
              variant="destructive"
              size="sm"
              className="w-full"
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-1" />
              )}
              Clock Out
            </Button>
          )}

          {actions?.canStartBreak && (
            <Button
              onClick={() => handleAttendanceAction('break_start')}
              disabled={isActionLoading}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Coffee className="h-4 w-4 mr-1" />
              Break
            </Button>
          )}

          {actions?.canEndBreak && (
            <Button
              onClick={() => handleAttendanceAction('break_end')}
              disabled={isActionLoading}
              size="sm"
              className="w-full"
            >
              <Play className="h-4 w-4 mr-1" />
              End Break
            </Button>
          )}
        </div>

        {/* Current Work Time */}
        {attendance && attendance.status !== 'clocked_out' && (
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">
              {formatDuration(currentWorkTime || 0)}
            </div>
            <div className="text-xs text-gray-500">
              Today's work time
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-2">
            <Timer className="h-5 w-5" />
            <span>Attendance</span>
          </div>
          <div className="text-sm font-normal text-gray-500">
            {format(currentTime, 'MMM dd, yyyy')}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Time */}
        <div className="text-center">
          <div className="text-3xl font-bold">{format(currentTime, 'HH:mm:ss')}</div>
          <div className="text-sm text-gray-500">{format(currentTime, 'EEEE')}</div>
        </div>

        {/* Status */}
        {attendance && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Status</span>
              <Badge className={getStatusColor(attendance.status)}>
                {getStatusIcon(attendance.status)}
                <span className="ml-1">{attendance.displayStatus}</span>
              </Badge>
            </div>

            {/* Clock In Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Clock In</span>
              <span className="text-sm font-medium">{formatTime(attendance.clockIn)}</span>
            </div>

            {/* Clock Out Time */}
            {attendance.clockOut && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Clock Out</span>
                <span className="text-sm font-medium">{formatTime(attendance.clockOut)}</span>
              </div>
            )}

            {/* Work Time */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Work Time</span>
              <span className="text-sm font-medium">
                {formatDuration(currentWorkTime || 0)}
              </span>
            </div>

            {/* Expected Clock Out */}
            {expectedClockOut && attendance.status !== 'clocked_out' && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expected End</span>
                <span className="text-sm font-medium">{formatTime(expectedClockOut)}</span>
              </div>
            )}

            {/* Work Type */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Work Type</span>
              <Badge variant="outline">
                {attendance.workType === 'office' && '🏢 Office'}
                {attendance.workType === 'remote' && '🏠 Remote'}
                {attendance.workType === 'hybrid' && '🔄 Hybrid'}
                {attendance.workType === 'field' && '🚗 Field'}
              </Badge>
            </div>
          </div>
        )}

        {/* Shift Info */}
        {shift && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-sm font-medium text-gray-700 mb-2">Today's Shift</div>
            <div className="text-sm text-gray-600">
              {shift.name} • {shift.startTime} - {shift.endTime} ({shift.totalHours}h)
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {actions?.canClockIn && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Play className="h-4 w-4 mr-2" />
                  Clock In
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clock In for Today</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Work Type</Label>
                    <Select value={workType} onValueChange={(value: any) => setWorkType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="office">🏢 Office</SelectItem>
                        <SelectItem value="remote">🏠 Remote</SelectItem>
                        <SelectItem value="hybrid">🔄 Hybrid</SelectItem>
                        <SelectItem value="field">🚗 Field Work</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes for today's work..."
                      className="resize-none"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => handleAttendanceAction('clock_in')}
                    disabled={isActionLoading}
                    className="w-full"
                  >
                    {isActionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    Clock In
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {actions?.canClockOut && (
            <Button
              onClick={() => handleAttendanceAction('clock_out')}
              disabled={isActionLoading}
              variant="destructive"
              className="w-full"
            >
              {isActionLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-2" />
              )}
              Clock Out
            </Button>
          )}

          {actions?.canStartBreak && (
            <Button
              onClick={() => handleAttendanceAction('break_start')}
              disabled={isActionLoading}
              variant="outline"
              className="w-full"
            >
              <Coffee className="h-4 w-4 mr-2" />
              Start Break
            </Button>
          )}

          {actions?.canEndBreak && (
            <Button
              onClick={() => handleAttendanceAction('break_end')}
              disabled={isActionLoading}
              className="w-full"
            >
              <Play className="h-4 w-4 mr-2" />
              End Break
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}