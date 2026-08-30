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
  useGetComplaintsQuery,
  useCreateComplaintMutation,
  useUpdateComplaintMutation,
  useDeleteComplaintMutation,
  type FmcgComplaintRecord,
} from '@/lib/api/fmcgApi'

interface ComplaintListProps {
  workspaceId: string
}

const SOURCES = [
  'consumer',
  'retailer',
  'distributor',
  'online_review',
  'internal',
]
const NATURES = [
  'foreign_body',
  'spoilage',
  'illness',
  'labelling',
  'weight',
  'packaging',
  'other',
]
const SEVERITIES = ['low', 'medium', 'high', 'critical']
const ACTIONS = [
  'replacement',
  'refund',
  'recall_initiated',
  'no_action',
  'under_investigation',
]

function severityBadgeClass(severity: string) {
  if (severity === 'critical') return 'bg-muted text-destructive hover:bg-muted'
  if (severity === 'high')
    return 'bg-muted text-muted-foreground hover:bg-muted'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyForm = {
  referenceNumber: '',
  dateReceived: '',
  source: 'consumer',
  customerName: '',
  customerContact: '',
  batchNumber: '',
  nature: 'other',
  description: '',
  severity: 'low',
  actionTaken: 'under_investigation',
  investigatedBy: '',
  rootCauseFound: '',
  closedDate: '',
  customerInformed: false,
}

export function ComplaintList({ workspaceId }: ComplaintListProps) {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<FmcgComplaintRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetComplaintsQuery({
    workspaceId,
    page,
    limit: 20,
    search: search || undefined,
    severity: severityFilter || undefined,
  })

  const [createComplaint, { isLoading: creating }] =
    useCreateComplaintMutation()
  const [updateComplaint, { isLoading: updating }] =
    useUpdateComplaintMutation()
  const [deleteComplaint, { isLoading: deleting }] =
    useDeleteComplaintMutation()

  const records = data?.complaints || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgComplaintRecord) {
    setEditingRecord(record)
    setForm({
      referenceNumber: record.referenceNumber,
      dateReceived: record.dateReceived
        ? record.dateReceived.split('T')[0]
        : '',
      source: record.source,
      customerName: record.customerName || '',
      customerContact: record.customerContact || '',
      batchNumber: record.batchNumber || '',
      nature: record.nature,
      description: record.description,
      severity: record.severity,
      actionTaken: record.actionTaken,
      investigatedBy: record.investigatedBy || '',
      rootCauseFound: record.rootCauseFound || '',
      closedDate: record.closedDate ? record.closedDate.split('T')[0] : '',
      customerInformed: record.customerInformed,
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      referenceNumber: form.referenceNumber,
      dateReceived: form.dateReceived,
      source: form.source as FmcgComplaintRecord['source'],
      customerName: form.customerName || undefined,
      customerContact: form.customerContact || undefined,
      batchNumber: form.batchNumber || undefined,
      nature: form.nature as FmcgComplaintRecord['nature'],
      description: form.description,
      severity: form.severity as FmcgComplaintRecord['severity'],
      actionTaken: form.actionTaken as FmcgComplaintRecord['actionTaken'],
      investigatedBy: form.investigatedBy || undefined,
      rootCauseFound: form.rootCauseFound || undefined,
      closedDate: form.closedDate || undefined,
      customerInformed: form.customerInformed,
    }

    try {
      if (editingRecord) {
        await updateComplaint({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('Complaint updated successfully')
      } else {
        await createComplaint(payload).unwrap()
        toast.success('Complaint created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save complaint')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteComplaint({ id: deleteId, workspaceId }).unwrap()
      toast.success('Complaint deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete complaint')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search complaints..."
              className="pl-8"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={severityFilter || 'all'}
            onValueChange={v => {
              setSeverityFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              {SEVERITIES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Complaint
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Product/Batch</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Action Taken</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="h-24 text-center text-muted-foreground"
                >
                  No complaints found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell className="font-mono font-medium">
                    {record.referenceNumber}
                  </TableCell>
                  <TableCell>
                    {record.dateReceived
                      ? format(new Date(record.dateReceived), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="capitalize">
                    {record.source.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{record.batchNumber || '—'}</TableCell>
                  <TableCell className="capitalize">
                    {record.nature.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    <Badge className={severityBadgeClass(record.severity)}>
                      {record.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {record.actionTaken.replace('_', ' ')}
                  </TableCell>
                  <TableCell>
                    {record.closedDate
                      ? format(new Date(record.closedDate), 'dd MMM yyyy')
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
            Showing {records.length} of {pagination.total} complaints
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
              {editingRecord ? 'Edit Complaint' : 'Add Complaint'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="referenceNumber">Reference Number *</Label>
                <Input
                  id="referenceNumber"
                  placeholder="CMP-2026-001"
                  value={form.referenceNumber}
                  onChange={e =>
                    setForm(p => ({ ...p, referenceNumber: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dateReceived">Date Received *</Label>
                <Input
                  id="dateReceived"
                  type="date"
                  value={form.dateReceived}
                  onChange={e =>
                    setForm(p => ({ ...p, dateReceived: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Source *</Label>
              <Select
                value={form.source}
                onValueChange={v => setForm(p => ({ ...p, source: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={form.customerName}
                  onChange={e =>
                    setForm(p => ({ ...p, customerName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="customerContact">Customer Contact</Label>
                <Input
                  id="customerContact"
                  value={form.customerContact}
                  onChange={e =>
                    setForm(p => ({ ...p, customerContact: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batchNumber">Batch Number</Label>
              <Input
                id="batchNumber"
                value={form.batchNumber}
                onChange={e =>
                  setForm(p => ({ ...p, batchNumber: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nature *</Label>
                <Select
                  value={form.nature}
                  onValueChange={v => setForm(p => ({ ...p, nature: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {NATURES.map(n => (
                      <SelectItem key={n} value={n} className="capitalize">
                        {n.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Severity *</Label>
                <Select
                  value={form.severity}
                  onValueChange={v => setForm(p => ({ ...p, severity: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

            <div className="space-y-1.5">
              <Label>Action Taken *</Label>
              <Select
                value={form.actionTaken}
                onValueChange={v => setForm(p => ({ ...p, actionTaken: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map(a => (
                    <SelectItem key={a} value={a} className="capitalize">
                      {a.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="investigatedBy">Investigated By</Label>
              <Input
                id="investigatedBy"
                value={form.investigatedBy}
                onChange={e =>
                  setForm(p => ({ ...p, investigatedBy: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rootCauseFound">Root Cause Found</Label>
              <Textarea
                id="rootCauseFound"
                value={form.rootCauseFound}
                onChange={e =>
                  setForm(p => ({ ...p, rootCauseFound: e.target.value }))
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="closedDate">Closed Date</Label>
                <Input
                  id="closedDate"
                  type="date"
                  value={form.closedDate}
                  onChange={e =>
                    setForm(p => ({ ...p, closedDate: e.target.value }))
                  }
                />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <input
                  id="customerInformed"
                  type="checkbox"
                  checked={form.customerInformed}
                  onChange={e =>
                    setForm(p => ({ ...p, customerInformed: e.target.checked }))
                  }
                  className="h-4 w-4"
                />
                <Label htmlFor="customerInformed">Customer Informed</Label>
              </div>
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
            <AlertDialogTitle>Delete Complaint</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this complaint record. This action
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
