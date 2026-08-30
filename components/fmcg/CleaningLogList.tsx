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
  useGetCleaningLogsQuery,
  useCreateCleaningLogMutation,
  useUpdateCleaningLogMutation,
  useDeleteCleaningLogMutation,
  type FmcgCleaningLogRecord,
} from '@/lib/api/fmcgApi'

interface CleaningLogListProps {
  workspaceId: string
}

const SHIFTS = ['morning', 'afternoon', 'evening', 'full_day']

const emptyForm = {
  date: '',
  shift: 'morning',
  supervisorName: '',
  supervisorSignOff: false,
  issuesNoted: '',
  areasText: '',
}

export function CleaningLogList({ workspaceId }: CleaningLogListProps) {
  const [search, setSearch] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<FmcgCleaningLogRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetCleaningLogsQuery({
    workspaceId,
    page,
    limit: 20,
    shift: shiftFilter || undefined,
  })

  const [createCleaningLog, { isLoading: creating }] =
    useCreateCleaningLogMutation()
  const [updateCleaningLog, { isLoading: updating }] =
    useUpdateCleaningLogMutation()
  const [deleteCleaningLog, { isLoading: deleting }] =
    useDeleteCleaningLogMutation()

  const records = data?.cleaningLogs || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgCleaningLogRecord) {
    setEditingRecord(record)
    setForm({
      date: record.date ? record.date.split('T')[0] : '',
      shift: record.shift,
      supervisorName: record.supervisorName,
      supervisorSignOff: record.supervisorSignOff,
      issuesNoted: record.issuesNoted || '',
      areasText: record.entries.map(e => e.area).join(', '),
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const areas = form.areasText
      .split(',')
      .map(a => a.trim())
      .filter(Boolean)
    const entries = areas.map(area => ({
      area,
      cleanedBy: form.supervisorName,
      time: '',
      verified: true,
    }))

    const payload = {
      workspaceId,
      date: form.date,
      shift: form.shift as FmcgCleaningLogRecord['shift'],
      supervisorName: form.supervisorName,
      supervisorSignOff: form.supervisorSignOff,
      issuesNoted: form.issuesNoted || undefined,
      entries,
    }

    try {
      if (editingRecord) {
        await updateCleaningLog({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('Cleaning log updated successfully')
      } else {
        await createCleaningLog(payload).unwrap()
        toast.success('Cleaning log created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save cleaning log')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteCleaningLog({ id: deleteId, workspaceId }).unwrap()
      toast.success('Cleaning log deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete cleaning log')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-8"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={shiftFilter || 'all'}
            onValueChange={v => {
              setShiftFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Shift" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Shifts</SelectItem>
              {SHIFTS.map(s => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Log
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Shift</TableHead>
              <TableHead>Areas Cleaned</TableHead>
              <TableHead>Supervisor</TableHead>
              <TableHead>Issues Noted</TableHead>
              <TableHead>Sign-off</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-24 text-center text-muted-foreground"
                >
                  No cleaning logs found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell>
                    {record.date
                      ? format(new Date(record.date), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="capitalize">
                    {record.shift.replace('_', ' ')}
                  </TableCell>
                  <TableCell>{record.entries.length} areas</TableCell>
                  <TableCell>{record.supervisorName}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {record.issuesNoted || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={
                        record.supervisorSignOff
                          ? 'bg-primary/10 text-primary hover:bg-primary/10'
                          : 'bg-muted text-muted-foreground hover:bg-muted'
                      }
                    >
                      {record.supervisorSignOff ? 'Yes' : 'No'}
                    </Badge>
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
              {editingRecord ? 'Edit Cleaning Log' : 'Add Cleaning Log'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Shift *</Label>
                <Select
                  value={form.shift}
                  onValueChange={v => setForm(p => ({ ...p, shift: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIFTS.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace('_', ' ')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supervisorName">Supervisor Name *</Label>
              <Input
                id="supervisorName"
                value={form.supervisorName}
                onChange={e =>
                  setForm(p => ({ ...p, supervisorName: e.target.value }))
                }
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="supervisorSignOff"
                type="checkbox"
                checked={form.supervisorSignOff}
                onChange={e =>
                  setForm(p => ({ ...p, supervisorSignOff: e.target.checked }))
                }
                className="h-4 w-4"
              />
              <Label htmlFor="supervisorSignOff">Supervisor Sign-off</Label>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="areasText">Areas Cleaned (comma-separated)</Label>
              <Textarea
                id="areasText"
                value={form.areasText}
                onChange={e =>
                  setForm(p => ({ ...p, areasText: e.target.value }))
                }
                placeholder="Production floor, Storage room, Packaging area"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="issuesNoted">Issues Noted</Label>
              <Textarea
                id="issuesNoted"
                value={form.issuesNoted}
                onChange={e =>
                  setForm(p => ({ ...p, issuesNoted: e.target.value }))
                }
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
            <AlertDialogTitle>Delete Cleaning Log</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this cleaning log record. This action
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
