'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
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
  Loader2,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Activity
} from 'lucide-react'
import { toast } from 'sonner'
import { useGetTodayAttendanceQuery, useAttendanceActionMutation } from '@/lib/api/attendanceApi'
import { useAppSelector } from '@/lib/hooks'
import { format } from 'date-fns'

interface AttendanceWidgetProps {
  compact?: boolean
  showDetails?: boolean
}

export function AttendanceWidget({ compact = false, showDetails = true }: AttendanceWidgetProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [workType, setWorkType] = useState<'office' | 'remote' | 'hybrid' | 'field'>('office')
  const [notes, setNotes] = useState('')
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null)
  const [showLocationDialog, setShowLocationDialog] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())

  const { data: todayData, isLoading, refetch } = useGetTodayAttendanceQuery(
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
        notes: notes || undefined,
        workspaceId: currentWorkspace?.id || ''
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
      case 'clocked_in': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
      case 'on_break': return 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      case 'clocked_out': return 'bg-muted text-muted-foreground'
      case 'late': return 'bg-destructive/10 text-destructive'
      default: return 'bg-muted text-muted-foreground'
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
      <Card className={compact ? 'w-full' : 'w-full max-w-md h-full min-h-[400px]'}>
        <CardContent className="p-6 flex items-center justify-center h-full">
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
      <Card className="bg-gradient-to-br from-background to-primary/5 shadow-lg">
        <CardContent className="p-4 space-y-4">
          {/* Header with Time and Status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-primary/10 rounded-lg">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div>
                <div className="text-lg font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent tabular-nums">
                  {format(currentTime, 'HH:mm:ss')}
                </div>
                <div className="text-xs text-muted-foreground">{format(currentTime, 'MMM dd')}</div>
              </div>
            </div>
            {attendance && (
              <Badge className={`${getStatusColor(attendance.status)} border-0 shadow-sm`}>
                <div className="flex items-center space-x-1">
                  {getStatusIcon(attendance.status)}
                  <span className="text-xs font-medium">{attendance.displayStatus}</span>
                </div>
              </Badge>
            )}
          </div>

          {/* Work Progress Bar */}
          {attendance && attendance.status !== 'clocked_out' && shift && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Work Progress</span>
                <span className="text-xs font-medium text-foreground">{Math.round(getWorkProgress())}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${getWorkProgress()}%` }}
                />
              </div>
            </div>
          )}

          {/* Current Work Time */}
          {attendance && attendance.status !== 'clocked_out' && (
            <div className="text-center bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl p-3">
              <div className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {formatDuration(currentWorkTime || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Today's work time</div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            {actions?.canClockIn && (
              <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="w-full h-9 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white border-0 shadow-md">
                    <Play className="h-3 w-3 mr-1" />
                    Clock In
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2">
                      <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                        <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span>Clock In</span>
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">Work Type</Label>
                      <Select value={workType} onValueChange={(value: any) => setWorkType(value)}>
                        <SelectTrigger className="h-10">
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
                      <Label className="text-sm font-medium">Notes (Optional)</Label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any notes for today..."
                        className="resize-none min-h-[60px]"
                        rows={2}
                      />
                    </div>
                    <Button
                      onClick={() => handleAttendanceAction('clock_in')}
                      disabled={isActionLoading}
                      className="w-full h-10 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    >
                      {isActionLoading ? (
                        <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3 mr-2" />
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
                size="sm"
                className="w-full h-9 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive text-destructive-foreground border-0 shadow-md"
              >
                {isActionLoading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <LogOut className="h-3 w-3 mr-1" />
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
                className="w-full h-9 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900 dark:hover:to-amber-800 text-amber-700 dark:text-amber-300 shadow-sm"
              >
                <Coffee className="h-3 w-3 mr-1" />
                Break
              </Button>
            )}

            {actions?.canEndBreak && (
              <Button
                onClick={() => handleAttendanceAction('break_end')}
                disabled={isActionLoading}
                size="sm"
                className="w-full h-9 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground border-0 shadow-md"
              >
                <Play className="h-3 w-3 mr-1" />
                End Break
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate work progress
  const getWorkProgress = () => {
    if (!shift || !currentWorkTime) return 0
    const shiftMinutes = shift.totalHours * 60
    return Math.min((currentWorkTime / shiftMinutes) * 100, 100)
  }

  const getProgressColor = () => {
    const progress = getWorkProgress()
    if (progress < 25) return 'from-destructive to-orange-500'
    if (progress < 50) return 'from-orange-500 to-amber-500'
    if (progress < 75) return 'from-amber-500 to-primary'
    return 'from-primary to-emerald-500'
  }

  return (
    <Card className="w-full max-w-md h-full min-h-[500px] bg-gradient-to-br from-background via-muted/20 to-primary/5 shadow-xl">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-t-lg">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="font-semibold">Attendance</span>
              <div className="text-xs opacity-90">{format(currentTime, 'EEEE')}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-normal opacity-90">
              {format(currentTime, 'MMM dd')}
            </div>
            <div className="text-xs opacity-75">
              {format(currentTime, 'yyyy')}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 flex-1 p-6">
        {/* Current Time Display */}
        <div className="text-center relative">
          <div className="relative inline-block">
            <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent tabular-nums">
              {format(currentTime, 'HH:mm:ss')}
            </div>
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/80 rounded-lg blur opacity-10"></div>
          </div>
          <div className="text-sm text-muted-foreground mt-1">{format(currentTime, 'EEEE, MMMM do')}</div>
        </div>

        {/* Status Badge */}
        {attendance && (
          <div className="flex justify-center">
            <Badge className={`${getStatusColor(attendance.status)} px-4 py-2 text-sm font-medium border-0 shadow-md`}>
              <div className="flex items-center space-x-2">
                {getStatusIcon(attendance.status)}
                <span>{attendance.displayStatus}</span>
              </div>
            </Badge>
          </div>
        )}

        {/* Work Progress Ring */}
        {attendance && attendance.status !== 'clocked_out' && shift && (
          <div className="flex flex-col items-center space-y-3">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="transparent"
                  className="text-muted"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={`${2 * Math.PI * 40}`}
                  strokeDashoffset={`${2 * Math.PI * 40 * (1 - getWorkProgress() / 100)}`}
                  className="transition-all duration-1000 ease-in-out"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.8)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-bold text-foreground">
                    {Math.round(getWorkProgress())}%
                  </div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                {formatDuration(currentWorkTime || 0)}
              </div>
              <div className="text-xs text-muted-foreground">Today's work time</div>
            </div>
          </div>
        )}

        {/* Detailed Info Cards */}
        {attendance && (
          <div className="grid grid-cols-2 gap-3">
            {/* Clock In Card */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3">
              <div className="flex items-center space-x-2 mb-1">
                <Play className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Clock In</span>
              </div>
              <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200">{formatTime(attendance.clockIn)}</div>
            </div>

            {/* Clock Out Card */}
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 dark:from-rose-950 dark:to-rose-900 border border-rose-200 dark:border-rose-800 rounded-xl p-3">
              <div className="flex items-center space-x-2 mb-1">
                <LogOut className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <span className="text-xs font-medium text-rose-700 dark:text-rose-300">Clock Out</span>
              </div>
              <div className="text-lg font-bold text-rose-800 dark:text-rose-200">
                {attendance.clockOut ? formatTime(attendance.clockOut) : 'Pending'}
              </div>
            </div>

            {/* Work Type Card */}
            <div className="bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-3">
              <div className="flex items-center space-x-2 mb-1">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-xs font-medium text-primary">Work Type</span>
              </div>
              <div className="text-sm font-bold text-primary">
                {attendance.workType === 'office' && '🏢 Office'}
                {attendance.workType === 'remote' && '🏠 Remote'}
                {attendance.workType === 'hybrid' && '🔄 Hybrid'}
                {attendance.workType === 'field' && '🚗 Field'}
              </div>
            </div>

            {/* Expected End Card */}
            {expectedClockOut && attendance.status !== 'clocked_out' && (
              <div className="bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950 dark:to-violet-900 border border-violet-200 dark:border-violet-800 rounded-xl p-3">
                <div className="flex items-center space-x-2 mb-1">
                  <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                  <span className="text-xs font-medium text-violet-700 dark:text-violet-300">Expected End</span>
                </div>
                <div className="text-lg font-bold text-violet-800 dark:text-violet-200">{formatTime(expectedClockOut)}</div>
              </div>
            )}
          </div>
        )}

        {/* Shift Info */}
        {shift && (
          <div className="bg-gradient-to-r from-muted/50 to-muted/30 border border-border rounded-xl p-4">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Today's Shift</span>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{shift.name}</span> • {shift.startTime} - {shift.endTime} ({shift.totalHours}h)
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="space-y-3">
          {actions?.canClockIn && (
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 bg-white/20 rounded-full">
                      <Play className="h-4 w-4" />
                    </div>
                    <span>Clock In</span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-lg">
                      <Play className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span>Clock In for Today</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Work Type</Label>
                    <Select value={workType} onValueChange={(value: any) => setWorkType(value)}>
                      <SelectTrigger className="h-11">
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
                    <Label className="text-sm font-medium">Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any notes for today's work..."
                      className="resize-none min-h-[80px]"
                      rows={3}
                    />
                  </div>
                  <Button
                    onClick={() => handleAttendanceAction('clock_in')}
                    disabled={isActionLoading}
                    className="w-full h-11 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
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

          <div className="grid grid-cols-2 gap-3">
            {actions?.canClockOut && (
              <Button
                onClick={() => handleAttendanceAction('clock_out')}
                disabled={isActionLoading}
                className="h-11 bg-gradient-to-r from-destructive to-destructive/90 hover:from-destructive/90 hover:to-destructive text-destructive-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 border-0"
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
                className="h-11 border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900 hover:from-amber-100 hover:to-amber-200 dark:hover:from-amber-900 dark:hover:to-amber-800 text-amber-700 dark:text-amber-300 font-medium shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Coffee className="h-4 w-4 mr-2" />
                Break
              </Button>
            )}

            {actions?.canEndBreak && (
              <Button
                onClick={() => handleAttendanceAction('break_end')}
                disabled={isActionLoading}
                className="h-11 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              >
                <Play className="h-4 w-4 mr-2" />
                End Break
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}