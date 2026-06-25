'use client'

import {
  Calendar,
  Target,
  Play,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type Sprint } from '@/lib/api/projectsApi'

interface SprintHeaderProps {
  sprint: Sprint
  onStart: () => void
  onComplete: () => void
  onEdit: () => void
}

export function SprintHeader({
  sprint,
  onStart,
  onComplete,
  onEdit,
}: SprintHeaderProps) {
  const progress =
    sprint.taskCount > 0
      ? Math.round((sprint.completedTaskCount / sprint.taskCount) * 100)
      : 0

  const startDate = new Date(sprint.startDate)
  const endDate = new Date(sprint.endDate)
  const now = new Date()
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const daysLeft = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  )

  const statusColors = {
    planning: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    completed:
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">{sprint.name}</h3>
            <Badge className={statusColors[sprint.status]}>
              {sprint.status.charAt(0).toUpperCase() + sprint.status.slice(1)}
            </Badge>
          </div>

          {sprint.goal && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Target className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{sprint.goal}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {startDate.toLocaleDateString()} — {endDate.toLocaleDateString()}
            </div>
            {sprint.status === 'active' && (
              <span className="font-medium text-foreground">
                {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </span>
            )}
            <span>
              {sprint.completedTaskCount}/{sprint.taskCount} tasks done
            </span>
          </div>

          {sprint.taskCount > 0 && (
            <div className="flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="text-sm font-medium">{progress}%</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {sprint.status === 'planning' && (
            <Button size="sm" onClick={onStart}>
              <Play className="mr-1.5 h-3.5 w-3.5" />
              Start Sprint
            </Button>
          )}
          {sprint.status === 'active' && (
            <Button size="sm" variant="outline" onClick={onComplete}>
              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              Complete Sprint
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit Sprint
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
