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
  useGetPestLogsQuery,
  useCreatePestLogMutation,
  useUpdatePestLogMutation,
  useDeletePestLogMutation,
  type FmcgPestLogRecord,
} from '@/lib/api/fmcgApi'

interface PestLogListProps {
  workspaceId: string
}

const emptyForm = {
  weekEnding: '',
  type: 'internal_check',
  pcoName: '',
  pcoLicenseNumber: '',
  treatmentChemicals: '',
  checkedBy: '',
  findings: '',
  areasText: '',
}

export function PestLogList({ workspaceId }: PestLogListProps) {
  const [typeFilter, setTypeFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FmcgPestLogRecord | null>(
    null
  )
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetPestLogsQuery({
    workspaceId,
    page,
    limit: 20,
    type: typeFilter || undefined,
  })

  const [createPestLog, { isLoading: creating }] = useCreatePestLogMutation()
  const [updatePestLog, { isLoading: updating }] = useUpdatePestLogMutation()
  const [deletePestLog, { isLoading: deleting }] = useDeletePestLogMutation()

  const records = data?.pestLogs || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgPestLogRecord) {
    setEditingRecord(record)
    setForm({
      weekEnding: record.weekEnding ? record.weekEnding.split('T')[0] : '',
      type: record.type,
      pcoName: record.pcoName || '',
      pcoLicenseNumber: record.pcoLicenseNumber || '',
      treatmentChemicals: record.treatmentChemicals || '',
      checkedBy: record.checkedBy,
      findings: record.findings || '',
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
      evidenceFound: false,
    }))

    const payload = {
      workspaceId,
      weekEnding: form.weekEnding,
      type: form.type as FmcgPestLogRecord['type'],
      pcoName:
        form.type === 'pco_visit' ? form.pcoName || undefined : undefined,
      pcoLicenseNumber:
        form.type === 'pco_visit'
          ? form.pcoLicenseNumber || undefined
          : undefined,
      treatmentChemicals:
        form.type === 'pco_visit'
          ? form.treatmentChemicals || undefined
          : undefined,
      checkedBy: form.checkedBy,
      findings: form.findings || undefined,
      entries,
    }

    try {
      if (editingRecord) {
        await updatePestLog({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('Pest log updated successfully')
      } else {
        await createPestLog(payload).unwrap()
        toast.success('Pest log created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save pest log')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deletePestLog({ id: deleteId, workspaceId }).unwrap()
      toast.success('Pest log deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete pest log')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Select
            value={typeFilter || 'all'}
            onValueChange={v => {
              setTypeFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="internal_check">Internal Check</SelectItem>
              <SelectItem value="pco_visit">PCO Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Pest Log
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Week Ending</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Areas Checked</TableHead>
              <TableHead>Evidence Found</TableHead>
              <TableHead>PCO Name</TableHead>
              <TableHead>Checked By</TableHead>
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
                  No pest logs found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell>
                    {record.weekEnding
                      ? format(new Date(record.weekEnding), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-muted capitalize text-muted-foreground hover:bg-muted">
                      {record.type.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.entries.length} areas</TableCell>
                  <TableCell>
                    {record.entries.filter(e => e.evidenceFound).length}
                  </TableCell>
                  <TableCell>{record.pcoName || '—'}</TableCell>
                  <TableCell>{record.checkedBy}</TableCell>
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
              {editingRecord ? 'Edit Pest Log' : 'Add Pest Log'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="weekEnding">Week Ending *</Label>
                <Input
                  id="weekEnding"
                  type="date"
                  value={form.weekEnding}
                  onChange={e =>
                    setForm(p => ({ ...p, weekEnding: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select
                  value={form.type}
                  onValueChange={v => setForm(p => ({ ...p, type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal_check">
                      Internal Check
                    </SelectItem>
                    <SelectItem value="pco_visit">PCO Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'pco_visit' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="pcoName">PCO Name</Label>
                    <Input
                      id="pcoName"
                      value={form.pcoName}
                      onChange={e =>
                        setForm(p => ({ ...p, pcoName: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pcoLicenseNumber">PCO License Number</Label>
                    <Input
                      id="pcoLicenseNumber"
                      value={form.pcoLicenseNumber}
                      onChange={e =>
                        setForm(p => ({
                          ...p,
                          pcoLicenseNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="treatmentChemicals">
                    Treatment Chemicals
                  </Label>
                  <Input
                    id="treatmentChemicals"
                    value={form.treatmentChemicals}
                    onChange={e =>
                      setForm(p => ({
                        ...p,
                        treatmentChemicals: e.target.value,
                      }))
                    }
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="checkedBy">Checked By *</Label>
              <Input
                id="checkedBy"
                value={form.checkedBy}
                onChange={e =>
                  setForm(p => ({ ...p, checkedBy: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="areasText">Areas Checked (comma-separated)</Label>
              <Textarea
                id="areasText"
                value={form.areasText}
                onChange={e =>
                  setForm(p => ({ ...p, areasText: e.target.value }))
                }
                placeholder="Storage room, Production floor, Drains"
                rows={3}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="findings">Findings</Label>
              <Textarea
                id="findings"
                value={form.findings}
                onChange={e =>
                  setForm(p => ({ ...p, findings: e.target.value }))
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
            <AlertDialogTitle>Delete Pest Log</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this pest log record. This action
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
