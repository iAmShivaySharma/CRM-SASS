'use client'

import { useState } from 'react'
import { Plus, Search, Edit, Trash2, MoreVertical, Loader2, Star } from 'lucide-react'
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
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  type FmcgSupplierRecord,
} from '@/lib/api/fmcgApi'

interface SupplierListProps {
  workspaceId: string
}

const APPROVAL_STATUSES = ['pending', 'approved', 'suspended', 'blacklisted']

function approvalBadgeClass(status: string) {
  if (status === 'approved') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (status === 'blacklisted' || status === 'suspended') return 'bg-destructive/10 text-destructive hover:bg-destructive/10'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function renderStars(rating?: number) {
  if (!rating) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i < rating ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
        />
      ))}
    </span>
  )
}

const emptyForm = {
  name: '',
  code: '',
  fssaiLicenseNumber: '',
  fssaiLicenseExpiry: '',
  gstNumber: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  state: '',
  city: '',
  pincode: '',
  categories: '',
  approvalStatus: 'pending',
  approvalDate: '',
  approvalNotes: '',
  rating: '',
  notes: '',
  isActive: 'true',
}

export function SupplierList({ workspaceId }: SupplierListProps) {
  const [search, setSearch] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<FmcgSupplierRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetSuppliersQuery({
    workspaceId,
    page,
    limit: 20,
    search: search || undefined,
    approvalStatus: approvalFilter || undefined,
  })

  const [createSupplier, { isLoading: creating }] = useCreateSupplierMutation()
  const [updateSupplier, { isLoading: updating }] = useUpdateSupplierMutation()
  const [deleteSupplier, { isLoading: deleting }] = useDeleteSupplierMutation()

  const suppliers = data?.suppliers || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingSupplier(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(supplier: FmcgSupplierRecord) {
    setEditingSupplier(supplier)
    setForm({
      name: supplier.name,
      code: supplier.code || '',
      fssaiLicenseNumber: supplier.fssaiLicenseNumber || '',
      fssaiLicenseExpiry: supplier.fssaiLicenseExpiry ? supplier.fssaiLicenseExpiry.split('T')[0] : '',
      gstNumber: supplier.gstNumber || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      state: supplier.state || '',
      city: supplier.city || '',
      pincode: supplier.pincode || '',
      categories: supplier.categories?.join(', ') || '',
      approvalStatus: supplier.approvalStatus,
      approvalDate: supplier.approvalDate ? supplier.approvalDate.split('T')[0] : '',
      approvalNotes: supplier.approvalNotes || '',
      rating: supplier.rating?.toString() || '',
      notes: supplier.notes || '',
      isActive: supplier.isActive ? 'true' : 'false',
    })
    setSheetOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = {
      workspaceId,
      name: form.name,
      code: form.code || undefined,
      fssaiLicenseNumber: form.fssaiLicenseNumber || undefined,
      fssaiLicenseExpiry: form.fssaiLicenseExpiry || undefined,
      gstNumber: form.gstNumber || undefined,
      contactPerson: form.contactPerson || undefined,
      phone: form.phone || undefined,
      email: form.email || undefined,
      address: form.address || undefined,
      state: form.state || undefined,
      city: form.city || undefined,
      pincode: form.pincode || undefined,
      categories: form.categories
        ? form.categories.split(',').map(c => c.trim()).filter(Boolean)
        : [],
      approvalStatus: form.approvalStatus,
      approvalDate: form.approvalDate || undefined,
      approvalNotes: form.approvalNotes || undefined,
      rating: form.rating ? parseInt(form.rating) : undefined,
      notes: form.notes || undefined,
      isActive: form.isActive === 'true',
    }

    try {
      if (editingSupplier) {
        await updateSupplier({ id: editingSupplier._id, ...payload }).unwrap()
        toast.success('Supplier updated successfully')
      } else {
        await createSupplier(payload).unwrap()
        toast.success('Supplier created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save supplier')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteSupplier({ id: deleteId, workspaceId }).unwrap()
      toast.success('Supplier deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete supplier')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search suppliers..."
              className="pl-8"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <Select value={approvalFilter || 'all'} onValueChange={v => { setApprovalFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Approval Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {APPROVAL_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Supplier
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>FSSAI License No</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Contact Person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Approval Status</TableHead>
              <TableHead>Rating</TableHead>
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
            ) : suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No suppliers found.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map(supplier => (
                <TableRow key={supplier._id}>
                  <TableCell className="font-medium">{supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">{supplier.code || '—'}</TableCell>
                  <TableCell className="font-mono text-sm">{supplier.fssaiLicenseNumber || '—'}</TableCell>
                  <TableCell>{supplier.state || '—'}</TableCell>
                  <TableCell>{supplier.contactPerson || '—'}</TableCell>
                  <TableCell>{supplier.phone || '—'}</TableCell>
                  <TableCell>
                    <Badge className={approvalBadgeClass(supplier.approvalStatus)}>
                      {supplier.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>{renderStars(supplier.rating)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(supplier)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(supplier._id)}
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
          <span>Showing {suppliers.length} of {pagination.total} suppliers</span>
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
            <SheetTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  required
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Supplier Code</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fssaiLicenseNumber">FSSAI License Number</Label>
                <Input
                  id="fssaiLicenseNumber"
                  value={form.fssaiLicenseNumber}
                  onChange={e => setForm(p => ({ ...p, fssaiLicenseNumber: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fssaiLicenseExpiry">FSSAI License Expiry</Label>
                <Input
                  id="fssaiLicenseExpiry"
                  type="date"
                  value={form.fssaiLicenseExpiry}
                  onChange={e => setForm(p => ({ ...p, fssaiLicenseExpiry: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={form.gstNumber}
                onChange={e => setForm(p => ({ ...p, gstNumber: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={form.contactPerson}
                  onChange={e => setForm(p => ({ ...p, contactPerson: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                  maxLength={20}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={form.address}
                onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                rows={2}
                maxLength={500}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  value={form.pincode}
                  onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="categories">Categories (comma-separated)</Label>
              <Input
                id="categories"
                placeholder="e.g. Spices, Oils, Grains"
                value={form.categories}
                onChange={e => setForm(p => ({ ...p, categories: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Approval Status</Label>
                <Select value={form.approvalStatus} onValueChange={v => setForm(p => ({ ...p, approvalStatus: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {APPROVAL_STATUSES.map(s => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="approvalDate">Approval Date</Label>
                <Input
                  id="approvalDate"
                  type="date"
                  value={form.approvalDate}
                  onChange={e => setForm(p => ({ ...p, approvalDate: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="approvalNotes">Approval Notes</Label>
              <Textarea
                id="approvalNotes"
                value={form.approvalNotes}
                onChange={e => setForm(p => ({ ...p, approvalNotes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Rating</Label>
                <Select value={form.rating || 'none'} onValueChange={v => setForm(p => ({ ...p, rating: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No rating</SelectItem>
                    {[1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={n.toString()}>{n} Star{n > 1 ? 's' : ''}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Active Status</Label>
                <Select value={form.isActive} onValueChange={v => setForm(p => ({ ...p, isActive: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this supplier record. This action cannot be undone.
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
