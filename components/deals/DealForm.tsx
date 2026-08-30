'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateDealMutation, type PipelineStage } from '@/lib/api/dealsApi'

interface DealFormProps {
  workspaceId: string
  pipelineId: string
  defaultStageId?: string
  stages: PipelineStage[]
  onSuccess: () => void
  onCancel: () => void
}

export function DealForm({
  workspaceId,
  pipelineId,
  defaultStageId,
  stages,
  onSuccess,
  onCancel,
}: DealFormProps) {
  const [title, setTitle] = useState('')
  const [value, setValue] = useState('')
  const [stageId, setStageId] = useState(defaultStageId || stages[0]?.id || '')
  const [priority, setPriority] = useState('medium')
  const [expectedCloseDate, setExpectedCloseDate] = useState('')
  const [notes, setNotes] = useState('')

  const [createDeal, { isLoading }] = useCreateDealMutation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim()) {
      toast.error('Deal title is required')
      return
    }

    try {
      await createDeal({
        workspaceId,
        pipelineId,
        stageId,
        title: title.trim(),
        value: value ? parseFloat(value) : 0,
        priority: priority as 'low' | 'medium' | 'high',
        expectedCloseDate: expectedCloseDate || undefined,
        notes: notes.trim() || undefined,
      }).unwrap()

      toast.success('Deal created successfully')
      onSuccess()
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create deal')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Deal Title *</Label>
        <Input
          id="title"
          placeholder="e.g., AMC Contract — Sharma Residence"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="value">Value (₹)</Label>
          <Input
            id="value"
            type="number"
            placeholder="0"
            value={value}
            onChange={e => setValue(e.target.value)}
            min="0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="stage">Stage</Label>
          <Select value={stageId} onValueChange={setStageId}>
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              {stages
                .filter(s => !s.isWonStage && !s.isLostStage)
                .map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: s.color }}
                      />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="closeDate">Expected Close</Label>
          <Input
            id="closeDate"
            type="date"
            value={expectedCloseDate}
            onChange={e => setExpectedCloseDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional details..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
          Create Deal
        </Button>
      </div>
    </form>
  )
}
