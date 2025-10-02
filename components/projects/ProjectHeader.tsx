'use client'

import Link from 'next/link'
import { ArrowLeft, Settings, Share, Star, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/api/projectsApi'

interface ProjectHeaderProps {
  project: Project
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    archived: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  }

  const visibilityColors = {
    private: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    workspace: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    public: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  }

  const completionPercentage = project.taskCount
    ? Math.round((project.completedTaskCount || 0) / project.taskCount * 100)
    : 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Link>
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm">
            <Share className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/projects/${project.id}/settings`}>
                  <Settings className="mr-2 h-4 w-4" />
                  Project Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Duplicate Project</DropdownMenuItem>
              <DropdownMenuItem>Export Data</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600">
                Archive Project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex items-start space-x-4">
        {project.icon ? (
          <div className="text-4xl">{project.icon}</div>
        ) : (
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl"
            style={{ backgroundColor: project.color }}
          >
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-2">
            <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
            <Badge
              variant="secondary"
              className={cn("text-sm", statusColors[project.status])}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </Badge>
            <Badge
              variant="outline"
              className={cn("text-sm", visibilityColors[project.visibility])}
            >
              {project.visibility.charAt(0).toUpperCase() + project.visibility.slice(1)}
            </Badge>
          </div>

          {project.description && (
            <p className="text-muted-foreground mb-4">{project.description}</p>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div className="text-2xl font-bold">{project.memberCount || 0}</div>
              <div className="text-sm text-muted-foreground">Members</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{project.taskCount || 0}</div>
              <div className="text-sm text-muted-foreground">Tasks</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{completionPercentage}%</div>
              <div className="text-sm text-muted-foreground">Complete</div>
            </div>
            <div>
              <div className="text-2xl font-bold">
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">Start Date</div>
            </div>
          </div>

          {/* Progress Bar */}
          {(project.taskCount || 0) > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Overall Progress</span>
                <span className="font-medium">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}