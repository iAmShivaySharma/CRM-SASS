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
  useGetWaterTestsQuery,
  useCreateWaterTestMutation,
  useUpdateWaterTestMutation,
  useDeleteWaterTestMutation,
  type FmcgWaterTestRecord,
  type FmcgWaterTestParameter,
} from '@/lib/api/fmcgApi'

interface WaterTestListProps {
  workspaceId: string
}

function resultBadgeClass(result: string) {
  if (result === 'pass') return 'bg-primary/10 text-primary hover:bg-primary/10'
  return 'bg-muted text-destructive hover:bg-muted'
}

function parseParametersText(text: string): FmcgWaterTestParameter[] {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split(',').map(p => p.trim())
      return {
        name: parts[0] || '',
        value: parts[1] || '',
        unit: parts[2] || '',
        limit: parts[3] || '',
        status: (parts[4] === 'fail' ? 'fail' : 'pass') as 'pass' | 'fail',
      }
    })
    .filter(p => p.name)
}

function parametersToText(params: FmcgWaterTestParameter[]): string {
  return params
    .map(
      p =>
        `${p.name}, ${p.value}, ${p.unit || ''}, ${p.limit || ''}, ${p.status}`
    )
    .join('\n')
}

const emptyForm = {
  testDate: '',
  labName: '',
  labAccreditationNumber: '',
  sampleSource: '',
  overallResult: 'pass',
  validUntil: '',
  reportUrl: '',
  remarks: '',
  parametersText: '',
}

export function WaterTestList({ workspaceId }: WaterTestListProps) {
  const [resultFilter, setResultFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] =
    useState<FmcgWaterTestRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetWaterTestsQuery({
    workspaceId,
    page,
    limit: 20,
    overallResult: resultFilter || undefined,
  })

  const [createWaterTest, { isLoading: creating }] =
    useCreateWaterTestMutation()
  const [updateWaterTest, { isLoading: updating }] =
    useUpdateWaterTestMutation()
  const [deleteWaterTest, { isLoading: deleting }] =
    useDeleteWaterTestMutation()

  const records = data?.waterTests || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgWaterTestRecord) {
    setEditingRecord(record)
    setForm({
      testDate: record.testDate ? record.testDate.split('T')[0] : '',
      labName: record.labName,
      labAccreditationNumber: record.labAccreditationNumber || '',
      sampleSource: record.sampleSource,
      overallResult: record.overallResult,
      validUntil: record.validUntil ? record.validUntil.split('T')[0] : '',
      reportUrl: record.reportUrl || '',
      remarks: record.remarks || '',
      parametersText: parametersToText(record.parameters),
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parameters = parseParametersText(form.parametersText)

    const payload = {
      workspaceId,
      testDate: form.testDate,
      labName: form.labName,
      labAccreditationNumber: form.labAccreditationNumber || undefined,
      sampleSource: form.sampleSource,
      overallResult: form.overallResult as FmcgWaterTestRecord['overallResult'],
      validUntil: form.validUntil,
      reportUrl: form.reportUrl || undefined,
      remarks: form.remarks || undefined,
      parameters,
    }

    try {
      if (editingRecord) {
        await updateWaterTest({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('Water test updated successfully')
      } else {
        await createWaterTest(payload).unwrap()
        toast.success('Water test created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save water test')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteWaterTest({ id: deleteId, workspaceId }).unwrap()
      toast.success('Water test deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete water test')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
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
              <SelectItem value="pass">Pass</SelectItem>
              <SelectItem value="fail">Fail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Water Test
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test Date</TableHead>
              <TableHead>Lab Name</TableHead>
              <TableHead>Sample Source</TableHead>
              <TableHead>Parameters Tested</TableHead>
              <TableHead>Overall Result</TableHead>
              <TableHead>Valid Until</TableHead>
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
                  No water tests found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell>
                    {record.testDate
                      ? format(new Date(record.testDate), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell>{record.labName}</TableCell>
                  <TableCell>{record.sampleSource}</TableCell>
                  <TableCell>{record.parameters.length} parameters</TableCell>
                  <TableCell>
                    <Badge className={resultBadgeClass(record.overallResult)}>
                      {record.overallResult}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.validUntil
                      ? format(new Date(record.validUntil), 'dd MMM yyyy')
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
            Showing {records.length} of {pagination.total} tests
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
              {editingRecord ? 'Edit Water Test' : 'Add Water Test'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="testDate">Test Date *</Label>
                <Input
                  id="testDate"
                  type="date"
                  value={form.testDate}
                  onChange={e =>
                    setForm(p => ({ ...p, testDate: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Overall Result *</Label>
                <Select
                  value={form.overallResult}
                  onValueChange={v =>
                    setForm(p => ({ ...p, overallResult: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pass">Pass</SelectItem>
                    <SelectItem value="fail">Fail</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="labName">Lab Name *</Label>
                <Input
                  id="labName"
                  value={form.labName}
                  onChange={e =>
                    setForm(p => ({ ...p, labName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="labAccreditationNumber">
                  Lab Accreditation No.
                </Label>
                <Input
                  id="labAccreditationNumber"
                  value={form.labAccreditationNumber}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      labAccreditationNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sampleSource">Sample Source *</Label>
                <Input
                  id="sampleSource"
                  value={form.sampleSource}
                  onChange={e =>
                    setForm(p => ({ ...p, sampleSource: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validUntil">Valid Until *</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={form.validUntil}
                  onChange={e =>
                    setForm(p => ({ ...p, validUntil: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reportUrl">Report URL</Label>
              <Input
                id="reportUrl"
                value={form.reportUrl}
                onChange={e =>
                  setForm(p => ({ ...p, reportUrl: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="parametersText">
                Parameters (Name, Value, Unit, Limit, pass/fail — one per line)
              </Label>
              <Textarea
                id="parametersText"
                value={form.parametersText}
                onChange={e =>
                  setForm(p => ({ ...p, parametersText: e.target.value }))
                }
                placeholder="pH, 7.2, -, 6.5-8.5, pass"
                rows={5}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={form.remarks}
                onChange={e =>
                  setForm(p => ({ ...p, remarks: e.target.value }))
                }
                rows={2}
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
            <AlertDialogTitle>Delete Water Test</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this water test record. This action
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
