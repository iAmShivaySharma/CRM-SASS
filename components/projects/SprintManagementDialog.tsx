'use client'

import { useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  type Sprint,
  useCreateSprintMutation,
  useUpdateSprintMutation,
} from '@/lib/api/projectsApi'

interface SprintManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  sprint?: Sprint | null
}

export function SprintManagementDialog({
  open,
  onOpenChange,
  projectId,
  sprint,
}: SprintManagementDialogProps) {
  const isEditing = !!sprint

  const [name, setName] = useState(sprint?.name || '')
  const [goal, setGoal] = useState(sprint?.goal || '')
  const [startDate, setStartDate] = useState(
    sprint?.startDate
      ? new Date(sprint.startDate).toISOString().split('T')[0]
      : ''
  )
  const [endDate, setEndDate] = useState(
    sprint?.endDate ? new Date(sprint.endDate).toISOString().split('T')[0] : ''
  )

  const [createSprint, { isLoading: creating }] = useCreateSprintMutation()
  const [updateSprint, { isLoading: updating }] = useUpdateSprintMutation()

  const isLoading = creating || updating

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || !startDate || !endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    try {
      if (isEditing && sprint) {
        await updateSprint({
          id: sprint.id,
          data: { name, goal, startDate, endDate },
        }).unwrap()
        toast.success('Sprint updated')
      } else {
        await createSprint({
          name,
          goal: goal || undefined,
          projectId,
          startDate,
          endDate,
        }).unwrap()
        toast.success('Sprint created')
      }
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      toast.error(
        error?.data?.message ||
          `Failed to ${isEditing ? 'update' : 'create'} sprint`
      )
    }
  }

  const resetForm = () => {
    setName('')
    setGoal('')
    setStartDate('')
    setEndDate('')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v) resetForm()
        onOpenChange(v)
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Sprint' : 'Create Sprint'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update sprint details'
              : 'Plan a new sprint for your project'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-name">Sprint Name *</Label>
            <Input
              id="sprint-name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Sprint 14"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint-goal">Goal</Label>
            <Textarea
              id="sprint-goal"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="What do you want to achieve in this sprint?"
              maxLength={500}
              className="resize-none"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date *</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date *</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update Sprint'
                  : 'Create Sprint'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
