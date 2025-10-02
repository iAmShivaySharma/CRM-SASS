'use client'

import { useState } from 'react'
import { Plus, Search, Filter, List, Grid, LayoutGrid } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useGetTasksQuery, useGetProjectsQuery } from '@/lib/api/projectsApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { TasksList } from '@/components/projects/TasksList'
import { CreateTaskDialog } from '@/components/projects/CreateTaskDialog'

export default function TasksPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [search, setSearch] = useState('')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Get available projects
  const { data: projectsData } = useGetProjectsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
    },
    {
      skip: !currentWorkspace?.id,
    }
  )

  // Get tasks for selected project or all projects
  const {
    data: tasksData,
    isLoading,
    error,
  } = useGetTasksQuery(
    {
      ...(projectFilter === 'all'
        ? { workspaceId: currentWorkspace?.id }
        : { projectId: projectFilter }
      ),
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    },
    {
      skip: !currentWorkspace?.id || !projectFilter,
    }
  )

  if (!currentWorkspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground">
            Manage tasks across all your projects
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projectFilter !== 'all' && projectFilter && (
            <Badge variant="outline" className="text-sm">
              {projectsData?.projects.find(p => p.id === projectFilter)?.name || 'Unknown Project'}
            </Badge>
          )}
          <Button onClick={() => setShowCreateDialog(true)} disabled={projectFilter === 'all'}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksData?.tasks.length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksData?.tasks.filter(t => t.status === 'in-progress').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksData?.tasks.filter(t => t.status === 'review').length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tasksData?.tasks.filter(t => t.status === 'done').length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select Project" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projectsData?.projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          <Button
            variant={viewMode === 'kanban' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tasks Display */}
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-sm text-muted-foreground">Loading tasks...</div>
        </div>
      ) : error ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-sm text-red-500">Error loading tasks</div>
        </div>
      ) : !tasksData?.tasks.length ? (
        <div className="flex h-32 flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">No tasks found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first task to get started
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      ) : viewMode === 'kanban' && projectFilter !== 'all' ? (
        <KanbanBoard
          tasks={tasksData.tasks}
          projectId={projectFilter}
          isLoading={isLoading}
          error={error}
        />
      ) : viewMode === 'kanban' && projectFilter === 'all' ? (
        <div className="flex h-32 flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">Select a Project for Kanban View</h3>
            <p className="text-sm text-muted-foreground">
              Kanban board is only available for individual projects. Please select a specific project to view the board, or switch to list view to see all tasks.
            </p>
            <div className="mt-4">
              <Button variant="outline" onClick={() => setViewMode('list')}>
                Switch to List View
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <TasksList tasks={tasksData.tasks} />
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        projectId={projectFilter !== 'all' ? projectFilter : undefined}
      />
    </div>
  )
}