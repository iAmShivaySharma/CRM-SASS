'use client'

import { useState, useRef } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  UserPlus,
  Download,
  Upload,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { useAppSelector } from '@/lib/hooks'
import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'
import {
  useGetLeadsQuery,
  useDeleteLeadMutation,
  useGetLeadStatusesQuery,
  useBulkDeleteLeadsMutation,
  useImportLeadsMutation,
} from '@/lib/api/mongoApi'
import { useConvertLeadToContactMutation } from '@/lib/api/contactsApi'
import { LeadDetailsSheet } from './LeadDetailsSheet'
import { LeadForm } from './LeadForm'

export function LeadList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const {
    data: leadsData,
    isLoading,
    error,
    refetch,
  } = useGetLeadsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    },
    { skip: !currentWorkspace?.id }
  )
  const { data: statusesData, isLoading: loadingStatuses } =
    useGetLeadStatusesQuery(currentWorkspace?.id || '', {
      skip: !currentWorkspace?.id,
    })
  const [deleteLead] = useDeleteLeadMutation()
  const [bulkDeleteLeads, { isLoading: isBulkDeleting }] =
    useBulkDeleteLeadsMutation()
  const [importLeads, { isLoading: isImporting }] = useImportLeadsMutation()
  const [convertLeadToContact] = useConvertLeadToContactMutation()

  const leads = leadsData?.leads || []
  const leadStatuses = statusesData?.statuses || []

  const handleDelete = async (id: string) => {
    if (!currentWorkspace?.id) return

    try {
      await deleteLead({ id, workspaceId: currentWorkspace.id }).unwrap()
      toast.success('Lead deleted successfully')
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
    }
  }

  const handleViewDetails = (lead: any) => {
    setSelectedLead(lead)
    setIsDetailsOpen(true)
  }

  const handleLeadUpdate = (updatedLead: any) => {
    setSelectedLead(updatedLead)
    refetch()
  }

  const handleConvertToContact = async (lead: any) => {
    if (!currentWorkspace?.id) return

    try {
      await convertLeadToContact({
        leadId: lead.id,
        workspaceId: currentWorkspace.id,
      }).unwrap()

      toast.success(`Lead "${lead.name}" successfully converted to contact!`)
    } catch (error: any) {
      console.error('Error converting lead to contact:', error)
      if (error.data?.message) {
        toast.error(error.data.message)
      } else {
        toast.error('Failed to convert lead to contact')
      }
    }
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredLeads.map(l => l.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    setSelectedIds(next)
  }

  const handleBulkDelete = async () => {
    if (!currentWorkspace?.id || selectedIds.size === 0) return

    try {
      const result = await bulkDeleteLeads({
        ids: Array.from(selectedIds),
        workspaceId: currentWorkspace.id,
      }).unwrap()

      toast.success(result.message)
      setSelectedIds(new Set())
      setShowBulkDeleteConfirm(false)
    } catch (error) {
      console.error('Error bulk deleting leads:', error)
      toast.error('Failed to delete leads')
    }
  }

  const handleExport = async (format: 'xlsx' | 'csv') => {
    if (!currentWorkspace?.id) return

    setIsExporting(true)
    try {
      const res = await fetch(
        `/api/leads/export?workspaceId=${currentWorkspace.id}&format=${format}`,
        { credentials: 'include' }
      )

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `leads-${Date.now()}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Leads exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export leads')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentWorkspace?.id) return

    const formData = new FormData()
    formData.append('file', file)
    formData.append('workspaceId', currentWorkspace.id)

    try {
      const result = await importLeads(formData).unwrap()
      toast.success(result.message)
      if (result.errors && result.errors.length > 0) {
        toast.warning(`${result.errors.length} row(s) had errors`, {
          description: result.errors.slice(0, 3).join('\n'),
          duration: 8000,
        })
      }
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error?.data?.error || 'Failed to import leads')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const filteredLeads = leads.filter(lead => {
    if (!searchTerm) return true
    return (
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (lead.email &&
        lead.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (lead.company &&
        lead.company.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })

  const allSelected =
    filteredLeads.length > 0 && selectedIds.size === filteredLeads.length

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex-1">
            <div className="h-10 animate-pulse rounded-md bg-muted"></div>
          </div>
          <div className="h-10 w-32 animate-pulse rounded-md bg-muted"></div>
          <div className="h-10 w-32 animate-pulse rounded-md bg-muted"></div>
        </div>
        <TableSkeleton rows={8} columns={6} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center">
        <p className="text-red-600 dark:text-red-400">
          Error loading leads. Please try again.
        </p>
        <Button onClick={() => refetch()} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
            Leads
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Manage your sales leads and prospects
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Import
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isExporting}>
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('xlsx')}>
                Export as Excel (.xlsx)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV (.csv)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Lead
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Lead</DialogTitle>
                <DialogDescription>
                  Add a new lead to your sales pipeline.
                </DialogDescription>
              </DialogHeader>
              <LeadForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.size} lead(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowBulkDeleteConfirm(true)}
            disabled={isBulkDeleting}
          >
            {isBulkDeleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete Selected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear Selection
          </Button>
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <div className="flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <CardTitle>All Leads ({filteredLeads.length})</CardTitle>
            <div className="flex flex-col items-start space-y-2 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {loadingStatuses ? (
                    <SelectItem value="loading" disabled>
                      Loading statuses...
                    </SelectItem>
                  ) : leadStatuses.length > 0 ? (
                    leadStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span>{status.name}</span>
                        </div>
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-status" disabled>
                      No statuses available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredLeads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-500">
                No leads found. Create your first lead to get started.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map(lead => (
                  <TableRow
                    key={lead.id}
                    className={
                      selectedIds.has(lead.id) ? 'bg-muted/50' : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(lead.id)}
                        onCheckedChange={checked =>
                          handleSelectOne(lead.id, !!checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.email || '-'}</TableCell>
                    <TableCell>{lead.company || '-'}</TableCell>
                    <TableCell>
                      {lead.statusId && typeof lead.statusId === 'object' ? (
                        <Badge
                          variant="secondary"
                          style={{
                            backgroundColor: lead.statusId.color + '20',
                            color: lead.statusId.color,
                          }}
                        >
                          {lead.statusId.name}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {lead.status || 'No Status'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lead.tagIds &&
                        Array.isArray(lead.tagIds) &&
                        lead.tagIds.length > 0 ? (
                          lead.tagIds.slice(0, 2).map((tag: any) => (
                            <Badge
                              key={tag.id || tag._id || tag.name}
                              variant="outline"
                              className="text-xs"
                              style={{
                                borderColor: tag.color,
                                color: tag.color,
                              }}
                            >
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            -
                          </span>
                        )}
                        {lead.tagIds && lead.tagIds.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{lead.tagIds.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.assignedTo &&
                      typeof lead.assignedTo === 'object' ? (
                        <div className="flex items-center space-x-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                            {lead.assignedTo.fullName?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm">
                            {lead.assignedTo.fullName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleViewDetails(lead)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View & Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleConvertToContact(lead)}
                            className="text-green-600"
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Convert to Contact
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(lead.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog
        open={showBulkDeleteConfirm}
        onOpenChange={setShowBulkDeleteConfirm}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} lead(s)?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              selected leads from your workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <LeadDetailsSheet
        lead={selectedLead}
        open={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false)
          setSelectedLead(null)
        }}
        onDelete={handleDelete}
        onUpdate={handleLeadUpdate}
      />
    </div>
  )
}
