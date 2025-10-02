'use client'

import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TaskCard } from './TaskCard'
import { ColumnManagementDialog } from './ColumnManagementDialog'
import { cn } from '@/lib/utils'
import type { Task, Column } from '@/lib/api/projectsApi'

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  tasks: Task[]
  taskCount: number
  column: Column
  projectId: string
  onAddTask?: () => void
}

export function KanbanColumn({ id, title, color, tasks, taskCount, column, projectId, onAddTask }: KanbanColumnProps) {
  const [dialogMode, setDialogMode] = useState<'edit' | 'delete' | null>(null)

  const { setNodeRef, isOver } = useDroppable({
    id,
  })

  return (
    <Card
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full transition-colors",
        isOver && "ring-2 ring-primary ring-offset-2"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn("w-3 h-3 rounded-full", color)} />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {taskCount}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAddTask}>
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setDialogMode('edit')}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Column
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDialogMode('delete')}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Column
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-0">
        <ScrollArea className="h-full max-h-[calc(100vh-300px)]">
          <SortableContext items={tasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {tasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
              {tasks.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="text-sm text-muted-foreground mb-2">No tasks</div>
                  <Button variant="ghost" size="sm" className="text-xs" onClick={onAddTask}>
                    <Plus className="mr-1 h-3 w-3" />
                    Add task
                  </Button>
                </div>
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </CardContent>

      {/* Column Management Dialog */}
      <ColumnManagementDialog
        open={!!dialogMode}
        onOpenChange={(open) => !open && setDialogMode(null)}
        projectId={projectId}
        column={column}
        mode={dialogMode || 'edit'}
      />
    </Card>
  )
}