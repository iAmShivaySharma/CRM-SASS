'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Clock,
  Coffee,
  LogOut,
  Timer,
  CheckCircle,
  Pause,
  Play,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { useGetTodayAttendanceQuery, useAttendanceActionMutation } from '@/lib/api/attendanceApi'
import { useAppSelector } from '@/lib/hooks'
import { format } from 'date-fns'

export function TimeTrackingCard() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [workType, setWorkType] = useState<'office' | 'remote' | 'hybrid' | 'field'>('office')
  const [notes, setNotes] = useState('')
  const [showClockInDialog, setShowClockInDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const { data: todayData, isLoading, error, refetch } = useGetTodayAttendanceQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )
  const [attendanceAction, { isLoading: isActionLoading }] = useAttendanceActionMutation()

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Calculate live work time
  const calculateLiveWorkTime = (attendance: any) => {
    if (!attendance || !attendance.clockIn) return 0

    if (attendance.status === 'clocked_out') {
      return attendance.totalWorkTime || 0
    }

    // Calculate current work time for active status
    const now = new Date()
    const workTime = Math.floor((now.getTime() - new Date(attendance.clockIn).getTime()) / (1000 * 60))
    return Math.max(0, workTime - (attendance.totalBreakTime || 0))
  }

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
          try {
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
        } catch (error) {
          // Location is optional - continue without it
          console.warn('Could not get location:', error)
        }
      }

      const result = await attendanceAction({
        action,
        workType: action === 'clock_in' ? workType : undefined,
        location: locationData || undefined,
        notes: notes || undefined,
        workspaceId: currentWorkspace?.id || ''
      }).unwrap()

      toast.success(result.message)
      setNotes('')
      setShowClockInDialog(false)
      refetch()
    } catch (error: any) {
      toast.error(error.data?.error || `Failed to ${action.replace('_', ' ')}`)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clocked_in': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'on_break': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'clocked_out': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'late': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clocked_in': return <CheckCircle className="h-3 w-3" />
      case 'on_break': return <Pause className="h-3 w-3" />
      case 'clocked_out': return <Clock className="h-3 w-3" />
      default: return <Clock className="h-3 w-3" />
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
      <Card className="w-full">
        <CardContent className="p-3">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  const { attendance, actions, currentWorkTime } = todayData || {}

  // If there's an error or no data, default to allowing clock in
  const defaultActions = {
    canClockIn: true,
    canClockOut: false,
    canStartBreak: false,
    canEndBreak: false
  }

  // Use default actions if API failed or no actions returned
  const finalActions = actions || (error ? defaultActions : null)

  return (
    <Card className="w-full">
      <CardContent className="p-3 space-y-3">
        {/* Header with current time */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Time Tracking</span>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {format(currentTime, 'HH:mm:ss')}
          </span>
        </div>

        {/* Current Status */}
        {attendance && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Status</span>
            <Badge className={getStatusColor(attendance.status)} variant="secondary">
              {getStatusIcon(attendance.status)}
              <span className="ml-1 text-xs">{attendance.displayStatus}</span>
            </Badge>
          </div>
        )}

        {/* Work Time Display */}
        {attendance && attendance.status !== 'clocked_out' && (
          <div className="text-center py-2">
            <div className="text-lg font-bold text-primary">
              {formatDuration(calculateLiveWorkTime(attendance))}
            </div>
            <div className="text-xs text-muted-foreground">Today's work time</div>
          </div>
        )}

        {/* Work Time Display for Clocked Out */}
        {attendance && attendance.status === 'clocked_out' && (
          <div className="text-center py-2">
            <div className="text-lg font-bold text-gray-600">
              {formatDuration(attendance.totalWorkTime || 0)}
            </div>
            <div className="text-xs text-muted-foreground">Total work time</div>
          </div>
        )}

        {/* Clock In/Out Times and Break Time */}
        {attendance && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Clock In</span>
              <span className="font-medium">{formatTime(attendance.clockIn)}</span>
            </div>
            {attendance.clockOut && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Clock Out</span>
                <span className="font-medium">{formatTime(attendance.clockOut)}</span>
              </div>
            )}
            {attendance.totalBreakTime > 0 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Break Time</span>
                <span className="font-medium">{formatDuration(attendance.totalBreakTime)}</span>
              </div>
            )}
            {attendance.status === 'on_break' && attendance.breakStart && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Break Started</span>
                <span className="font-medium">{formatTime(attendance.breakStart)}</span>
              </div>
            )}
          </div>
        )}

        {/* Show error message if API failed */}
        {error && (
          <div className="text-center py-2">
            <p className="text-xs text-red-500">Please login to track time</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-1">
          {finalActions?.canClockIn && (
            <Dialog open={showClockInDialog} onOpenChange={setShowClockInDialog}>
              <DialogTrigger asChild>
                <Button size="sm" className="text-xs py-1 h-7">
                  <Play className="h-3 w-3 mr-1" />
                  In
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <Play className="h-4 w-4" />
                    <span>Clock In</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="work-type">Work Type</Label>
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
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
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

          {finalActions?.canClockOut && (
            <Button
              onClick={() => handleAttendanceAction('clock_out')}
              disabled={isActionLoading}
              variant="destructive"
              size="sm"
              className="text-xs py-1 h-7"
            >
              {isActionLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <LogOut className="h-3 w-3 mr-1" />
              )}
              Out
            </Button>
          )}

          {finalActions?.canStartBreak && (
            <Button
              onClick={() => handleAttendanceAction('break_start')}
              disabled={isActionLoading}
              variant="outline"
              size="sm"
              className="text-xs py-1 h-7"
            >
              <Coffee className="h-3 w-3 mr-1" />
              Break
            </Button>
          )}

          {finalActions?.canEndBreak && (
            <Button
              onClick={() => handleAttendanceAction('break_end')}
              disabled={isActionLoading}
              size="sm"
              className="text-xs py-1 h-7"
            >
              <Play className="h-3 w-3 mr-1" />
              Resume
            </Button>
          )}
        </div>

        {/* Message when no actions are available */}
        {finalActions && !finalActions.canClockIn && !finalActions.canClockOut && !finalActions.canStartBreak && !finalActions.canEndBreak && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              {attendance?.status === 'clocked_out'
                ? "Work day completed"
                : "No actions available"
              }
            </p>
          </div>
        )}

        {/* No attendance today message */}
        {!attendance && !isLoading && !error && (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">No attendance recorded today</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}