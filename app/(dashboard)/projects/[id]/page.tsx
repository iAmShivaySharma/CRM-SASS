'use client'

import { useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetProjectQuery,
  useGetTasksQuery,
  useGetProjectMembersQuery,
  useGetDocumentsQuery
} from '@/lib/api/projectsApi'
import { ProjectHeader } from '@/components/projects/ProjectHeader'
import { KanbanBoard } from '@/components/projects/KanbanBoard'
import { TasksList } from '@/components/projects/TasksList'
import { ProjectMembers } from '@/components/projects/ProjectMembers'
import { ProjectDocuments } from '@/components/projects/ProjectDocuments'
import { ProjectAnalytics } from '@/components/projects/ProjectAnalytics'
import { CardSkeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Grid, List, Users, FileText, BarChart3 } from 'lucide-react'

export default function ProjectDetailPage() {
  const params = useParams()
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const projectId = params?.id as string
  const [taskViewMode, setTaskViewMode] = useState<'kanban' | 'list'>('kanban')

  // Fetch project data
  const {
    data: projectData,
    isLoading: projectLoading,
    error: projectError,
  } = useGetProjectQuery({ id: projectId }, { skip: !projectId })

  // Fetch tasks for this project
  const {
    data: tasksData,
    isLoading: tasksLoading,
    error: tasksError,
  } = useGetTasksQuery(
    {
      projectId,
      workspaceId: currentWorkspace?.id || ''
    },
    { skip: !projectId || !currentWorkspace?.id }
  )

  // Fetch project members
  const {
    data: membersData,
    isLoading: membersLoading,
  } = useGetProjectMembersQuery(
    { projectId },
    { skip: !projectId }
  )

  // Fetch project documents
  const {
    data: documentsData,
    isLoading: documentsLoading,
  } = useGetDocumentsQuery(
    { projectId },
    { skip: !projectId }
  )

  if (!currentWorkspace) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace</p>
      </div>
    )
  }

  if (projectLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="flex space-x-2">
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
              <div className="h-8 w-8 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="flex space-x-4">
            <div className="h-16 w-16 bg-muted rounded-xl animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-8 w-64 bg-muted rounded animate-pulse" />
              <div className="h-4 w-96 bg-muted rounded animate-pulse" />
              <div className="grid grid-cols-4 gap-6 mt-4">
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
                <div className="h-12 bg-muted rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-10 w-full bg-muted rounded animate-pulse" />
          <div className="grid gap-6 md:grid-cols-4">
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        </div>
      </div>
    )
  }

  if (projectError || !projectData?.project) {
    notFound()
  }

  const project = projectData.project
  const tasks = tasksData?.tasks || []
  const members = membersData?.members || []
  const documents = documentsData?.documents || []

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <ProjectHeader project={project} />

      {/* Tabs Navigation */}
      <Tabs defaultValue="tasks" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tasks" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Tasks ({tasks.length})
          </TabsTrigger>
          <TabsTrigger value="members" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents ({documents.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Project Tasks</h2>
              <p className="text-muted-foreground">
                Manage and track your project tasks
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md border border-input p-1">
                <Button
                  variant={taskViewMode === 'kanban' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTaskViewMode('kanban')}
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  variant={taskViewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setTaskViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {taskViewMode === 'kanban' ? (
            <KanbanBoard
              tasks={tasks}
              projectId={projectId}
              isLoading={tasksLoading}
              error={tasksError}
            />
          ) : (
            <TasksList
              tasks={tasks}
              projectId={projectId}
              isLoading={tasksLoading}
              error={tasksError}
            />
          )}
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-6">
          <ProjectMembers
            projectId={projectId}
            members={members}
            isLoading={membersLoading}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <ProjectDocuments
            projectId={projectId}
            documents={documents}
            isLoading={documentsLoading}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <ProjectAnalytics
            tasks={tasks}
            members={members}
            documents={documents}
            project={project}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}