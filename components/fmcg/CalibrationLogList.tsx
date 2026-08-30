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
  useGetCalibrationLogsQuery,
  useCreateCalibrationLogMutation,
  useUpdateCalibrationLogMutation,
  useDeleteCalibrationLogMutation,
  type FmcgCalibrationLogRecord,
} from '@/lib/api/fmcgApi'

interface CalibrationLogListProps {
  workspaceId: string
}

const RESULTS = ['pass', 'fail', 'adjusted']

function resultBadgeClass(result: string) {
  if (result === 'pass') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (result === 'fail') return 'bg-muted text-destructive hover:bg-muted'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyForm = {
  equipmentName: '',
  equipmentId: '',
  calibrationDate: '',
  nextDueDate: '',
  method: '',
  result: 'pass',
  referenceStandard: '',
  deviationFound: '',
  correctionApplied: '',
  calibratedBy: '',
  notes: '',
}

export function CalibrationLogList({ workspaceId }: CalibrationLogListProps) {
  const [search, setSearch] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<FmcgCalibrationLogRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetCalibrationLogsQuery({
    workspaceId,
    page,
    limit: 20,
    equipmentName: search || undefined,
    result: resultFilter || undefined,
  })

  const [createCalibrationLog, { isLoading: creating }] =
    useCreateCalibrationLogMutation()
  const [updateCalibrationLog, { isLoading: updating }] =
    useUpdateCalibrationLogMutation()
  const [deleteCalibrationLog, { isLoading: deleting }] =
    useDeleteCalibrationLogMutation()

  const records = data?.calibrationLogs || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgCalibrationLogRecord) {
    setEditingRecord(record)
    setForm({
      equipmentName: record.equipmentName,
      equipmentId: record.equipmentId || '',
      calibrationDate: record.calibrationDate
        ? record.calibrationDate.split('T')[0]
        : '',
      nextDueDate: record.nextDueDate ? record.nextDueDate.split('T')[0] : '',
      method: record.method,
      result: record.result,
      referenceStandard: record.referenceStandard || '',
      deviationFound: record.deviationFound || '',
      correctionApplied: record.correctionApplied || '',
      calibratedBy: record.calibratedBy,
      notes: record.notes || '',
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      equipmentName: form.equipmentName,
      equipmentId: form.equipmentId || undefined,
      calibrationDate: form.calibrationDate,
      nextDueDate: form.nextDueDate,
      method: form.method,
      result: form.result as FmcgCalibrationLogRecord['result'],
      referenceStandard: form.referenceStandard || undefined,
      deviationFound: form.deviationFound || undefined,
      correctionApplied: form.correctionApplied || undefined,
      calibratedBy: form.calibratedBy,
      notes: form.notes || undefined,
    }

    try {
      if (editingRecord) {
        await updateCalibrationLog({
          id: editingRecord._id,
          ...payload,
        }).unwrap()
        toast.success('Calibration log updated successfully')
      } else {
        await createCalibrationLog(payload).unwrap()
        toast.success('Calibration log created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save calibration log')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteCalibrationLog({ id: deleteId, workspaceId }).unwrap()
      toast.success('Calibration log deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete calibration log')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              className="pl-8"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={resultFilter || 'all'}
            onValueChange={v => {
              setResultFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              {RESULTS.map(r => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Calibration Log
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Equipment</TableHead>
              <TableHead>Calibration Date</TableHead>
              <TableHead>Next Due</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Calibrated By</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No calibration logs found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell>
                    <div className="font-medium">{record.equipmentName}</div>
                    {record.equipmentId && (
                      <div className="text-xs text-muted-foreground">
                        {record.equipmentId}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.calibrationDate
                      ? format(new Date(record.calibrationDate), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {record.nextDueDate
                      ? format(new Date(record.nextDueDate), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={resultBadgeClass(record.result)}>
                      {record.result}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.calibratedBy}</TableCell>
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
            Showing {records.length} of {pagination.total} logs
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
              {editingRecord ? 'Edit Calibration Log' : 'Add Calibration Log'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="equipmentName">Equipment Name *</Label>
                <Input
                  id="equipmentName"
                  value={form.equipmentName}
                  onChange={e =>
                    setForm(p => ({ ...p, equipmentName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="equipmentId">Equipment ID</Label>
                <Input
                  id="equipmentId"
                  value={form.equipmentId}
                  onChange={e =>
                    setForm(p => ({ ...p, equipmentId: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="calibrationDate">Calibration Date *</Label>
                <Input
                  id="calibrationDate"
                  type="date"
                  value={form.calibrationDate}
                  onChange={e =>
                    setForm(p => ({ ...p, calibrationDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="nextDueDate">Next Due Date *</Label>
                <Input
                  id="nextDueDate"
                  type="date"
                  value={form.nextDueDate}
                  onChange={e =>
                    setForm(p => ({ ...p, nextDueDate: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="method">Method *</Label>
                <Input
                  id="method"
                  value={form.method}
                  onChange={e =>
                    setForm(p => ({ ...p, method: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Result *</Label>
                <Select
                  value={form.result}
                  onValueChange={v => setForm(p => ({ ...p, result: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULTS.map(r => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="referenceStandard">Reference Standard</Label>
              <Input
                id="referenceStandard"
                value={form.referenceStandard}
                onChange={e =>
                  setForm(p => ({ ...p, referenceStandard: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="deviationFound">Deviation Found</Label>
                <Input
                  id="deviationFound"
                  value={form.deviationFound}
                  onChange={e =>
                    setForm(p => ({ ...p, deviationFound: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="correctionApplied">Correction Applied</Label>
                <Input
                  id="correctionApplied"
                  value={form.correctionApplied}
                  onChange={e =>
                    setForm(p => ({ ...p, correctionApplied: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="calibratedBy">Calibrated By *</Label>
              <Input
                id="calibratedBy"
                value={form.calibratedBy}
                onChange={e =>
                  setForm(p => ({ ...p, calibratedBy: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
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
            <AlertDialogTitle>Delete Calibration Log</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this calibration log record. This
              action cannot be undone.
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
