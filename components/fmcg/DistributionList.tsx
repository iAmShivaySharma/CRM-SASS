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
  useGetDistributionsQuery,
  useCreateDistributionMutation,
  useUpdateDistributionMutation,
  useDeleteDistributionMutation,
  useGetBatchesQuery,
  useGetProductsQuery,
  type FmcgDistributionRecord,
} from '@/lib/api/fmcgApi'

interface DistributionListProps {
  workspaceId: string
}

const RECIPIENT_TYPES = ['distributor', 'retailer', 'wholesaler', 'direct_customer', 'export']
const DISTRIBUTION_STATUSES = ['dispatched', 'in_transit', 'delivered', 'returned', 'recalled']

function statusBadgeClass(status: string) {
  if (status === 'delivered') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (status === 'returned' || status === 'recalled') return 'bg-destructive/10 text-destructive hover:bg-destructive/10'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function recipientBadgeClass(type: string) {
  if (type === 'export') return 'bg-primary/10 text-primary hover:bg-primary/10'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function formatRecipientType(type: string) {
  return type.replace(/_/g, ' ')
}

const emptyForm = {
  batchId: '',
  productId: '',
  dispatchDate: '',
  deliveryDate: '',
  recipientType: 'distributor',
  recipientName: '',
  recipientFssaiNumber: '',
  recipientGst: '',
  recipientAddress: '',
  recipientState: '',
  recipientCity: '',
  recipientPhone: '',
  invoiceNumber: '',
  quantityDispatched: '',
  quantityUnit: 'units',
  vehicleNumber: '',
  driverName: '',
  transporterName: '',
  lrNumber: '',
  status: 'dispatched',
  notes: '',
}

export function DistributionList({ workspaceId }: DistributionListProps) {
  const [statusFilter, setStatusFilter] = useState('')
  const [recipientTypeFilter, setRecipientTypeFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FmcgDistributionRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetDistributionsQuery({
    workspaceId,
    page,
    limit: 20,
    status: statusFilter || undefined,
    recipientType: recipientTypeFilter || undefined,
  })

  const { data: batchesData } = useGetBatchesQuery({ workspaceId, limit: 200 })
  const { data: productsData } = useGetProductsQuery({ workspaceId, limit: 200 })
  const batches = batchesData?.batches || []
  const products = productsData?.products || []

  const [createDistribution, { isLoading: creating }] = useCreateDistributionMutation()
  const [updateDistribution, { isLoading: updating }] = useUpdateDistributionMutation()
  const [deleteDistribution, { isLoading: deleting }] = useDeleteDistributionMutation()

  const distributions = data?.distributions || []
  const pagination = data?.pagination

  function getBatchNumber(batchId: string) {
    return batches.find(b => b._id === batchId)?.batchNumber || batchId
  }

  function getProductName(productId: string) {
    return products.find(p => p._id === productId)?.name || productId
  }

  function handleBatchSelect(batchId: string) {
    const batch = batches.find(b => b._id === batchId)
    setForm(p => ({ ...p, batchId, productId: batch?.productId || '' }))
  }

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgDistributionRecord) {
    setEditingRecord(record)
    setForm({
      batchId: record.batchId,
      productId: record.productId,
      dispatchDate: record.dispatchDate ? record.dispatchDate.split('T')[0] : '',
      deliveryDate: record.deliveryDate ? record.deliveryDate.split('T')[0] : '',
      recipientType: record.recipientType,
      recipientName: record.recipientName,
      recipientFssaiNumber: record.recipientFssaiNumber || '',
      recipientGst: record.recipientGst || '',
      recipientAddress: record.recipientAddress || '',
      recipientState: record.recipientState || '',
      recipientCity: record.recipientCity || '',
      recipientPhone: record.recipientPhone || '',
      invoiceNumber: record.invoiceNumber || '',
      quantityDispatched: record.quantityDispatched.toString(),
      quantityUnit: record.quantityUnit,
      vehicleNumber: record.vehicleNumber || '',
      driverName: record.driverName || '',
      transporterName: record.transporterName || '',
      lrNumber: record.lrNumber || '',
      status: record.status,
      notes: record.notes || '',
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {
      workspaceId,
      batchId: form.batchId,
      productId: form.productId,
      dispatchDate: form.dispatchDate,
      deliveryDate: form.deliveryDate || undefined,
      recipientType: form.recipientType as any,
      recipientName: form.recipientName,
      recipientFssaiNumber: form.recipientFssaiNumber || undefined,
      recipientGst: form.recipientGst || undefined,
      recipientAddress: form.recipientAddress || undefined,
      recipientState: form.recipientState || undefined,
      recipientCity: form.recipientCity || undefined,
      recipientPhone: form.recipientPhone || undefined,
      invoiceNumber: form.invoiceNumber || undefined,
      quantityDispatched: parseFloat(form.quantityDispatched),
      quantityUnit: form.quantityUnit,
      vehicleNumber: form.vehicleNumber || undefined,
      driverName: form.driverName || undefined,
      transporterName: form.transporterName || undefined,
      lrNumber: form.lrNumber || undefined,
      status: form.status as any,
      notes: form.notes || undefined,
    }

    try {
      if (editingRecord) {
        await updateDistribution({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('Distribution record updated successfully')
      } else {
        await createDistribution(payload).unwrap()
        toast.success('Distribution record created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save distribution record')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteDistribution({ id: deleteId, workspaceId }).unwrap()
      toast.success('Distribution record deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete distribution record')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {DISTRIBUTION_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={recipientTypeFilter || 'all'} onValueChange={v => { setRecipientTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Recipient Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {RECIPIENT_TYPES.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Dispatch
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice No</TableHead>
              <TableHead>Batch No</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Recipient Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dispatch Date</TableHead>
              <TableHead>Qty Dispatched</TableHead>
              <TableHead>Status</TableHead>
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
            ) : distributions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No distribution records found.
                </TableCell>
              </TableRow>
            ) : (
              distributions.map(record => (
                <TableRow key={record._id}>
                  <TableCell className="font-mono text-sm">{record.invoiceNumber || '—'}</TableCell>
                  <TableCell className="font-mono font-medium">{getBatchNumber(record.batchId)}</TableCell>
                  <TableCell>{getProductName(record.productId)}</TableCell>
                  <TableCell>{record.recipientName}</TableCell>
                  <TableCell>
                    <Badge className={recipientBadgeClass(record.recipientType)}>
                      {formatRecipientType(record.recipientType)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {record.dispatchDate ? format(new Date(record.dispatchDate), 'dd MMM yyyy') : '—'}
                  </TableCell>
                  <TableCell>{record.quantityDispatched} {record.quantityUnit}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeClass(record.status)}>
                      {record.status.replace(/_/g, ' ')}
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
          <span>Showing {distributions.length} of {pagination.total} records</span>
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
            <SheetTitle>{editingRecord ? 'Edit Distribution Record' : 'Add Dispatch'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label>Batch *</Label>
              <Select value={form.batchId} onValueChange={handleBatchSelect} required>
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

            {form.productId && (
              <div className="space-y-1.5">
                <Label>Product</Label>
                <Input value={getProductName(form.productId)} readOnly className="bg-muted" />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="dispatchDate">Dispatch Date *</Label>
                <Input
                  id="dispatchDate"
                  type="date"
                  value={form.dispatchDate}
                  onChange={e => setForm(p => ({ ...p, dispatchDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deliveryDate">Delivery Date</Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={form.deliveryDate}
                  onChange={e => setForm(p => ({ ...p, deliveryDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Recipient Type *</Label>
              <Select value={form.recipientType} onValueChange={v => setForm(p => ({ ...p, recipientType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECIPIENT_TYPES.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recipientName">Recipient Name *</Label>
              <Input
                id="recipientName"
                value={form.recipientName}
                onChange={e => setForm(p => ({ ...p, recipientName: e.target.value }))}
                required
                maxLength={200}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="recipientFssaiNumber">Recipient FSSAI Number</Label>
                <Input
                  id="recipientFssaiNumber"
                  value={form.recipientFssaiNumber}
                  onChange={e => setForm(p => ({ ...p, recipientFssaiNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientGst">Recipient GST</Label>
                <Input
                  id="recipientGst"
                  value={form.recipientGst}
                  onChange={e => setForm(p => ({ ...p, recipientGst: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="recipientAddress">Recipient Address</Label>
              <Textarea
                id="recipientAddress"
                value={form.recipientAddress}
                onChange={e => setForm(p => ({ ...p, recipientAddress: e.target.value }))}
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="recipientState">State</Label>
                <Input
                  id="recipientState"
                  value={form.recipientState}
                  onChange={e => setForm(p => ({ ...p, recipientState: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientCity">City</Label>
                <Input
                  id="recipientCity"
                  value={form.recipientCity}
                  onChange={e => setForm(p => ({ ...p, recipientCity: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="recipientPhone">Phone</Label>
                <Input
                  id="recipientPhone"
                  value={form.recipientPhone}
                  onChange={e => setForm(p => ({ ...p, recipientPhone: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invoiceNumber">Invoice Number</Label>
              <Input
                id="invoiceNumber"
                value={form.invoiceNumber}
                onChange={e => setForm(p => ({ ...p, invoiceNumber: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantityDispatched">Quantity Dispatched *</Label>
                <Input
                  id="quantityDispatched"
                  type="number"
                  value={form.quantityDispatched}
                  onChange={e => setForm(p => ({ ...p, quantityDispatched: e.target.value }))}
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
                <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                <Input
                  id="vehicleNumber"
                  value={form.vehicleNumber}
                  onChange={e => setForm(p => ({ ...p, vehicleNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="driverName">Driver Name</Label>
                <Input
                  id="driverName"
                  value={form.driverName}
                  onChange={e => setForm(p => ({ ...p, driverName: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="transporterName">Transporter Name</Label>
                <Input
                  id="transporterName"
                  value={form.transporterName}
                  onChange={e => setForm(p => ({ ...p, transporterName: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lrNumber">LR Number</Label>
                <Input
                  id="lrNumber"
                  value={form.lrNumber}
                  onChange={e => setForm(p => ({ ...p, lrNumber: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DISTRIBUTION_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={3}
                maxLength={1000}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingRecord ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Distribution Record</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this distribution record. This action cannot be undone.
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
