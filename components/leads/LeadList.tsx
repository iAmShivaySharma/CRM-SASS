'use client'

import { useState, useRef } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  Mail,
  MessageCircle,
  Phone,
  UserPlus,
  Download,
  Upload,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  X,
  ArrowUpDown,
  Calendar,
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
  useGetWorkspaceMembersQuery,
  useGetTagsQuery,
} from '@/lib/api/mongoApi'
import { useConvertLeadToContactMutation } from '@/lib/api/contactsApi'
import { LeadDetailsSheet } from './LeadDetailsSheet'
import { LeadForm } from './LeadForm'

export function LeadList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignedToFilter, setAssignedToFilter] = useState('all')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [tagsFilter, setTagsFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pageSize = 20

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const {
    data: leadsData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetLeadsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      page: currentPage,
      limit: pageSize,
      search: searchTerm || undefined,
      statusId: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
      assignedTo: assignedToFilter !== 'all' ? assignedToFilter : undefined,
      source: sourceFilter !== 'all' ? sourceFilter : undefined,
      tags: tagsFilter !== 'all' ? tagsFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      sortBy,
      sortOrder,
    },
    { skip: !currentWorkspace?.id }
  )
  const { data: statusesData, isLoading: loadingStatuses } =
    useGetLeadStatusesQuery(currentWorkspace?.id || '', {
      skip: !currentWorkspace?.id,
    })
  const [deleteLead, { isLoading: isDeletingLead }] = useDeleteLeadMutation()
  const [bulkDeleteLeads, { isLoading: isBulkDeleting }] =
    useBulkDeleteLeadsMutation()
  const [importLeads, { isLoading: isImporting }] = useImportLeadsMutation()
  const [convertLeadToContact, { isLoading: isConverting }] =
    useConvertLeadToContactMutation()

  const { data: membersData } = useGetWorkspaceMembersQuery(
    currentWorkspace?.id || '',
    { skip: !currentWorkspace?.id }
  )
  const { data: tagsData } = useGetTagsQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })

  const leads = leadsData?.leads || []
  const pagination = leadsData?.pagination
  const leadStatuses = statusesData?.statuses || []
  const members = membersData?.members || []
  const tags = tagsData?.tags || []

  const activeFilterCount = [
    statusFilter !== 'all',
    priorityFilter !== 'all',
    assignedToFilter !== 'all',
    sourceFilter !== 'all',
    tagsFilter !== 'all',
    dateFrom,
    dateTo,
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setStatusFilter('all')
    setPriorityFilter('all')
    setAssignedToFilter('all')
    setSourceFilter('all')
    setTagsFilter('all')
    setDateFrom('')
    setDateTo('')
    setSortBy('createdAt')
    setSortOrder('desc')
    setSearchTerm('')
    setCurrentPage(1)
  }

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
      setSelectedIds(new Set(leads.map(l => l.id)))
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

  const handleDownloadTemplate = () => {
    const headers = [
      'Name',
      'Email',
      'Phone',
      'Company',
      'Source',
      'Priority',
      'Value',
      'Status',
      'Notes',
    ]
    const sampleRows = [
      [
        'John Doe',
        'john@example.com',
        '+1234567890',
        'Acme Inc',
        'website',
        'high',
        '5000',
        'New',
        'Interested in premium plan',
      ],
      [
        'Jane Smith',
        'jane@company.com',
        '+0987654321',
        'Tech Corp',
        'referral',
        'medium',
        '3000',
        '',
        'Follow up next week',
      ],
    ]
    const csvContent = [headers, ...sampleRows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads-import-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Template downloaded')
  }

  const allSelected = leads.length > 0 && selectedIds.size === leads.length

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
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Leads
          </h1>
          <p className="mt-1 text-muted-foreground">
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
          <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Template
          </Button>
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
          {leadStatuses && leadStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Change Status
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {leadStatuses.map((status: any) => (
                  <DropdownMenuItem
                    key={status.id}
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/leads/bulk-update', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            workspaceId: currentWorkspace?.id,
                            leadIds: Array.from(selectedIds),
                            updates: { statusId: status.id },
                          }),
                        })
                        const data = await res.json()
                        if (data.success) {
                          toast.success(`Updated ${data.modifiedCount} leads`)
                          setSelectedIds(new Set())
                        }
                      } catch {
                        toast.error('Failed to update')
                      }
                    }}
                  >
                    <div
                      className="mr-2 h-3 w-3 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    {status.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
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
            <CardTitle>
              All Leads ({pagination?.total ?? leads.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                <Input
                  placeholder="Search leads..."
                  value={searchTerm}
                  onChange={e => {
                    setSearchTerm(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="w-full pl-10"
                />
              </div>
              <Button
                variant={showFilters ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="relative"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-xs text-destructive-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Status
                </span>
                <Select
                  value={statusFilter}
                  onValueChange={val => {
                    setStatusFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {leadStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: status.color }}
                          />
                          <span>{status.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Priority
                </span>
                <Select
                  value={priorityFilter}
                  onValueChange={val => {
                    setPriorityFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Assigned To
                </span>
                <Select
                  value={assignedToFilter}
                  onValueChange={val => {
                    setAssignedToFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Members" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members.map(member => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.user?.fullName ||
                          member.user?.email ||
                          member.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Source
                </span>
                <Select
                  value={sourceFilter}
                  onValueChange={val => {
                    setSourceFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Tags
                </span>
                <Select
                  value={tagsFilter}
                  onValueChange={val => {
                    setTagsFilter(val)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All Tags" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tags</SelectItem>
                    {tags.map(tag => (
                      <SelectItem key={tag.id} value={tag.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  From Date
                </span>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={e => {
                    setDateFrom(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  To Date
                </span>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={e => {
                    setDateTo(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-9"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Sort By
                </span>
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={val => {
                    const [field, order] = val.split('-')
                    setSortBy(field)
                    setSortOrder(order)
                    setCurrentPage(1)
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="name-asc">Name A-Z</SelectItem>
                    <SelectItem value="name-desc">Name Z-A</SelectItem>
                    <SelectItem value="value-desc">Highest Value</SelectItem>
                    <SelectItem value="value-asc">Lowest Value</SelectItem>
                    <SelectItem value="priority-desc">
                      Priority High→Low
                    </SelectItem>
                    <SelectItem value="priority-asc">
                      Priority Low→High
                    </SelectItem>
                    <SelectItem value="nextFollowUpAt-asc">
                      Follow-up Soonest
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {leads.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
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
                  <TableHead>Score</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(lead => (
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
                      {lead.leadScore != null ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              lead.leadScore >= 60
                                ? 'bg-green-500'
                                : lead.leadScore >= 30
                                  ? 'bg-yellow-500'
                                  : 'bg-gray-400'
                            }`}
                          />
                          <span className="text-sm">{lead.leadScore}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {lead.value ? `$${lead.value.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="View"
                          onClick={() => handleViewDetails(lead)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* {lead.email && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={`Email ${lead.email}`}
                            onClick={() =>
                              window.open(`mailto:${lead.email}`, '_blank')
                            }
                          >
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {lead.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={`Call ${lead.phone}`}
                            onClick={() =>
                              window.open(`tel:${lead.phone}`, '_blank')
                            }
                          >
                            <Phone className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                        {lead.phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            title={`WhatsApp ${lead.phone}`}
                            onClick={() => {
                              const num = lead.phone.replace(/[^0-9]/g, '')
                              window.open(`https://wa.me/${num}`, '_blank')
                            }}
                          >
                            <MessageCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )} */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleConvertToContact(lead)}
                              className="text-emerald-600 focus:text-emerald-600 dark:text-emerald-400 dark:focus:text-emerald-400"
                              disabled={isConverting}
                            >
                              {isConverting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <UserPlus className="mr-2 h-4 w-4" />
                              )}
                              Convert to Contact
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(lead.id)}
                              disabled={isDeletingLead}
                            >
                              {isDeletingLead ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="mr-2 h-4 w-4" />
                              )}
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1}-
                {Math.min(currentPage * pageSize, pagination.total)} of{' '}
                {pagination.total} leads
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={!pagination.hasPrev || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={!pagination.hasNext || isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
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
