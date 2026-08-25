'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, MoreVertical, Loader2, X } from 'lucide-react'
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
  useGetTestReportsQuery,
  useCreateTestReportMutation,
  useUpdateTestReportMutation,
  useDeleteTestReportMutation,
  useGetBatchesQuery,
  useGetProductsQuery,
  type FmcgTestReportRecord,
  type FmcgTestParameter,
} from '@/lib/api/fmcgApi'

interface TestReportListProps {
  workspaceId: string
}

const TEST_TYPES = ['microbiological', 'chemical', 'physical', 'sensory', 'nutritional', 'pesticide', 'heavy_metals', 'other']
const RESULTS = ['pass', 'fail', 'conditional_pass']

function resultBadgeClass(result: string) {
  if (result === 'pass') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (result === 'fail') return 'bg-destructive/10 text-destructive hover:bg-destructive/10'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyParameter: FmcgTestParameter = {
  name: '',
  value: '',
  unit: '',
  minLimit: '',
  maxLimit: '',
  status: 'pass',
}

type TestReportForm = {
  batchId: string
  productId: string
  reportNumber: string
  testType: 'microbiological' | 'chemical' | 'physical' | 'sensory' | 'nutritional' | 'pesticide' | 'heavy_metals' | 'other'
  labName: string
  labAccreditationNumber: string
  sampleCollectedAt: string
  reportDate: string
  result: 'pass' | 'fail' | 'conditional_pass'
  overallObservations: string
  reportUrl: string
  certificateNumber: string
  validUntil: string
  parameters: FmcgTestParameter[]
}

const emptyForm: TestReportForm = {
  batchId: '',
  productId: '',
  reportNumber: '',
  testType: 'microbiological',
  labName: '',
  labAccreditationNumber: '',
  sampleCollectedAt: '',
  reportDate: '',
  result: 'pass',
  overallObservations: '',
  reportUrl: '',
  certificateNumber: '',
  validUntil: '',
  parameters: [],
}

export function TestReportList({ workspaceId }: TestReportListProps) {
  const [resultFilter, setResultFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingReport, setEditingReport] = useState<FmcgTestReportRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<TestReportForm>(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetTestReportsQuery({
    workspaceId,
    page,
    limit: 20,
    result: resultFilter || undefined,
    testType: typeFilter || undefined,
  })

  const { data: batchesData } = useGetBatchesQuery({ workspaceId, limit: 200 })
  const { data: productsData } = useGetProductsQuery({ workspaceId, limit: 200 })
  const batches = batchesData?.batches || []
  const products = productsData?.products || []

  const [createTestReport, { isLoading: creating }] = useCreateTestReportMutation()
  const [updateTestReport, { isLoading: updating }] = useUpdateTestReportMutation()
  const [deleteTestReport, { isLoading: deleting }] = useDeleteTestReportMutation()

  const reports = data?.reports || []
  const pagination = data?.pagination

  function getBatchLabel(batchId: string) {
    const batch = batches.find(b => b._id === batchId)
    return batch?.batchNumber || batchId
  }

  function getProductName(productId: string) {
    const product = products.find(p => p._id === productId)
    return product?.name || productId
  }

  function handleBatchChange(batchId: string) {
    const batch = batches.find(b => b._id === batchId)
    setForm(p => ({
      ...p,
      batchId,
      productId: batch?.productId || p.productId,
    }))
  }

  function openCreate() {
    setEditingReport(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(report: FmcgTestReportRecord) {
    setEditingReport(report)
    setForm({
      batchId: report.batchId,
      productId: report.productId,
      reportNumber: report.reportNumber,
      testType: report.testType,
      labName: report.labName,
      labAccreditationNumber: report.labAccreditationNumber || '',
      sampleCollectedAt: report.sampleCollectedAt ? report.sampleCollectedAt.split('T')[0] : '',
      reportDate: report.reportDate ? report.reportDate.split('T')[0] : '',
      result: report.result,
      overallObservations: report.overallObservations || '',
      reportUrl: report.reportUrl || '',
      certificateNumber: report.certificateNumber || '',
      validUntil: report.validUntil ? report.validUntil.split('T')[0] : '',
      parameters: report.parameters || [],
    })
    setSheetOpen(true)
  }

  function addParameter() {
    setForm(p => ({ ...p, parameters: [...p.parameters, { ...emptyParameter }] }))
  }

  function removeParameter(index: number) {
    setForm(p => ({ ...p, parameters: p.parameters.filter((_, i) => i !== index) }))
  }

  function updateParameter(index: number, field: keyof FmcgTestParameter, value: string) {
    setForm(p => ({
      ...p,
      parameters: p.parameters.map((param, i) =>
        i === index ? { ...param, [field]: value } : param
      ),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      batchId: form.batchId,
      productId: form.productId,
      reportNumber: form.reportNumber,
      testType: form.testType,
      labName: form.labName,
      labAccreditationNumber: form.labAccreditationNumber || undefined,
      sampleCollectedAt: form.sampleCollectedAt,
      reportDate: form.reportDate,
      result: form.result,
      parameters: form.parameters,
      overallObservations: form.overallObservations || undefined,
      reportUrl: form.reportUrl || undefined,
      certificateNumber: form.certificateNumber || undefined,
      validUntil: form.validUntil || undefined,
    }

    try {
      if (editingReport) {
        await updateTestReport({ id: editingReport._id, ...payload }).unwrap()
        toast.success('Test report updated successfully')
      } else {
        await createTestReport(payload).unwrap()
        toast.success('Test report created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save test report')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTestReport({ id: deleteId, workspaceId }).unwrap()
      toast.success('Test report deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete test report')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Select value={typeFilter || 'all'} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Test Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TEST_TYPES.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={resultFilter || 'all'} onValueChange={v => { setResultFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Result" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Results</SelectItem>
              {RESULTS.map(r => (
                <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Report
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Report Number</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Test Type</TableHead>
              <TableHead>Lab Name</TableHead>
              <TableHead>Report Date</TableHead>
              <TableHead>Result</TableHead>
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
            ) : reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No test reports found.
                </TableCell>
              </TableRow>
            ) : (
              reports.map(report => (
                <TableRow key={report._id}>
                  <TableCell className="font-mono font-medium">{report.reportNumber}</TableCell>
                  <TableCell className="text-sm">{getBatchLabel(report.batchId)}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{getProductName(report.productId)}</TableCell>
                  <TableCell className="capitalize">{report.testType.replace('_', ' ')}</TableCell>
                  <TableCell className="max-w-[140px] truncate">{report.labName}</TableCell>
                  <TableCell>{report.reportDate ? format(new Date(report.reportDate), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>
                    <Badge className={resultBadgeClass(report.result)}>
                      {report.result.replace('_', ' ')}
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
                        <DropdownMenuItem onClick={() => openEdit(report)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(report._id)}
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
          <span>Showing {reports.length} of {pagination.total} reports</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{editingReport ? 'Edit Test Report' : 'Add Test Report'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Batch *</Label>
              <Select value={form.batchId} onValueChange={handleBatchChange} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b._id} value={b._id}>{b.batchNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={v => setForm(p => ({ ...p, productId: v }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(prod => (
                    <SelectItem key={prod._id} value={prod._id}>{prod.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="reportNumber">Report Number *</Label>
                <Input
                  id="reportNumber"
                  value={form.reportNumber}
                  onChange={e => setForm(p => ({ ...p, reportNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Test Type *</Label>
                <Select value={form.testType} onValueChange={v => setForm(p => ({ ...p, testType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t.replace('_', ' ')}</SelectItem>
                    ))}
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
                  onChange={e => setForm(p => ({ ...p, labName: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="labAccreditationNumber">NABL Accreditation Number</Label>
                <Input
                  id="labAccreditationNumber"
                  value={form.labAccreditationNumber}
                  onChange={e => setForm(p => ({ ...p, labAccreditationNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sampleCollectedAt">Sample Collection Date *</Label>
                <Input
                  id="sampleCollectedAt"
                  type="date"
                  value={form.sampleCollectedAt}
                  onChange={e => setForm(p => ({ ...p, sampleCollectedAt: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reportDate">Report Date *</Label>
                <Input
                  id="reportDate"
                  type="date"
                  value={form.reportDate}
                  onChange={e => setForm(p => ({ ...p, reportDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Result *</Label>
                <Select value={form.result} onValueChange={v => setForm(p => ({ ...p, result: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESULTS.map(r => (
                      <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={form.validUntil}
                  onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="certificateNumber">Certificate Number</Label>
                <Input
                  id="certificateNumber"
                  value={form.certificateNumber}
                  onChange={e => setForm(p => ({ ...p, certificateNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reportUrl">Report URL</Label>
                <Input
                  id="reportUrl"
                  type="url"
                  value={form.reportUrl}
                  onChange={e => setForm(p => ({ ...p, reportUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="overallObservations">Overall Observations</Label>
              <Textarea
                id="overallObservations"
                value={form.overallObservations}
                onChange={e => setForm(p => ({ ...p, overallObservations: e.target.value }))}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Test Parameters</Label>
                <Button type="button" variant="outline" size="sm" onClick={addParameter}>
                  <Plus className="mr-1 h-3 w-3" />
                  Add Parameter
                </Button>
              </div>
              {form.parameters.length > 0 && (
                <div className="space-y-2 rounded-md border p-3">
                  <div className="grid grid-cols-6 gap-2 text-xs font-medium text-muted-foreground">
                    <span>Name</span>
                    <span>Value</span>
                    <span>Unit</span>
                    <span>Min</span>
                    <span>Max</span>
                    <span>Status</span>
                  </div>
                  {form.parameters.map((param, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 items-center">
                      <Input
                        placeholder="Name"
                        value={param.name}
                        onChange={e => updateParameter(index, 'name', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Value"
                        value={param.value}
                        onChange={e => updateParameter(index, 'value', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Unit"
                        value={param.unit}
                        onChange={e => updateParameter(index, 'unit', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Min"
                        value={param.minLimit}
                        onChange={e => updateParameter(index, 'minLimit', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <Input
                        placeholder="Max"
                        value={param.maxLimit}
                        onChange={e => updateParameter(index, 'maxLimit', e.target.value)}
                        className="h-8 text-sm"
                      />
                      <div className="flex items-center gap-1">
                        <Select value={param.status} onValueChange={v => updateParameter(index, 'status', v)}>
                          <SelectTrigger className="h-8 text-sm flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pass">Pass</SelectItem>
                            <SelectItem value="fail">Fail</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => removeParameter(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingReport ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Report</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this test report. This action cannot be undone.
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
