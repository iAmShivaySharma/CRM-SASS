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
  useGetRmLotsQuery,
  useCreateRmLotMutation,
  useUpdateRmLotMutation,
  useDeleteRmLotMutation,
  type FmcgRmLotRecord,
} from '@/lib/api/fmcgApi'

interface RmLotListProps {
  workspaceId: string
}

const TEST_STATUSES = ['accepted', 'rejected', 'under_test']

function testStatusBadgeClass(status: string) {
  if (status === 'accepted') {
    return 'bg-primary/10 text-primary hover:bg-primary/10'
  }
  if (status === 'rejected') return 'bg-muted text-destructive hover:bg-muted'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

const emptyForm = {
  receiptDate: '',
  supplierName: '',
  supplierFssaiNumber: '',
  materialName: '',
  quantityReceived: '',
  unit: 'kg',
  supplierLotNumber: '',
  internalLotNumber: '',
  testStatus: 'under_test',
  storageLocation: '',
  remarks: '',
}

export function RmLotList({ workspaceId }: RmLotListProps) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<FmcgRmLotRecord | null>(
    null
  )
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetRmLotsQuery({
    workspaceId,
    page,
    limit: 20,
    search: search || undefined,
    testStatus: statusFilter || undefined,
  })

  const [createRmLot, { isLoading: creating }] = useCreateRmLotMutation()
  const [updateRmLot, { isLoading: updating }] = useUpdateRmLotMutation()
  const [deleteRmLot, { isLoading: deleting }] = useDeleteRmLotMutation()

  const records = data?.rmLots || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingRecord(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(record: FmcgRmLotRecord) {
    setEditingRecord(record)
    setForm({
      receiptDate: record.receiptDate ? record.receiptDate.split('T')[0] : '',
      supplierName: record.supplierName,
      supplierFssaiNumber: record.supplierFssaiNumber || '',
      materialName: record.materialName,
      quantityReceived: record.quantityReceived.toString(),
      unit: record.unit,
      supplierLotNumber: record.supplierLotNumber || '',
      internalLotNumber: record.internalLotNumber,
      testStatus: record.testStatus,
      storageLocation: record.storageLocation || '',
      remarks: record.remarks || '',
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      receiptDate: form.receiptDate,
      supplierName: form.supplierName,
      supplierFssaiNumber: form.supplierFssaiNumber || undefined,
      materialName: form.materialName,
      quantityReceived: parseFloat(form.quantityReceived),
      unit: form.unit,
      supplierLotNumber: form.supplierLotNumber || undefined,
      internalLotNumber: form.internalLotNumber,
      testStatus: form.testStatus as FmcgRmLotRecord['testStatus'],
      storageLocation: form.storageLocation || undefined,
      remarks: form.remarks || undefined,
    }

    try {
      if (editingRecord) {
        await updateRmLot({ id: editingRecord._id, ...payload }).unwrap()
        toast.success('RM lot updated successfully')
      } else {
        await createRmLot(payload).unwrap()
        toast.success('RM lot created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save RM lot')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteRmLot({ id: deleteId, workspaceId }).unwrap()
      toast.success('RM lot deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete RM lot')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search RM lots..."
              className="pl-8"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </div>
          <Select
            value={statusFilter || 'all'}
            onValueChange={v => {
              setStatusFilter(v === 'all' ? '' : v)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Test Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {TEST_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">
                  {s.replace('_', ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add RM Lot
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Internal Lot No.</TableHead>
              <TableHead>Material Name</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Qty Received</TableHead>
              <TableHead>Test Status</TableHead>
              <TableHead>Storage Location</TableHead>
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
                  No RM lots found.
                </TableCell>
              </TableRow>
            ) : (
              records.map(record => (
                <TableRow key={record._id}>
                  <TableCell>
                    {record.receiptDate
                      ? format(new Date(record.receiptDate), 'dd MMM yyyy')
                      : '—'}
                  </TableCell>
                  <TableCell className="font-mono font-medium">
                    {record.internalLotNumber}
                  </TableCell>
                  <TableCell>{record.materialName}</TableCell>
                  <TableCell>{record.supplierName}</TableCell>
                  <TableCell>
                    {record.quantityReceived} {record.unit}
                  </TableCell>
                  <TableCell>
                    <Badge className={testStatusBadgeClass(record.testStatus)}>
                      {record.testStatus.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>{record.storageLocation || '—'}</TableCell>
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
            Showing {records.length} of {pagination.total} lots
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
              {editingRecord ? 'Edit RM Lot' : 'Add RM Lot'}
            </SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="receiptDate">Receipt Date *</Label>
              <Input
                id="receiptDate"
                type="date"
                value={form.receiptDate}
                onChange={e =>
                  setForm(p => ({ ...p, receiptDate: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplierName">Supplier Name *</Label>
                <Input
                  id="supplierName"
                  value={form.supplierName}
                  onChange={e =>
                    setForm(p => ({ ...p, supplierName: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="supplierFssaiNumber">Supplier FSSAI No.</Label>
                <Input
                  id="supplierFssaiNumber"
                  value={form.supplierFssaiNumber}
                  onChange={e =>
                    setForm(p => ({
                      ...p,
                      supplierFssaiNumber: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="materialName">Material Name *</Label>
              <Input
                id="materialName"
                value={form.materialName}
                onChange={e =>
                  setForm(p => ({ ...p, materialName: e.target.value }))
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="quantityReceived">Quantity Received *</Label>
                <Input
                  id="quantityReceived"
                  type="number"
                  step="0.01"
                  value={form.quantityReceived}
                  onChange={e =>
                    setForm(p => ({ ...p, quantityReceived: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={form.unit}
                  onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="supplierLotNumber">Supplier Lot Number</Label>
                <Input
                  id="supplierLotNumber"
                  value={form.supplierLotNumber}
                  onChange={e =>
                    setForm(p => ({ ...p, supplierLotNumber: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="internalLotNumber">Internal Lot Number *</Label>
                <Input
                  id="internalLotNumber"
                  value={form.internalLotNumber}
                  onChange={e =>
                    setForm(p => ({ ...p, internalLotNumber: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Test Status</Label>
              <Select
                value={form.testStatus}
                onValueChange={v => setForm(p => ({ ...p, testStatus: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEST_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="storageLocation">Storage Location</Label>
              <Input
                id="storageLocation"
                value={form.storageLocation}
                onChange={e =>
                  setForm(p => ({ ...p, storageLocation: e.target.value }))
                }
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
            <AlertDialogTitle>Delete RM Lot</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this RM lot record. This action
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
