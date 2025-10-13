'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, Square, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  useStartTimeTrackingMutation,
  useStopTimeTrackingMutation,
  usePauseTimeTrackingMutation,
  useResumeTimeTrackingMutation,
} from '@/lib/api/projectsApi'
import { cn } from '@/lib/utils'
import type { Task } from '@/lib/api/projectsApi'

interface TimeTrackerProps {
  task: Task
  size?: 'sm' | 'md' | 'lg'
  variant?: 'compact' | 'full'
  className?: string
}

export function TimeTracker({
  task,
  size = 'sm',
  variant = 'compact',
  className
}: TimeTrackerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  const [startTimeTracking, { isLoading: isStarting }] = useStartTimeTrackingMutation()
  const [stopTimeTracking, { isLoading: isStopping }] = useStopTimeTrackingMutation()
  const [pauseTimeTracking, { isLoading: isPausing }] = usePauseTimeTrackingMutation()
  const [resumeTimeTracking, { isLoading: isResuming }] = useResumeTimeTrackingMutation()

  const isLoading = isStarting || isStopping || isPausing || isResuming

  // Calculate current session time
  useEffect(() => {
    if (task.timeTracking?.isActive && task.timeTracking?.currentSessionStart) {
      setIsRunning(true)
      const startTime = new Date(task.timeTracking.currentSessionStart).getTime()

      const updateTime = () => {
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        setCurrentTime(elapsed)
      }

      updateTime()
      const interval = setInterval(updateTime, 1000)

      return () => clearInterval(interval)
    } else {
      setIsRunning(false)
      setCurrentTime(0)
    }
  }, [task.timeTracking?.isActive, task.timeTracking?.currentSessionStart])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const getTotalTrackedTime = () => {
    if (!task.timeTracking) return 0
    return task.timeTracking.totalTracked + currentTime
  }

  const handleStart = async () => {
    try {
      await startTimeTracking({ taskId: task.id }).unwrap()
    } catch (error) {
      console.error('Failed to start time tracking:', error)
    }
  }

  const handleStop = async () => {
    try {
      await stopTimeTracking({ taskId: task.id }).unwrap()
    } catch (error) {
      console.error('Failed to stop time tracking:', error)
    }
  }

  const handlePause = async () => {
    try {
      await pauseTimeTracking({ taskId: task.id }).unwrap()
    } catch (error) {
      console.error('Failed to pause time tracking:', error)
    }
  }

  const handleResume = async () => {
    try {
      await resumeTimeTracking({ taskId: task.id }).unwrap()
    } catch (error) {
      console.error('Failed to resume time tracking:', error)
    }
  }

  const buttonSizes = {
    sm: 'h-6 w-6 p-0',
    md: 'h-8 w-8 p-0',
    lg: 'h-10 w-10 p-0'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {isRunning ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(buttonSizes[size], isLoading && 'opacity-50')}
                  onClick={handlePause}
                  disabled={isLoading}
                >
                  <Pause className={cn(iconSizes[size], 'text-orange-500')} />
                </Button>
              ) : task.timeTracking?.totalTracked > 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(buttonSizes[size], isLoading && 'opacity-50')}
                  onClick={handleResume}
                  disabled={isLoading}
                >
                  <Play className={cn(iconSizes[size], 'text-green-500')} />
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(buttonSizes[size], isLoading && 'opacity-50')}
                  onClick={handleStart}
                  disabled={isLoading}
                >
                  <Play className={cn(iconSizes[size], 'text-green-500')} />
                </Button>
              )}
            </TooltipTrigger>
            <TooltipContent>
              {isRunning ? 'Pause timer' : 'Start timer'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {task.timeTracking && (
          <Badge
            variant={isRunning ? 'default' : 'secondary'}
            className={cn(
              'text-xs font-mono',
              isRunning && 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
            )}
          >
            <Clock className="mr-1 h-3 w-3" />
            {formatTime(getTotalTrackedTime())}
          </Badge>
        )}

        {isRunning && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(buttonSizes[size], isLoading && 'opacity-50')}
                  onClick={handleStop}
                  disabled={isLoading}
                >
                  <Square className={cn(iconSizes[size], 'text-red-500')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Stop and save timer
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    )
  }

  // Full variant with more details
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Time Tracking</span>
        </div>

        {task.timeTracking && (
          <Badge variant={isRunning ? 'default' : 'secondary'}>
            Total: {formatTime(getTotalTrackedTime())}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handlePause}
            disabled={isLoading}
          >
            <Pause className="mr-2 h-4 w-4" />
            Pause
          </Button>
        ) : task.timeTracking?.totalTracked > 0 ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResume}
            disabled={isLoading}
          >
            <Play className="mr-2 h-4 w-4" />
            Resume
          </Button>
        ) : (
          <Button
            variant="default"
            size="sm"
            onClick={handleStart}
            disabled={isLoading}
          >
            <Play className="mr-2 h-4 w-4" />
            Start Timer
          </Button>
        )}

        {(task.timeTracking?.totalTracked || 0) > 0 && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStop}
            disabled={isLoading}
          >
            <Square className="mr-2 h-4 w-4" />
            Stop & Save
          </Button>
        )}

        {isRunning && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Current:</span>
            <Badge variant="outline" className="font-mono">
              {formatTime(currentTime)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  )
}