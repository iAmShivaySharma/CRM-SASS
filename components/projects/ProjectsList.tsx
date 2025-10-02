'use client'

import Link from 'next/link'
import { Calendar, Users, CheckCircle2, MoreVertical, Archive, RotateCcw, FileText, ListTodo } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useUpdateProjectMutation } from '@/lib/api/projectsApi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/api/projectsApi'

interface ProjectsListProps {
  projects: Project[]
}

export function ProjectsList({ projects }: ProjectsListProps) {
  const [updateProject] = useUpdateProjectMutation()

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

  const handleArchiveToggle = async (project: Project) => {
    try {
      const newStatus = project.status === 'archived' ? 'active' : 'archived'
      await updateProject({
        id: project.id,
        data: { status: newStatus }
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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Project</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Visibility</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Tasks</TableHead>
            <TableHead>Progress</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="w-[200px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project) => {
            const completionPercentage = project.taskCount
              ? Math.round((project.completedTaskCount || 0) / project.taskCount * 100)
              : 0

            return (
              <TableRow key={project.id} className="hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center space-x-3">
                    {project.icon ? (
                      <div className="text-lg">{project.icon}</div>
                    ) : (
                      <div
                        className="w-8 h-8 rounded-md flex items-center justify-center text-white text-sm font-semibold"
                        style={{ backgroundColor: project.color }}
                      >
                        {project.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <Link
                        href={`/projects/${project.id}`}
                        className="font-medium hover:text-primary transition-colors"
                      >
                        {project.name}
                      </Link>
                      {project.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {project.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="secondary"
                    className={cn("text-xs", statusColors[project.status])}
                  >
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </Badge>
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn("text-xs", visibilityColors[project.visibility])}
                  >
                    {project.visibility.charAt(0).toUpperCase() + project.visibility.slice(1)}
                  </Badge>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-1">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{project.memberCount || 0}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">
                      {project.completedTaskCount || 0}/{project.taskCount || 0}
                    </span>
                  </div>
                </TableCell>

                <TableCell>
                  {(project.taskCount || 0) > 0 ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                        <div
                          className="bg-primary h-1.5 rounded-full transition-all"
                          style={{ width: `${completionPercentage}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {completionPercentage}%
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">-</span>
                  )}
                </TableCell>

                <TableCell>
                  <time className="text-xs text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString()}
                  </time>
                </TableCell>

                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link href={`/projects/documents?projectId=${project.id}`}>
                        <FileText className="mr-1 h-3 w-3" />
                        Docs
                      </Link>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link href={`/projects/tasks?projectId=${project.id}`}>
                        <ListTodo className="mr-1 h-3 w-3" />
                        Tasks
                      </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleArchiveToggle(project)}
                          className={project.status === 'archived' ? 'text-blue-600' : 'text-orange-600'}
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
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}