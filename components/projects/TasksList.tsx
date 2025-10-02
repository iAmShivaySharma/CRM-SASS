'use client'

import { Calendar, Clock, User, MessageSquare, Paperclip, MoreVertical } from 'lucide-react'
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
import type { Task } from '@/lib/api/projectsApi'

interface TasksListProps {
  tasks: Task[]
}

export function TasksList({ tasks }: TasksListProps) {
  const priorityColors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const statusColors = {
    todo: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    'in-progress': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    review: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
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

  return (
    <div className="space-y-3">
      {tasks.map((task) => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

        return (
          <Card
            key={task.id}
            className={cn(
              "transition-all hover:shadow-md",
              isOverdue && "border-red-300 bg-red-50/50"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-base line-clamp-2 flex-1 pr-4">
                      {task.title}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Edit Task</DropdownMenuItem>
                        <DropdownMenuItem>Duplicate</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {task.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {task.description}
                    </p>
                  )}

                  {/* Tags */}
                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {task.tags.slice(0, 4).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                          {tag}
                        </Badge>
                      ))}
                      {task.tags.length > 4 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0.5">
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
                        className={cn("text-xs", statusColors[task.status as keyof typeof statusColors] || statusColors.todo)}
                      >
                        {getStatusLabel(task.status)}
                      </Badge>

                      {/* Priority */}
                      <Badge
                        variant="secondary"
                        className={cn("text-xs", priorityColors[task.priority])}
                      >
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </Badge>

                      {/* Due Date */}
                      {task.dueDate && (
                        <div className={cn(
                          "flex items-center text-xs",
                          isOverdue ? "text-red-600" : "text-muted-foreground"
                        )}>
                          <Calendar className="h-3 w-3 mr-1" />
                          Due {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}

                      {/* Estimated Hours */}
                      {task.estimatedHours && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {task.estimatedHours}h
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3">
                      {/* Stats */}
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        {task.dependencies && task.dependencies.length > 0 && (
                          <div className="flex items-center">
                            <Paperclip className="h-3 w-3 mr-1" />
                            {task.dependencies.length}
                          </div>
                        )}
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          0
                        </div>
                      </div>

                      {/* Assignee */}
                      {task.assignee && (
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatarUrl} />
                            <AvatarFallback className="text-xs">
                              {task.assignee.fullName.split(' ').map(n => n[0]).join('')}
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