'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Calendar,
  Clock,
  User,
  MessageSquare,
  Paperclip,
  MoreVertical,
  CheckCircle2,
  Circle,
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
import { type Task, useGetTagsQuery } from '@/lib/api/projectsApi'
import { useToggleTaskCompletionMutation } from '@/lib/api/tasksApi'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'

interface TaskCardProps {
  task: Task
  isDragging?: boolean
  onEdit?: (task: Task) => void
}

export function TaskCard({ task, isDragging = false, onEdit }: TaskCardProps) {
  const [toggleTaskCompletion] = useToggleTaskCompletionMutation()
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // Get tags for workspace to show proper colors
  const { data: tagsData } = useGetTagsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const priorityColors = {
    low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  // Define status-based colors based on the actual column system
  const getStatusColors = () => {
    // Only use green for completed tasks with 'done' status
    if (task.completed && task.status === 'done') {
      return 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
    }

    // Status-based colors matching the column system
    switch (task.status?.toLowerCase()) {
      case 'todo':
        return 'bg-gray-50/50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800'
      case 'in-progress':
        return 'bg-blue-50/50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800'
      case 'review':
        return 'bg-yellow-50/50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800'
      case 'done':
        return 'bg-green-50/50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
      default:
        // For any other status (including 'pending'), use neutral colors
        return 'bg-slate-50/50 border-slate-200 dark:bg-slate-950/20 dark:border-slate-800'
    }
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(task)
  }

  const handleToggleCompletion = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await toggleTaskCompletion({
        id: task.id,
        completed: !task.completed,
      }).unwrap()
      toast.success(
        task.completed ? 'Task marked as not completed' : 'Task marked as completed'
      )
    } catch (error) {
      console.error('Failed to toggle task completion:', error)
      toast.error('Failed to update task completion status')
    }
  }

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-grab transition-all hover:shadow-md active:cursor-grabbing',
        (isDragging || isSortableDragging) && 'rotate-3 opacity-50 shadow-lg',
        isOverdue && 'border-red-300 bg-red-50/50',
        getStatusColors()
      )}
      {...attributes}
      {...listeners}
      onDoubleClick={handleDoubleClick}
    >
      <CardContent className="p-3">
        <div className="mb-2 flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 mt-0.5"
              onClick={handleToggleCompletion}
              title={task.completed ? 'Mark as not completed' : 'Mark as completed'}
            >
              {task.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Circle className="h-4 w-4 text-gray-400" />
              )}
            </Button>
            <h4 className={cn(
              "line-clamp-2 flex-1 pr-2 text-sm font-medium",
              task.completed && "line-through text-muted-foreground"
            )}>
              {task.title}
            </h4>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                onClick={e => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleEditClick}>Edit Task</DropdownMenuItem>
              <DropdownMenuItem>Duplicate</DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <div
            className="prose prose-sm mb-3 line-clamp-2 max-w-none text-xs text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: task.description }}
          />
        )}

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {task.tags.slice(0, 2).map((tag, index) => {
              const workspaceTag = tagsData?.tags.find(t => t.name === tag)
              return (
                <Badge
                  key={index}
                  variant="secondary"
                  className="px-1.5 py-0.5 text-xs"
                  style={workspaceTag ? {
                    backgroundColor: workspaceTag.color,
                    borderColor: workspaceTag.color,
                    color: 'white'
                  } : {}}
                >
                  {tag}
                </Badge>
              )
            })}
            {task.tags.length > 2 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 text-xs">
                +{task.tags.length - 2}
              </Badge>
            )}
          </div>
        )}

        {/* Priority */}
        <div className="mb-3 flex items-center justify-between">
          <Badge
            variant="secondary"
            className={cn('text-xs', priorityColors[task.priority])}
          >
            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
          </Badge>

          {/* Estimated Hours */}
          {task.estimatedHours && (
            <div className="flex items-center text-xs text-muted-foreground">
              <Clock className="mr-1 h-3 w-3" />
              {task.estimatedHours}h
            </div>
          )}
        </div>

        {/* Due Date */}
        {task.dueDate && (
          <div
            className={cn(
              'mb-3 flex items-center text-xs',
              isOverdue ? 'text-red-600' : 'text-muted-foreground'
            )}
          >
            <Calendar className="mr-1 h-3 w-3" />
            Due {new Date(task.dueDate).toLocaleDateString()}
          </div>
        )}

        {/* Time Tracker */}
        <div className="mb-3">
          <TimeTracker task={task} size="sm" variant="compact" />
        </div>

        {/* Assignee */}
        {task.assignee && (
          <div className="flex items-center justify-between">
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

            {/* Stats */}
            <div className="flex items-center space-x-2">
              {task.attachments && task.attachments.length > 0 && (
                <div
                  className="flex items-center text-xs text-muted-foreground cursor-pointer hover:text-blue-600"
                  title={`${task.attachments.length} attachment(s) - Click to view`}
                  onClick={(e) => {
                    e.stopPropagation()
                    // Open first attachment in new tab or show all in edit dialog
                    if (task.attachments && task.attachments.length === 1) {
                      window.open(task.attachments[0].url, '_blank')
                    } else {
                      onEdit?.(task) // Open edit dialog to show all attachments
                    }
                  }}
                >
                  <Paperclip className="mr-1 h-3 w-3" />
                  {task.attachments.length}
                </div>
              )}
              {task.dependencies && task.dependencies.length > 0 && (
                <div className="flex items-center text-xs text-muted-foreground" title={`${task.dependencies.length} dependency(ies)`}>
                  <Paperclip className="h-3 w-3" />
                </div>
              )}
              {/* Add comment count when available */}
              <div className="flex items-center text-xs text-muted-foreground">
                <MessageSquare className="mr-1 h-3 w-3" />0
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
