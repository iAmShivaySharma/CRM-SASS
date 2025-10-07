'use client'

import Link from 'next/link'
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  MoreVertical,
  FileText,
  ListTodo,
  Archive,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Project } from '@/lib/api/projectsApi'
import { useUpdateProjectMutation } from '@/lib/api/projectsApi'

interface ProjectCardProps {
  project: Project
}

export function ProjectCard({ project }: ProjectCardProps) {
  const [updateProject, { isLoading: isUpdating }] = useUpdateProjectMutation()

  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }

  const visibilityColors = {
    private: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    workspace:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    public: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const completionPercentage =
    (project.taskCount || 0) > 0
      ? Math.round(
          ((project.completedTaskCount || 0) / (project.taskCount || 1)) * 100
        )
      : 0

  const handleArchiveToggle = async () => {
    try {
      const newStatus = project.status === 'archived' ? 'active' : 'archived'
      await updateProject({
        id: project.id,
        data: { status: newStatus },
      }).unwrap()

      toast.success(
        newStatus === 'archived'
          ? 'Project archived successfully'
          : 'Project restored successfully'
      )
    } catch (error) {
      toast.error('Failed to update project status')
    }
  }

  return (
    <Card className="group transition-all hover:-translate-y-1 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {project.icon ? (
              <div className="text-2xl">{project.icon}</div>
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg font-semibold text-white"
                style={{ backgroundColor: project.color }}
              >
                {project.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="line-clamp-1 text-lg font-semibold">
                {project.name}
              </h3>
              {project.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100"
                disabled={isUpdating}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleArchiveToggle}
                disabled={isUpdating}
                className={
                  project.status === 'archived'
                    ? 'text-blue-600'
                    : 'text-orange-600'
                }
              >
                {project.status === 'archived' ? (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore Project
                  </>
                ) : (
                  <>
                    <Archive className="mr-2 h-4 w-4" />
                    Archive Project
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Badge
            variant="secondary"
            className={cn('text-xs', statusColors[project.status])}
          >
            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
          </Badge>
          <Badge
            variant="outline"
            className={cn('text-xs', visibilityColors[project.visibility])}
          >
            {project.visibility.charAt(0).toUpperCase() +
              project.visibility.slice(1)}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Progress */}
        {(project.taskCount || 0) > 0 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{completionPercentage}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-2 rounded-full bg-primary transition-all"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {project.memberCount || 0} member
              {(project.memberCount || 0) !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {project.taskCount || 0} task
              {(project.taskCount || 0) !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href={`/projects/documents?projectId=${project.id}`}>
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="flex-1">
              <Link href={`/projects/tasks?projectId=${project.id}`}>
                <ListTodo className="mr-2 h-4 w-4" />
                Tasks
              </Link>
            </Button>
          </div>
        </div>

        {/* Dates */}
        {(project.startDate || project.endDate) && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              {project.startDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Start: {new Date(project.startDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {project.endDate && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    Due: {new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
