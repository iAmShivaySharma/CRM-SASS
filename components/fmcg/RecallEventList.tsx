'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, MoreVertical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useGetRecallEventsQuery,
  useCreateRecallEventMutation,
  useUpdateRecallEventMutation,
  useDeleteRecallEventMutation,
  type FmcgRecallEventRecord,
} from '@/lib/api/fmcgApi'

interface RecallEventListProps {
  workspaceId: string
}

const TRIGGERS = [
  'internal_testing',
  'consumer_complaint',
  'distributor_report',
  'fssai_alert',
  'audit_finding',
  'supplier_notification',
  'batch_record_error',
  'labelling_error',
]

function statusBadgeClass(status: string) {
  if (status === 'initiated') {
    return 'bg-muted text-muted-foreground hover:bg-muted'
  }
  if (status === 'in_progress') {
    return 'bg-primary/10 text-primary hover:bg-primary/10'
  }
  return 'text-primary hover:bg-primary/10 bg-primary/10'
}

function classBadgeClass(recallClass: string) {
  if (recallClass === 'I') return 'bg-muted text-destructive hover:bg-muted'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyForm = {
  recallNumber: '',
  recallClass: 'II',
  trigger: 'internal_testing',
  affectedBatchesText: '',
  description: '',
  initiatedAt: '',
  fssaiNotificationAt: '',
  fssaiReferenceNumber: '',
  quantityManufactured: '',
  quantityDistributed: '',
  quantityInStock: '',
  disposalMethod: '',
  disposalDate: '',
  rootCause: '',
  correctiveActions: '',
  mockDrill: false,
}

export function RecallEventList({ workspaceId }: RecallEventListProps) {
  const [statusFilter, setStatusFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<FmcgRecallEventRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetRecallEventsQuery({
    workspaceId,
    page,
    limit: 20,
    status: statusFilter || undefined,
  })

  const [createRecallEvent, { isLoading: creating }] =
    useCreateRecallEventMutation()
  const [updateRecallEvent, { isLoading: updating }] =
    useUpdateRecallEventMutation()
  const [deleteRecallEvent, { isLoading: deleting }] =
    useDeleteRecallEventMutation()

  const records = data?.recallEvents || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgRecallEventRecord) {
    setEditingRecord(record)
    setForm({
      recallNumber: record.recallNumber,
      recallClass: record.recallClass,
      trigger: record.trigger,
      affectedBatchesText: record.affectedBatchNumbers.join('\n'),
      description: record.description,
      initiatedAt: record.initiatedAt ? record.initiatedAt.split('T')[0] : '',
      fssaiNotificationAt: record.fssaiNotificationAt
        ? record.fssaiNotificationAt.split('T')[0]
        : '',
      fssaiReferenceNumber: record.fssaiReferenceNumber || '',
      quantityManufactured: record.quantityManufactured?.toString() || '',
      quantityDistributed: record.quantityDistributed?.toString() || '',
      quantityInStock: record.quantityInStock?.toString() || '',
      disposalMethod: record.disposalMethod || '',
      disposalDate: record.disposalDate
        ? record.disposalDate.split('T')[0]
        : '',
      rootCause: record.rootCause || '',
      correctiveActions: record.correctiveActions || '',
      mockDrill: record.mockDrill,
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const affectedBatchNumbers = form.affectedBatchesText
      .split('\n')
      .map(b => b.trim())
      .filter(Boolean)

    const payload = {
      workspaceId,
      recallNumber: form.recallNumber,
      recallClass: form.recallClass as FmcgRecallEventRecord['recallClass'],
      trigger: form.trigger as FmcgRecallEventRecord['trigger'],
      affectedBatchNumbers,
      description: form.description,
      initiatedAt: form.initiatedAt,
      fssaiNotificationAt: form.fssaiNotificationAt || undefined,
      fssaiReferenceNumber: form.fssaiReferenceNumber || undefined,
      quantityManufactured: form.quantityManufactured
        ? parseFloat(form.quantityManufactured)
        : undefined,
      quantityDistributed: form.quantityDistributed
        ? parseFloat(form.quantityDistributed)
        : undefined,
      quantityInStock: form.quantityInStock
        ? parseFloat(form.quantityInStock)
        : undefined,
      disposalMethod: form.disposalMethod || undefined,
      disposalDate: form.disposalDate || undefined,
      rootCause: form.rootCause || undefined,
      correctiveActions: form.correctiveActions || undefined,
      mockDrill: form.mockDrill,
    }

    try {
      if (editingRecord) {
        await updateRecallEvent({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('Recall event updated successfully')
      } else {
        await createRecallEvent(payload).unwrap()
        toast.success('Recall event created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save recall event')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteRecallEvent({ id: deleteId, workspaceId }).unwrap()
      toast.success('Recall event deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete recall event')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Select
            value={statusFilter || 'all'}
            onValueChange={v => {
              setStatusFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="initiated">Initiated</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Recall Event
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recall No.</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Batches</TableHead>
              <TableHead>Initiated At</TableHead>
              <TableHead>FSSAI Notified</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="h-24 text-center text-muted-foreground"
                >
                  No recall events found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell className="font-mono font-medium">
                    {record.recallNumber}
                  </TableCell>
                  <TableCell>
                    <Badge className={classBadgeClass(record.recallClass)}>
                      Class {record.recallClass}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(record.status)}>
                      {record.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {record.trigger.replace(/_/g, ' ')}
                  </TableCell>
                  <TableCell>{record.affectedBatchNumbers.length}</TableCell>
                  <TableCell>
                    {record.initiatedAt
                      ? format(new Date(record.initiatedAt), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {record.fssaiNotificationAt
                      ? format(
                          new Date(record.fssaiNotificationAt),
                          'dd MMM yyyy'
                        )
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(record)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(record._id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {records.length} of {pagination.total} events
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {editingRecord ? 'Edit Recall Event' : 'Add Recall Event'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="recallNumber">Recall Number *</Label>
                <Input
                  id="recallNumber"
                  placeholder="RCL-2026-001"
                  value={form.recallNumber}
                  onChange={e =>
                    setForm(p => ({ ...p, recallNumber: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Recall Class *</Label>
                <Select
                  value={form.recallClass}
                  onValueChange={v => setForm(p => ({ ...p, recallClass: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="I">Class I</SelectItem>
                    <SelectItem value="II">Class II</SelectItem>
                    <SelectItem value="III">Class III</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Trigger *</Label>
              <Select
                value={form.trigger}
                onValueChange={v => setForm(p => ({ ...p, trigger: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="affectedBatchesText">
                Affected Batch Numbers (one per line) *
              </Label>
              <Textarea
                id="affectedBatchesText"
                value={form.affectedBatchesText}
                onChange={e =>
                  setForm(p => ({ ...p, affectedBatchesText: e.target.value }))
                }
                placeholder="BATCH-001&#10;BATCH-002"
                rows={3}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e =>
                  setForm(p => ({ ...p, description: e.target.value }))
                }
                rows={3}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="initiatedAt">Initiated At *</Label>
                <Input
                  id="initiatedAt"
                  type="date"
                  value={form.initiatedAt}
                  onChange={e =>
                    setForm(p => ({ ...p, initiatedAt: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fssaiNotificationAt">
                  FSSAI Notification Date
                </Label>
                <Input
                  id="fssaiNotificationAt"
                  type="date"
                  value={form.fssaiNotificationAt}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      fssaiNotificationAt: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fssaiReferenceNumber">
                FSSAI Reference Number
              </Label>
              <Input
                id="fssaiReferenceNumber"
                value={form.fssaiReferenceNumber}
                onChange={e =>
                  setForm(p => ({ ...p, fssaiReferenceNumber: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantityManufactured">Qty Manufactured</Label>
                <Input
                  id="quantityManufactured"
                  type="number"
                  value={form.quantityManufactured}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      quantityManufactured: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantityDistributed">Qty Distributed</Label>
                <Input
                  id="quantityDistributed"
                  type="number"
                  value={form.quantityDistributed}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      quantityDistributed: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantityInStock">Qty In Stock</Label>
                <Input
                  id="quantityInStock"
                  type="number"
                  value={form.quantityInStock}
                  onChange={e =>
                    setForm(p => ({ ...p, quantityInStock: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="disposalMethod">Disposal Method</Label>
                <Input
                  id="disposalMethod"
                  value={form.disposalMethod}
                  onChange={e =>
                    setForm(p => ({ ...p, disposalMethod: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="disposalDate">Disposal Date</Label>
                <Input
                  id="disposalDate"
                  type="date"
                  value={form.disposalDate}
                  onChange={e =>
                    setForm(p => ({ ...p, disposalDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rootCause">Root Cause</Label>
              <Textarea
                id="rootCause"
                value={form.rootCause}
                onChange={e =>
                  setForm(p => ({ ...p, rootCause: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="correctiveActions">Corrective Actions</Label>
              <Textarea
                id="correctiveActions"
                value={form.correctiveActions}
                onChange={e =>
                  setForm(p => ({ ...p, correctiveActions: e.target.value }))
                }
                rows={3}
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="mockDrill"
                type="checkbox"
                checked={form.mockDrill}
                onChange={e =>
                  setForm(p => ({ ...p, mockDrill: e.target.checked }))
                }
                className="h-4 w-4"
              />
              <Label htmlFor="mockDrill">Mock Drill</Label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSheetOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={open => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recall Event</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this recall event record. This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
