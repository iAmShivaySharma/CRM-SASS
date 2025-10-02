'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { KanbanColumn } from './KanbanColumn'
import { TaskCard } from './TaskCard'
import { ColumnManagementDialog } from './ColumnManagementDialog'
import { CreateTaskDialog } from './CreateTaskDialog'
import { useUpdateTaskMutation, useGetColumnsQuery, type Task, type Column } from '@/lib/api/projectsApi'

interface KanbanBoardProps {
  tasks: Task[]
  projectId: string
  isLoading: boolean
  error?: any
}

export function KanbanBoard({ tasks, projectId, isLoading, error }: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [showCreateColumn, setShowCreateColumn] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [selectedColumnForTask, setSelectedColumnForTask] = useState<string>('')
  const [updateTask] = useUpdateTaskMutation()

  // Get dynamic columns for the project
  const { data: columnsData, isLoading: columnsLoading } = useGetColumnsQuery(
    { projectId },
    { skip: !projectId || projectId === 'all' }
  )

  const columns = columnsData?.columns || []

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const task = tasks.find(t => t.id === active.id)
    setActiveTask(task || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveTask(null)

    if (!over) return

    const taskId = active.id as string
    const newStatus = over.id as string

    const task = tasks.find(t => t.id === taskId)
    if (!task || task.status === newStatus) return

    try {
      await updateTask({
        id: taskId,
        data: { status: newStatus },
      }).unwrap()
    } catch (error) {
      console.error('Failed to update task status:', error)
    }
  }

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status)
  }

  const getTaskCountByStatus = (status: string) => {
    return getTasksByStatus(status).length
  }

  const handleAddTaskToColumn = (columnSlug: string) => {
    setSelectedColumnForTask(columnSlug)
    setShowCreateTask(true)
  }

  if (isLoading || columnsLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-sm text-red-500">Error loading tasks</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Project Board</h3>
        <Button onClick={() => setShowCreateColumn(true)} variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Column
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 min-h-[600px]">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              id={column.slug}
              title={column.name}
              color={column.color}
              tasks={getTasksByStatus(column.slug)}
              taskCount={getTaskCountByStatus(column.slug)}
              column={column}
              projectId={projectId}
              onAddTask={() => handleAddTaskToColumn(column.slug)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragging /> : null}
        </DragOverlay>
      </DndContext>

      {/* Create Column Dialog */}
      <ColumnManagementDialog
        open={showCreateColumn}
        onOpenChange={setShowCreateColumn}
        projectId={projectId}
        mode="create"
      />

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        projectId={projectId}
        defaultStatus={selectedColumnForTask}
      />
    </>
  )
}