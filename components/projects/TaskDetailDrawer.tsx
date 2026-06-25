'use client'

import {
  Calendar,
  Clock,
  User,
  Tag,
  Paperclip,
  ExternalLink,
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type Task } from '@/lib/api/projectsApi'
import { CommentSection } from '@/components/comments/CommentSection'
import { TimeTracker } from './TimeTracker'

interface TaskDetailDrawerProps {
  task: Task | null
  open: boolean
  onClose: () => void
}

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
}

export function TaskDetailDrawer({
  task,
  open,
  onClose,
}: TaskDetailDrawerProps) {
  if (!task) return null

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date()

  return (
    <Sheet open={open} onOpenChange={v => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="pr-6 text-left">{task.title}</SheetTitle>
          <SheetDescription>Task details and comments</SheetDescription>
        </SheetHeader>

        <ScrollArea className="mt-4 h-[calc(100vh-120px)] pr-4">
          <div className="space-y-5">
            {/* Status & Priority */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{task.status}</Badge>
              <Badge className={priorityColors[task.priority]}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Badge>
              {task.completed && (
                <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Completed
                </Badge>
              )}
            </div>

            {/* Description */}
            {task.description && (
              <div>
                <h4 className="mb-1.5 text-sm font-medium text-muted-foreground">
                  Description
                </h4>
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ __html: task.description }}
                />
              </div>
            )}

            <Separator />

            {/* Meta info */}
            <div className="grid grid-cols-2 gap-3">
              {/* Assignee */}
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <User className="h-3 w-3" /> Assignee
                </span>
                {task.assignee ? (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={task.assignee.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {task.assignee.fullName
                          .split(' ')
                          .map(n => n[0])
                          .join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.assignee.fullName}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    Unassigned
                  </span>
                )}
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Due Date
                </span>
                <span
                  className={`text-sm ${isOverdue ? 'font-medium text-red-600' : ''}`}
                >
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString()
                    : 'No due date'}
                </span>
              </div>

              {/* Estimated Hours */}
              {task.estimatedHours !== undefined && (
                <div className="space-y-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <Clock className="h-3 w-3" /> Estimated
                  </span>
                  <span className="text-sm">{task.estimatedHours}h</span>
                </div>
              )}

              {/* Created */}
              <div className="space-y-1">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Calendar className="h-3 w-3" /> Created
                </span>
                <span className="text-sm">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Tag className="h-3 w-3" /> Tags
                </span>
                <div className="flex flex-wrap gap-1">
                  {task.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {task.attachments && task.attachments.length > 0 && (
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> Attachments
                </span>
                <div className="space-y-1">
                  {task.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 rounded-md p-1.5 text-sm hover:bg-muted"
                    >
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate">{att.name}</span>
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Time Tracking */}
            {task.timeTracking && (
              <div>
                <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">
                  Time Tracking
                </h4>
                <TimeTracker task={task} size="sm" variant="default" />
              </div>
            )}

            <Separator />

            {/* Comments */}
            <CommentSection entityType="task" entityId={task.id} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
