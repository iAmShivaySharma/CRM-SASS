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
  useGetTemperatureLogsQuery,
  useCreateTemperatureLogMutation,
  useUpdateTemperatureLogMutation,
  useDeleteTemperatureLogMutation,
  type FmcgTemperatureLogRecord,
} from '@/lib/api/fmcgApi'

interface TemperatureLogListProps {
  workspaceId: string
}

const emptyForm = {
  date: '',
  location: '',
  temperature: '',
  humidity: '',
  loggedBy: '',
  anomalyNoted: false,
  anomalyDescription: '',
  actionTaken: '',
}

export function TemperatureLogList({ workspaceId }: TemperatureLogListProps) {
  const [search, setSearch] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<FmcgTemperatureLogRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetTemperatureLogsQuery({
    workspaceId,
    page,
    limit: 20,
    location: search || undefined,
  })

  const [createTemperatureLog, { isLoading: creating }] =
    useCreateTemperatureLogMutation()
  const [updateTemperatureLog, { isLoading: updating }] =
    useUpdateTemperatureLogMutation()
  const [deleteTemperatureLog, { isLoading: deleting }] =
    useDeleteTemperatureLogMutation()

  const records = data?.temperatureLogs || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgTemperatureLogRecord) {
    setEditingRecord(record)
    setForm({
      date: record.date ? record.date.split('T')[0] : '',
      location: record.location,
      temperature: record.temperature.toString(),
      humidity: record.humidity?.toString() || '',
      loggedBy: record.loggedBy,
      anomalyNoted: record.anomalyNoted,
      anomalyDescription: record.anomalyDescription || '',
      actionTaken: record.actionTaken || '',
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      date: form.date,
      location: form.location,
      temperature: parseFloat(form.temperature),
      humidity: form.humidity ? parseFloat(form.humidity) : undefined,
      loggedBy: form.loggedBy,
      anomalyNoted: form.anomalyNoted,
      anomalyDescription: form.anomalyNoted
        ? form.anomalyDescription || undefined
        : undefined,
      actionTaken: form.actionTaken || undefined,
    }

    try {
      if (editingRecord) {
        await updateTemperatureLog({
          id: editingRecord._id,
          ...payload,
        }).unwrap()
        toast.success('Temperature log updated successfully')
      } else {
        await createTemperatureLog(payload).unwrap()
        toast.success('Temperature log created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save temperature log')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTemperatureLog({ id: deleteId, workspaceId }).unwrap()
      toast.success('Temperature log deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete temperature log')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by location..."
              className="pl-8"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
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
              <TableHead>Location</TableHead>
              <TableHead>Temperature (°C)</TableHead>
              <TableHead>Humidity (%)</TableHead>
              <TableHead>Anomaly</TableHead>
              <TableHead>Logged By</TableHead>
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
                  No temperature logs found.
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
                  <TableCell>{record.location}</TableCell>
                  <TableCell>{record.temperature}</TableCell>
                  <TableCell>{record.humidity ?? '—'}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        record.anomalyNoted
                          ? 'bg-muted text-destructive hover:bg-muted'
                          : 'bg-primary/10 text-primary hover:bg-primary/10'
                      }
                    >
                      {record.anomalyNoted ? 'Yes' : 'No'}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.loggedBy}</TableCell>
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
              {editingRecord ? 'Edit Temperature Log' : 'Add Temperature Log'}
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
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={e =>
                    setForm(p => ({ ...p, location: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="temperature">Temperature (°C) *</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={e =>
                    setForm(p => ({ ...p, temperature: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="humidity">Humidity (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  step="0.1"
                  value={form.humidity}
                  onChange={e =>
                    setForm(p => ({ ...p, humidity: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loggedBy">Logged By *</Label>
              <Input
                id="loggedBy"
                value={form.loggedBy}
                onChange={e =>
                  setForm(p => ({ ...p, loggedBy: e.target.value }))
                }
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                id="anomalyNoted"
                type="checkbox"
                checked={form.anomalyNoted}
                onChange={e =>
                  setForm(p => ({ ...p, anomalyNoted: e.target.checked }))
                }
                className="h-4 w-4"
              />
              <Label htmlFor="anomalyNoted">Anomaly Noted</Label>
            </div>

            {form.anomalyNoted && (
              <div className="space-y-1.5">
                <Label htmlFor="anomalyDescription">Anomaly Description</Label>
                <Textarea
                  id="anomalyDescription"
                  value={form.anomalyDescription}
                  onChange={e =>
                    setForm(p => ({ ...p, anomalyDescription: e.target.value }))
                  }
                  rows={3}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="actionTaken">Action Taken</Label>
              <Input
                id="actionTaken"
                value={form.actionTaken}
                onChange={e =>
                  setForm(p => ({ ...p, actionTaken: e.target.value }))
                }
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
            <AlertDialogTitle>Delete Temperature Log</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this temperature log record. This
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
