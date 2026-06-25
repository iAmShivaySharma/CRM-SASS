'use client'

import { useState } from 'react'
import { Plus, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  type Sprint,
  type Task,
  useGetSprintsQuery,
  useGetTasksQuery,
  useStartSprintMutation,
  useAssignTasksToSprintMutation,
} from '@/lib/api/projectsApi'
import { useAppSelector } from '@/lib/hooks'
import { SprintHeader } from './SprintHeader'
import { SprintManagementDialog } from './SprintManagementDialog'
import { SprintCompletionDialog } from './SprintCompletionDialog'
import { SprintHistory } from './SprintHistory'
import { TaskCard } from './TaskCard'

interface SprintBoardProps {
  projectId: string
  onEditTask?: (task: Task) => void
}

export function SprintBoard({ projectId, onEditTask }: SprintBoardProps) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [showCreateSprint, setShowCreateSprint] = useState(false)
  const [editingSprint, setEditingSprint] = useState<Sprint | null>(null)
  const [completingSprint, setCompletingSprint] = useState<Sprint | null>(null)
  const [selectedBacklogTasks, setSelectedBacklogTasks] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  const { data: sprintsData, isLoading: sprintsLoading } = useGetSprintsQuery(
    { projectId },
    { skip: !projectId }
  )

  const { data: allTasksData, isLoading: tasksLoading } = useGetTasksQuery(
    { projectId, workspaceId: currentWorkspace?.id || '' },
    { skip: !projectId || !currentWorkspace?.id }
  )

  const [startSprint] = useStartSprintMutation()
  const [assignTasks] = useAssignTasksToSprintMutation()

  const sprints = sprintsData?.sprints || []
  const allTasks = allTasksData?.tasks || []

  const activeSprint = sprints.find(s => s.status === 'active')
  const planningSprints = sprints.filter(s => s.status === 'planning')

  // Backlog = tasks with no sprintId
  const backlogTasks = allTasks.filter(t => !t.sprintId)
  // Active sprint tasks
  const sprintTasks = activeSprint
    ? allTasks.filter(t => t.sprintId === activeSprint.id)
    : []

  const handleStartSprint = async (sprint: Sprint) => {
    try {
      await startSprint({ id: sprint.id, projectId }).unwrap()
      toast.success(`Sprint "${sprint.name}" started!`)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to start sprint')
    }
  }

  const handleAddToSprint = async (sprintId: string) => {
    if (selectedBacklogTasks.length === 0) {
      toast.error('Select tasks to add to sprint')
      return
    }

    try {
      await assignTasks({
        sprintId,
        projectId,
        taskIds: selectedBacklogTasks,
        action: 'add',
      }).unwrap()
      toast.success(`${selectedBacklogTasks.length} task(s) added to sprint`)
      setSelectedBacklogTasks([])
    } catch {
      toast.error('Failed to add tasks to sprint')
    }
  }

  const handleRemoveFromSprint = async (taskId: string) => {
    if (!activeSprint) return
    try {
      await assignTasks({
        sprintId: activeSprint.id,
        projectId,
        taskIds: [taskId],
        action: 'remove',
      }).unwrap()
      toast.success('Task moved to backlog')
    } catch {
      toast.error('Failed to remove task from sprint')
    }
  }

  const toggleBacklogTask = (taskId: string) => {
    setSelectedBacklogTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  if (sprintsLoading || tasksLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-lg bg-muted" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
          <div className="h-64 animate-pulse rounded-lg bg-muted" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Sprint Planning</h2>
          <p className="text-muted-foreground">
            Manage sprints and assign tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide History' : 'Sprint History'}
          </Button>
          <Button size="sm" onClick={() => setShowCreateSprint(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Sprint
          </Button>
        </div>
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <SprintHeader
          sprint={activeSprint}
          onStart={() => {}}
          onComplete={() => setCompletingSprint(activeSprint)}
          onEdit={() => setEditingSprint(activeSprint)}
        />
      )}

      {/* Planning sprints */}
      {planningSprints.length > 0 && !activeSprint && (
        <div className="space-y-3">
          {planningSprints.map(sprint => (
            <SprintHeader
              key={sprint.id}
              sprint={sprint}
              onStart={() => handleStartSprint(sprint)}
              onComplete={() => {}}
              onEdit={() => setEditingSprint(sprint)}
            />
          ))}
        </div>
      )}

      {!activeSprint && planningSprints.length === 0 && (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No active sprint. Create one to get started.
          </p>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => setShowCreateSprint(true)}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Create Sprint
          </Button>
        </div>
      )}

      {/* Sprint Tasks & Backlog */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Sprint Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span>{activeSprint ? activeSprint.name : 'Sprint'} Tasks</span>
              <Badge variant="secondary">{sprintTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {sprintTasks.length > 0 ? (
              sprintTasks.map(task => (
                <div key={task.id} className="group relative">
                  <TaskCard task={task} onEdit={onEditTask} />
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {activeSprint
                  ? 'No tasks in this sprint. Select tasks from the backlog.'
                  : 'Start a sprint to see tasks here.'}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backlog */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Backlog
              </span>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{backlogTasks.length}</Badge>
                {selectedBacklogTasks.length > 0 && activeSprint && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleAddToSprint(activeSprint.id)}
                  >
                    Add to Sprint ({selectedBacklogTasks.length})
                  </Button>
                )}
                {selectedBacklogTasks.length > 0 &&
                  !activeSprint &&
                  planningSprints.length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAddToSprint(planningSprints[0].id)}
                    >
                      Add to {planningSprints[0].name} (
                      {selectedBacklogTasks.length})
                    </Button>
                  )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {backlogTasks.length > 0 ? (
              backlogTasks.map(task => (
                <div key={task.id} className="flex items-start gap-2">
                  <Checkbox
                    className="mt-3"
                    checked={selectedBacklogTasks.includes(task.id)}
                    onCheckedChange={() => toggleBacklogTask(task.id)}
                  />
                  <div className="flex-1">
                    <TaskCard task={task} onEdit={onEditTask} />
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                All tasks are assigned to sprints.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sprint History */}
      {showHistory && <SprintHistory sprints={sprints} />}

      {/* Dialogs */}
      <SprintManagementDialog
        open={showCreateSprint}
        onOpenChange={setShowCreateSprint}
        projectId={projectId}
      />

      {editingSprint && (
        <SprintManagementDialog
          open={!!editingSprint}
          onOpenChange={v => !v && setEditingSprint(null)}
          projectId={projectId}
          sprint={editingSprint}
        />
      )}

      {completingSprint && (
        <SprintCompletionDialog
          sprint={completingSprint}
          open={!!completingSprint}
          onOpenChange={v => !v && setCompletingSprint(null)}
        />
      )}
    </div>
  )
}
