'use client'

import { useState } from 'react'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  type Sprint,
  useCompleteSprintMutation,
  useGetSprintsQuery,
} from '@/lib/api/projectsApi'

interface SprintCompletionDialogProps {
  sprint: Sprint
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SprintCompletionDialog({
  sprint,
  open,
  onOpenChange,
}: SprintCompletionDialogProps) {
  const [moveTarget, setMoveTarget] = useState('backlog')
  const [completeSprint, { isLoading }] = useCompleteSprintMutation()

  const { data: sprintsData } = useGetSprintsQuery(
    { projectId: sprint.projectId, status: 'planning' },
    { skip: !open }
  )

  const planningSprints = sprintsData?.sprints || []
  const incompleteTasks = sprint.taskCount - sprint.completedTaskCount

  const handleComplete = async () => {
    try {
      const result = await completeSprint({
        id: sprint.id,
        projectId: sprint.projectId,
        moveIncompleteTo: moveTarget,
      }).unwrap()

      toast.success(
        `Sprint completed! ${result.summary.completedTasks} tasks done, ${result.summary.movedTasks} moved.`
      )
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to complete sprint')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Complete Sprint
          </DialogTitle>
          <DialogDescription>
            Complete &quot;{sprint.name}&quot; and decide what to do with
            remaining tasks.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Summary */}
          <div className="space-y-2 rounded-lg bg-muted/50 p-4">
            <div className="flex justify-between text-sm">
              <span>Completed tasks</span>
              <span className="font-semibold text-green-600">
                {sprint.completedTaskCount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Incomplete tasks</span>
              <span className="font-semibold text-orange-600">
                {incompleteTasks}
              </span>
            </div>
          </div>

          {/* Move incomplete tasks */}
          {incompleteTasks > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5" />
                Move {incompleteTasks} incomplete task
                {incompleteTasks !== 1 ? 's' : ''} to
              </Label>
              <Select value={moveTarget} onValueChange={setMoveTarget}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  {planningSprints.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleComplete} disabled={isLoading}>
            {isLoading ? 'Completing...' : 'Complete Sprint'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
