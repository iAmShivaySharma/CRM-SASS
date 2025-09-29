'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Eye,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { LeadForm } from './LeadForm'
import { LeadDetailsSheet } from './LeadDetailsSheet'
import { TableSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'
import {
  useGetLeadsQuery,
  useDeleteLeadMutation,
  useGetLeadStatusesQuery,
} from '@/lib/api/mongoApi'
import { useConvertLeadToContactMutation } from '@/lib/api/contactsApi'

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  contacted:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  qualified:
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  proposal:
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  negotiation:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  closed_won:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300',
  closed_lost: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
}

export function LeadList() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<any>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  // RTK Query hooks
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
    // Update the selected lead with the new data
    setSelectedLead(updatedLead)
    // Trigger a refetch to update the list
    refetch()
  }

  const handleConvertToContact = async (lead: any) => {
    if (!currentWorkspace?.id) return

    try {
      const result = await convertLeadToContact({
        leadId: lead.id,
        workspaceId: currentWorkspace.id,
      }).unwrap()

      toast.success(`Lead "${lead.name}" successfully converted to contact!`)
      // Optionally redirect to contacts page or show contact details
      // router.push('/contacts');
    } catch (error: any) {
      console.error('Error converting lead to contact:', error)
      if (error.data?.message) {
        toast.error(error.data.message)
      } else {
        toast.error('Failed to convert lead to contact')
      }
    }
  }

  // Since we're filtering on the server side via RTK Query, we don't need client-side filtering
  // But we'll keep search filtering for immediate feedback
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
                  <TableRow key={lead.id}>
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
                              key={tag.id || tag._id}
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

      {/* Lead Creation Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>
              Add a new lead to your workspace
            </DialogDescription>
          </DialogHeader>
          <LeadForm onSuccess={() => setIsCreateOpen(false)} />
        </DialogContent>
      </Dialog>

      {/* Lead Details Sheet */}
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
