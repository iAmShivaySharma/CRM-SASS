'use client'

import { useState } from 'react'
import { Plus, Search, Filter, Grid, List } from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useGetProjectsQuery } from '@/lib/api/projectsApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { CreateProjectDialog } from '@/components/projects/CreateProjectDialog'
import { ProjectsGrid } from '@/components/projects/ProjectsGrid'
import { ProjectsList } from '@/components/projects/ProjectsList'
import { CardSkeleton, StatsCardSkeleton } from '@/components/ui/skeleton'

export default function ProjectsPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<string>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  const {
    data: projectsData,
    isLoading,
    error,
  } = useGetProjectsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      search: search || undefined,
      status: status || undefined,
    },
    {
      skip: !currentWorkspace?.id,
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
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">
            Manage your projects and collaborate with your team
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Project
        </Button>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
          <StatsCardSkeleton />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsData?.projects.length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsData?.projects.filter(p => p.status === 'active').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsData?.projects.filter(p => p.status === 'completed').length || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Projects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {projectsData?.projects.filter(p => p.createdBy === currentWorkspace.id).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>

        <div className="flex items-center gap-1 rounded-md border border-input p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
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

      {/* Projects Display */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : (
          <div className="space-y-4">
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
            <CardSkeleton className="h-20" />
          </div>
        )
      ) : error ? (
        <div className="flex h-32 items-center justify-center">
          <div className="text-sm text-red-500">Error loading projects</div>
        </div>
      ) : !projectsData?.projects.length ? (
        <div className="flex h-32 flex-col items-center justify-center space-y-4">
          <div className="text-center">
            <h3 className="text-lg font-medium">No projects found</h3>
            <p className="text-sm text-muted-foreground">
              Create your first project to get started
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Project
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <ProjectsGrid projects={projectsData.projects} />
      ) : (
        <ProjectsList projects={projectsData.projects} />
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        workspaceId={currentWorkspace.id}
      />
    </div>
  )
}