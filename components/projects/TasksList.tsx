'use client'

import {
  Calendar,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  MoreVertical,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { TimeTracker } from './TimeTracker'
import type { Task } from '@/lib/api/projectsApi'

interface TasksListProps {
  tasks: Task[]
  projectId?: string
  isLoading?: boolean
  error?: any
  onEditTask?: (task: Task) => void
}

export function TasksList({ tasks, projectId, isLoading, error, onEditTask }: TasksListProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    'in-progress':
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'To Do'
      case 'in-progress':
        return 'In Progress'
      case 'review':
        return 'Review'
      case 'done':
        return 'Done'
      default:
        return status
    }
  }

  const handleEditClick = (task: Task) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onEditTask?.(task)
  }

  const handleDoubleClick = (task: Task) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onEditTask?.(task)
  }

  return (
    <div className="space-y-3">
      {tasks.map(task => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

        return (
          <Card
            key={task.id}
            className={cn(
              'transition-all hover:shadow-md cursor-pointer',
              isOverdue && 'border-red-300 bg-red-50/50'
            )}
            onDoubleClick={handleDoubleClick(task)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-start justify-between">
                    <h3 className="line-clamp-2 flex-1 pr-4 text-base font-medium">
                      {task.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={handleEditClick(task)}>Edit Task</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {task.description && (
                    <div
                      className="mb-3 line-clamp-2 text-sm text-muted-foreground"
                      dangerouslySetInnerHTML={{
                        __html:
                          typeof task.description === 'string'
                            ? task.description
                            : JSON.stringify(task.description),
                      }}
                    />
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1">
                      {task.tags.slice(0, 4).map((tag, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-2 py-0.5 text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {task.tags.length > 4 && (
                        <Badge
                          variant="secondary"
                          className="px-2 py-0.5 text-xs"
                        >
                          +{task.tags.length - 4}
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Status */}
                      <Badge
                        variant="secondary"
                        className={cn(
                          'text-xs',
                          statusColors[
                            task.status as keyof typeof statusColors
                          ] || statusColors.todo
                        )}
                      >
                        {getStatusLabel(task.status)}
                      </Badge>

                      {/* Priority */}
                      <Badge
                        variant="secondary"
                        className={cn('text-xs', priorityColors[task.priority])}
                      >
                        {task.priority.charAt(0).toUpperCase() +
                          task.priority.slice(1)}
                      </Badge>

                      {/* Due Date */}
                      {task.dueDate && (
                        <div
                          className={cn(
                            'flex items-center text-xs',
                            isOverdue ? 'text-red-600' : 'text-muted-foreground'
                          )}
                        >
                          <Calendar className="mr-1 h-3 w-3" />
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}

                      {/* Estimated Hours */}
                      {task.estimatedHours && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="mr-1 h-3 w-3" />
                          {task.estimatedHours}h
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Time Tracker */}
                      <TimeTracker task={task} size="sm" variant="compact" />

                      {/* Stats */}
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {task.dependencies && task.dependencies.length > 0 && (
                          <div className="flex items-center">
                            <Paperclip className="mr-1 h-3 w-3" />
                            {task.dependencies.length}
                          </div>
                        )}
                        <div className="flex items-center">
                          <MessageSquare className="mr-1 h-3 w-3" />0
                        </div>
                      </div>

                      {/* Assignee */}
                      {task.assignee && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.fullName
                                .split(' ')
                                .map(n => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {task.assignee.fullName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
