'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Mail,
  Play,
  Pause,
  Trash2,
  Edit,
  Users,
  Loader2,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { useAppSelector } from '@/lib/hooks'

interface SequenceStep {
  order: number
  subject: string
  body: string
  delayDays: number
  delayHours: number
}

interface Sequence {
  id: string
  name: string
  description?: string
  steps: SequenceStep[]
  status: 'draft' | 'active' | 'paused'
  enrolledCount: number
  completedCount: number
  createdAt: string
}

export default function EmailSequencesPage() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [steps, setSteps] = useState<SequenceStep[]>([
    { order: 0, subject: '', body: '', delayDays: 1, delayHours: 0 },
  ])

  const fetchSequences = async () => {
    if (!currentWorkspace?.id) return
    try {
      const res = await fetch(
        `/api/email-sequences?workspaceId=${currentWorkspace.id}`
      )
      const data = await res.json()
      if (data.success) {
        setSequences(data.sequences)
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    fetchSequences()
  }, [currentWorkspace?.id])

  const handleCreate = async () => {
    if (!name || steps.some(s => !s.subject || !s.body)) {
      toast.error('Fill in all step subjects and bodies')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/email-sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId: currentWorkspace?.id,
          name,
          description,
          steps,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('Sequence created')
        setCreateOpen(false)
        setName('')
        setDescription('')
        setSteps([
          { order: 0, subject: '', body: '', delayDays: 1, delayHours: 0 },
        ])
        fetchSequences()
      } else {
        toast.error(data.message || 'Failed to create')
      }
    } catch {
      toast.error('Failed to create sequence')
    } finally {
      setCreating(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/email-sequences/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`Sequence ${status}`)
        fetchSequences()
      }
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/email-sequences/${id}`, { method: 'DELETE' })
      toast.success('Sequence deleted')
      fetchSequences()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const addStep = () => {
    setSteps(prev => [
      ...prev,
      {
        order: prev.length,
        subject: '',
        body: '',
        delayDays: 1,
        delayHours: 0,
      },
    ])
  }

  const updateStep = (index: number, field: string, value: any) => {
    setSteps(prev =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  const removeStep = (index: number) => {
    if (steps.length <= 1) return
    setSteps(prev =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i }))
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'paused':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Sequences</h1>
          <p className="text-muted-foreground">
            Automated drip email campaigns for your leads.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sequence
        </Button>
      </div>

      {sequences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">No sequences yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first email sequence to automate follow-ups.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sequences.map(seq => (
            <Card key={seq.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{seq.name}</CardTitle>
                  <Badge className={getStatusColor(seq.status)}>
                    {seq.status}
                  </Badge>
                </div>
                {seq.description && (
                  <CardDescription className="line-clamp-2">
                    {seq.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {seq.steps?.length || 0} steps
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {seq.enrolledCount} enrolled
                  </span>
                </div>
                <div className="flex gap-2">
                  {seq.status === 'draft' || seq.status === 'paused' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(seq.id, 'active')}
                    >
                      <Play className="mr-1 h-3 w-3" />
                      Activate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleStatusChange(seq.id, 'paused')}
                    >
                      <Pause className="mr-1 h-3 w-3" />
                      Pause
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => handleDelete(seq.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Email Sequence</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sequence Name</Label>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Welcome Series"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Steps</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Step
                </Button>
              </div>

              {steps.map((step, i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Step {i + 1}</span>
                      {steps.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeStep(i)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Delay (days)</Label>
                        <Input
                          type="number"
                          min={0}
                          value={step.delayDays}
                          onChange={e =>
                            updateStep(
                              i,
                              'delayDays',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Hours</Label>
                        <Input
                          type="number"
                          min={0}
                          max={23}
                          value={step.delayHours}
                          onChange={e =>
                            updateStep(
                              i,
                              'delayHours',
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Subject</Label>
                      <Input
                        value={step.subject}
                        onChange={e => updateStep(i, 'subject', e.target.value)}
                        placeholder="Email subject line"
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Body</Label>
                      <Textarea
                        value={step.body}
                        onChange={e => updateStep(i, 'body', e.target.value)}
                        placeholder="Email body..."
                        rows={3}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Sequence
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
