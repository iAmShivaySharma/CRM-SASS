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
  useGetBatchesQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  useGetProductsQuery,
  type FmcgBatchRecord,
} from '@/lib/api/fmcgApi'

interface BatchListProps {
  workspaceId: string
}

const QC_STATUSES = ['pending', 'passed', 'failed', 'hold']
const BATCH_STATUSES = ['active', 'consumed', 'recalled', 'expired', 'destroyed']

function qcBadgeClass(status: string) {
  if (status === 'passed') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (status === 'failed') return 'bg-destructive/10 text-destructive hover:bg-destructive/10'
  if (status === 'hold') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function statusBadgeClass(status: string) {
  if (status === 'active') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (status === 'recalled' || status === 'expired' || status === 'destroyed') return 'bg-destructive/10 text-destructive hover:bg-destructive/10'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyForm = {
  productId: '',
  batchNumber: '',
  manufacturingDate: '',
  expiryDate: '',
  bestBeforeDate: '',
  quantityProduced: '',
  quantityUnit: 'units',
  lineNumber: '',
  plantCode: '',
  qcStatus: 'pending',
  qcNotes: '',
  rawMaterialDetails: '',
  packagingMaterial: '',
  storageLocation: '',
  temperature: '',
  humidity: '',
}

export function BatchList({ workspaceId }: BatchListProps) {
  const [search, setSearch] = useState('')
  const [qcFilter, setQcFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<FmcgBatchRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetBatchesQuery({
    workspaceId,
    page,
    limit: 20,
    search: search || undefined,
    qcStatus: qcFilter || undefined,
    status: statusFilter || undefined,
  })

  const { data: productsData } = useGetProductsQuery({ workspaceId, limit: 200 })
  const products = productsData?.products || []

  const [createBatch, { isLoading: creating }] = useCreateBatchMutation()
  const [updateBatch, { isLoading: updating }] = useUpdateBatchMutation()
  const [deleteBatch, { isLoading: deleting }] = useDeleteBatchMutation()

  const batches = data?.batches || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingBatch(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(batch: FmcgBatchRecord) {
    setEditingBatch(batch)
    setForm({
      productId: batch.productId,
      batchNumber: batch.batchNumber,
      manufacturingDate: batch.manufacturingDate ? batch.manufacturingDate.split('T')[0] : '',
      expiryDate: batch.expiryDate ? batch.expiryDate.split('T')[0] : '',
      bestBeforeDate: batch.bestBeforeDate ? batch.bestBeforeDate.split('T')[0] : '',
      quantityProduced: batch.quantityProduced.toString(),
      quantityUnit: batch.quantityUnit,
      lineNumber: batch.lineNumber || '',
      plantCode: batch.plantCode || '',
      qcStatus: batch.qcStatus,
      qcNotes: batch.qcNotes || '',
      rawMaterialDetails: batch.rawMaterialDetails || '',
      packagingMaterial: batch.packagingMaterial || '',
      storageLocation: batch.storageLocation || '',
      temperature: batch.temperature?.toString() || '',
      humidity: batch.humidity?.toString() || '',
    })
    setSheetOpen(true)
  }

  function getProductName(productId: string) {
    const product = products.find(p => p._id === productId)
    return product?.name || productId
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      productId: form.productId,
      batchNumber: form.batchNumber,
      manufacturingDate: form.manufacturingDate,
      expiryDate: form.expiryDate,
      bestBeforeDate: form.bestBeforeDate || undefined,
      quantityProduced: parseFloat(form.quantityProduced),
      quantityUnit: form.quantityUnit,
      lineNumber: form.lineNumber || undefined,
      plantCode: form.plantCode || undefined,
      qcStatus: form.qcStatus as any,
      qcNotes: form.qcNotes || undefined,
      rawMaterialDetails: form.rawMaterialDetails || undefined,
      packagingMaterial: form.packagingMaterial || undefined,
      storageLocation: form.storageLocation || undefined,
      temperature: form.temperature ? parseFloat(form.temperature) : undefined,
      humidity: form.humidity ? parseFloat(form.humidity) : undefined,
    }

    try {
      if (editingBatch) {
        await updateBatch({ id: editingBatch._id, ...payload }).unwrap()
        toast.success('Batch updated successfully')
      } else {
        await createBatch(payload).unwrap()
        toast.success('Batch created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save batch')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteBatch({ id: deleteId, workspaceId }).unwrap()
      toast.success('Batch deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete batch')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search batches..."
              className="pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={qcFilter || 'all'} onValueChange={v => { setQcFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="QC Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All QC Status</SelectItem>
              {QC_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {BATCH_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Batch
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch Number</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Mfg Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Qty Produced</TableHead>
              <TableHead>QC Status</TableHead>
              <TableHead>Status</TableHead>
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
            ) : batches.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No batches found.
                </TableCell>
              </TableRow>
            ) : (
              batches.map(batch => (
                <TableRow key={batch._id}>
                  <TableCell className="font-mono font-medium">{batch.batchNumber}</TableCell>
                  <TableCell>{getProductName(batch.productId)}</TableCell>
                  <TableCell>{batch.manufacturingDate ? format(new Date(batch.manufacturingDate), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>{batch.expiryDate ? format(new Date(batch.expiryDate), 'dd MMM yyyy') : '—'}</TableCell>
                  <TableCell>{batch.quantityProduced} {batch.quantityUnit}</TableCell>
                  <TableCell>
                    <Badge className={qcBadgeClass(batch.qcStatus)}>
                      {batch.qcStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(batch.status)}>
                      {batch.status}
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
                        <DropdownMenuItem onClick={() => openEdit(batch)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(batch._id)}
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
          <span>Showing {batches.length} of {pagination.total} batches</span>
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
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{editingBatch ? 'Edit Batch' : 'Add Batch'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Product *</Label>
              <Select value={form.productId} onValueChange={v => setForm(p => ({ ...p, productId: v }))} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(prod => (
                    <SelectItem key={prod._id} value={prod._id}>{prod.name} ({prod.sku})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="batchNumber">Batch Number *</Label>
              <Input
                id="batchNumber"
                value={form.batchNumber}
                onChange={e => setForm(p => ({ ...p, batchNumber: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="manufacturingDate">Manufacturing Date *</Label>
                <Input
                  id="manufacturingDate"
                  type="date"
                  value={form.manufacturingDate}
                  onChange={e => setForm(p => ({ ...p, manufacturingDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date *</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bestBeforeDate">Best Before Date</Label>
              <Input
                id="bestBeforeDate"
                type="date"
                value={form.bestBeforeDate}
                onChange={e => setForm(p => ({ ...p, bestBeforeDate: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantityProduced">Quantity Produced *</Label>
                <Input
                  id="quantityProduced"
                  type="number"
                  value={form.quantityProduced}
                  onChange={e => setForm(p => ({ ...p, quantityProduced: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="quantityUnit">Unit</Label>
                <Input
                  id="quantityUnit"
                  value={form.quantityUnit}
                  onChange={e => setForm(p => ({ ...p, quantityUnit: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="lineNumber">Production Line</Label>
                <Input
                  id="lineNumber"
                  value={form.lineNumber}
                  onChange={e => setForm(p => ({ ...p, lineNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plantCode">Plant Code</Label>
                <Input
                  id="plantCode"
                  value={form.plantCode}
                  onChange={e => setForm(p => ({ ...p, plantCode: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>QC Status</Label>
              <Select value={form.qcStatus} onValueChange={v => setForm(p => ({ ...p, qcStatus: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {QC_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="qcNotes">QC Notes</Label>
              <Textarea
                id="qcNotes"
                value={form.qcNotes}
                onChange={e => setForm(p => ({ ...p, qcNotes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rawMaterialDetails">Raw Material Details</Label>
              <Textarea
                id="rawMaterialDetails"
                value={form.rawMaterialDetails}
                onChange={e => setForm(p => ({ ...p, rawMaterialDetails: e.target.value }))}
                rows={3}
                maxLength={2000}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="packagingMaterial">Packaging Material</Label>
                <Input
                  id="packagingMaterial"
                  value={form.packagingMaterial}
                  onChange={e => setForm(p => ({ ...p, packagingMaterial: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="storageLocation">Storage Location</Label>
                <Input
                  id="storageLocation"
                  value={form.storageLocation}
                  onChange={e => setForm(p => ({ ...p, storageLocation: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="temperature">Temperature (°C)</Label>
                <Input
                  id="temperature"
                  type="number"
                  step="0.1"
                  value={form.temperature}
                  onChange={e => setForm(p => ({ ...p, temperature: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="humidity">Humidity (%)</Label>
                <Input
                  id="humidity"
                  type="number"
                  step="0.1"
                  value={form.humidity}
                  onChange={e => setForm(p => ({ ...p, humidity: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingBatch ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Batch</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this batch record. This action cannot be undone.
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
