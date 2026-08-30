'use client'

import { useState } from 'react'
import { Plus, Edit, Trash2, MoreVertical, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { format, differenceInDays } from 'date-fns'
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
  useGetLicensesQuery,
  useCreateLicenseMutation,
  useUpdateLicenseMutation,
  useDeleteLicenseMutation,
  type FmcgLicenseRecord,
} from '@/lib/api/fmcgApi'

interface FssaiLicenseListProps {
  workspaceId: string
}

const LICENSE_TYPES = ['registration', 'state', 'central']
const LICENSE_STATUSES = ['active', 'expired', 'suspended', 'cancelled', 'renewal_pending']

function statusBadgeClass(status: string) {
  if (status === 'active') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (status === 'expired' || status === 'suspended' || status === 'cancelled') return 'bg-destructive/10 text-destructive hover:bg-destructive/10'
  if (status === 'renewal_pending') return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

function typeBadgeClass(type: string) {
  if (type === 'central') return 'bg-primary/10 text-primary hover:bg-primary/10'
  if (type === 'state') return 'bg-muted text-muted-foreground hover:bg-muted'
  return 'bg-muted text-muted-foreground hover:bg-muted'
}

type LicenseForm = {
  licenseNumber: string
  licenseType: 'registration' | 'state' | 'central'
  category: string
  businessName: string
  businessAddress: string
  state: string
  district: string
  pincode: string
  issueDate: string
  expiryDate: string
  renewalDate: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'renewal_pending'
  documentUrl: string
  remarks: string
}

const emptyForm: LicenseForm = {
  licenseNumber: '',
  licenseType: 'state',
  category: '',
  businessName: '',
  businessAddress: '',
  state: '',
  district: '',
  pincode: '',
  issueDate: '',
  expiryDate: '',
  renewalDate: '',
  status: 'active',
  documentUrl: '',
  remarks: '',
}

export function FssaiLicenseList({ workspaceId }: FssaiLicenseListProps) {
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingLicense, setEditingLicense] = useState<FmcgLicenseRecord | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState<LicenseForm>(emptyForm)
  const [page, setPage] = useState(1)

  const { data, isLoading } = useGetLicensesQuery({
    workspaceId,
    page,
    limit: 20,
    status: statusFilter || undefined,
    licenseType: typeFilter || undefined,
  })

  const [createLicense, { isLoading: creating }] = useCreateLicenseMutation()
  const [updateLicense, { isLoading: updating }] = useUpdateLicenseMutation()
  const [deleteLicense, { isLoading: deleting }] = useDeleteLicenseMutation()

  const licenses = data?.licenses || []
  const pagination = data?.pagination

  function openCreate() {
    setEditingLicense(null)
    setForm(emptyForm)
    setSheetOpen(true)
  }

  function openEdit(license: FmcgLicenseRecord) {
    setEditingLicense(license)
    setForm({
      licenseNumber: license.licenseNumber,
      licenseType: license.licenseType,
      category: license.category || '',
      businessName: license.businessName,
      businessAddress: license.businessAddress,
      state: license.state,
      district: license.district || '',
      pincode: license.pincode || '',
      issueDate: license.issueDate ? license.issueDate.split('T')[0] : '',
      expiryDate: license.expiryDate ? license.expiryDate.split('T')[0] : '',
      renewalDate: license.renewalDate ? license.renewalDate.split('T')[0] : '',
      status: license.status,
      documentUrl: license.documentUrl || '',
      remarks: license.remarks || '',
    })
    setSheetOpen(true)
  }

  function getDaysUntilExpiry(expiryDate: string) {
    if (!expiryDate) return null
    return differenceInDays(new Date(expiryDate), new Date())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      workspaceId,
      licenseNumber: form.licenseNumber,
      licenseType: form.licenseType,
      category: form.category || undefined,
      businessName: form.businessName,
      businessAddress: form.businessAddress,
      state: form.state,
      district: form.district || undefined,
      pincode: form.pincode || undefined,
      issueDate: form.issueDate,
      expiryDate: form.expiryDate,
      renewalDate: form.renewalDate || undefined,
      status: form.status,
      documentUrl: form.documentUrl || undefined,
      remarks: form.remarks || undefined,
    }

    try {
      if (editingLicense) {
        await updateLicense({ id: editingLicense._id, ...payload }).unwrap()
        toast.success('License updated successfully')
      } else {
        await createLicense(payload).unwrap()
        toast.success('License created successfully')
      }
      setSheetOpen(false)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to save license')
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteLicense({ id: deleteId, workspaceId }).unwrap()
      toast.success('License deleted successfully')
      setDeleteId(null)
    } catch (err: any) {
      toast.error(err?.data?.message || 'Failed to delete license')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2">
          <Select value={typeFilter || 'all'} onValueChange={v => { setTypeFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="License Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {LICENSE_TYPES.map(t => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1) }}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {LICENSE_STATUSES.map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add License
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>License Number</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Business Name</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Issue Date</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Days Until Expiry</TableHead>
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
            ) : licenses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                  No licenses found.
                </TableCell>
              </TableRow>
            ) : (
              licenses.map(license => {
                const daysLeft = getDaysUntilExpiry(license.expiryDate)
                return (
                  <TableRow key={license._id}>
                    <TableCell className="font-mono font-medium">{license.licenseNumber}</TableCell>
                    <TableCell>
                      <Badge className={typeBadgeClass(license.licenseType)}>
                        {license.licenseType}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{license.businessName}</TableCell>
                    <TableCell>{license.state}</TableCell>
                    <TableCell>{license.issueDate ? format(new Date(license.issueDate), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>{license.expiryDate ? format(new Date(license.expiryDate), 'dd MMM yyyy') : '—'}</TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(license.status)}>
                        {license.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {daysLeft !== null ? (
                        <span className={`flex items-center gap-1 text-sm font-medium ${daysLeft < 90 && daysLeft > 0 ? 'text-yellow-600' : daysLeft <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {daysLeft < 90 && daysLeft > 0 && <AlertTriangle className="h-3 w-3" />}
                          {daysLeft <= 0 ? 'Expired' : `${daysLeft}d`}
                        </span>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(license)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(license._id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {licenses.length} of {pagination.total} licenses</span>
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
            <SheetTitle>{editingLicense ? 'Edit License' : 'Add FSSAI License'}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber">License Number *</Label>
                <Input
                  id="licenseNumber"
                  value={form.licenseNumber}
                  onChange={e => setForm(p => ({ ...p, licenseNumber: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>License Type *</Label>
                <Select value={form.licenseType} onValueChange={v => setForm(p => ({ ...p, licenseType: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LICENSE_TYPES.map(t => (
                      <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="category">Food Business Category</Label>
              <Input
                id="category"
                value={form.category}
                onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={e => setForm(p => ({ ...p, businessName: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessAddress">Business Address *</Label>
              <Textarea
                id="businessAddress"
                value={form.businessAddress}
                onChange={e => setForm(p => ({ ...p, businessAddress: e.target.value }))}
                rows={2}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="state">State *</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={form.district}
                  onChange={e => setForm(p => ({ ...p, district: e.target.value }))}
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="issueDate">Issue Date *</Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={form.issueDate}
                  onChange={e => setForm(p => ({ ...p, issueDate: e.target.value }))}
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
              <Label htmlFor="renewalDate">Last Renewal Date</Label>
              <Input
                id="renewalDate"
                type="date"
                value={form.renewalDate}
                onChange={e => setForm(p => ({ ...p, renewalDate: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LICENSE_STATUSES.map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="documentUrl">Document URL</Label>
              <Input
                id="documentUrl"
                type="url"
                value={form.documentUrl}
                onChange={e => setForm(p => ({ ...p, documentUrl: e.target.value }))}
                placeholder="https://..."
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={form.remarks}
                onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {(creating || updating) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingLicense ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={open => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete License</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this FSSAI license record. This action cannot be undone.
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
