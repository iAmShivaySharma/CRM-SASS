/**
 * @deprecated This component uses direct fetch calls and should be replaced with
 * the LeadList component that uses RTK Query for better caching and state management.
 */
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Filter,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Phone,
  Mail,
  Building,
  User,
  Calendar,
  DollarSign,
  Tag as TagIcon,
  MessageSquare,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import { LeadForm } from './LeadForm'
import { cn } from '@/lib/utils'
import { useWorkspaceFormatting } from '@/lib/utils/workspace-formatting'

interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status: string
  statusId?: string
  source: string
  value: number
  priority: 'low' | 'medium' | 'high'
  assignedTo?: {
    id: string
    fullName: string
    email: string
  }
  tagIds: Array<{
    id: string
    name: string
    color: string
  }>
  nextFollowUpAt?: string
  lastContactedAt?: string
  createdAt: string
  updatedAt: string
  createdBy: {
    id: string
    fullName: string
  }
}

interface LeadsResponse {
  success: boolean
  leads: Lead[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

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

const priorityColors = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  medium:
    'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export function EnhancedLeadList() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(1)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assignedToFilter, setAssignedToFilter] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false)
  const [noteContent, setNoteContent] = useState('')
  const [noteType, setNoteType] = useState<
    'note' | 'call' | 'email' | 'meeting' | 'task'
  >('note')

  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { formatCurrency, formatDate, getTimeAgo } = useWorkspaceFormatting()
  const observerRef = useRef<IntersectionObserver>()
  const lastLeadElementRef = useRef<HTMLTableRowElement>()

  const fetchLeads = useCallback(
    async (pageNum: number, reset = false) => {
      if (!currentWorkspace?.id) return

      setLoading(true)
      try {
        const params = new URLSearchParams({
          workspaceId: currentWorkspace.id,
          page: pageNum.toString(),
          limit: '20',
        })

        if (searchTerm) params.append('search', searchTerm)
        if (statusFilter && statusFilter !== 'all')
          params.append('status', statusFilter)
        if (priorityFilter && priorityFilter !== 'all')
          params.append('priority', priorityFilter)
        if (assignedToFilter) params.append('assignedTo', assignedToFilter)

        const response = await fetch(`/api/leads?${params}`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error('Failed to fetch leads')
        }

        const data: LeadsResponse = await response.json()

        if (reset) {
          setLeads(data.leads)
        } else {
          setLeads(prev => [...prev, ...data.leads])
        }

        setHasMore(data.pagination.hasNext)
        setPage(pageNum)
      } catch (error) {
        console.error('Error fetching leads:', error)
        toast.error('Failed to fetch leads')
      } finally {
        setLoading(false)
      }
    },
    [
      currentWorkspace?.id,
      searchTerm,
      statusFilter,
      priorityFilter,
      assignedToFilter,
    ]
  )

  // Infinite scroll callback
  const lastLeadElementCallback = useCallback(
    (node: HTMLTableRowElement) => {
      if (loading) return
      if (observerRef.current) observerRef.current.disconnect()

      observerRef.current = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting && hasMore) {
          fetchLeads(page + 1)
        }
      })

      if (node) observerRef.current.observe(node)
    },
    [loading, hasMore, page, fetchLeads]
  )

  // Initial load and filter changes
  useEffect(() => {
    fetchLeads(1, true)
  }, [searchTerm, statusFilter, priorityFilter, assignedToFilter, fetchLeads])

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to delete lead')
      }

      setLeads(prev => prev.filter(lead => lead.id !== id))
      toast.success('Lead deleted successfully')
    } catch (error) {
      console.error('Error deleting lead:', error)
      toast.error('Failed to delete lead')
    }
  }

  const handleAddNote = async () => {
    if (!selectedLead || !noteContent.trim()) return

    try {
      const response = await fetch(`/api/leads/${selectedLead.id}/notes`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: noteContent,
          type: noteType,
          isPrivate: false,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to add note')
      }

      toast.success('Note added successfully')
      setNoteContent('')
      setIsNoteDialogOpen(false)
    } catch (error) {
      console.error('Error adding note:', error)
      toast.error('Failed to add note')
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'low':
        return <CheckCircle className="h-4 w-4 text-gray-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Leads</h1>
          <p className="text-muted-foreground">
            Manage your sales leads and prospects
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                setStatusFilter('')
                setPriorityFilter('')
                setAssignedToFilter('')
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead, index) => {
                const isLast = index === leads.length - 1
                return (
                  <TableRow
                    key={lead.id}
                    ref={isLast ? lastLeadElementCallback : undefined}
                    className="hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{lead.name}</div>
                        {lead.company && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Building className="mr-1 h-3 w-3" />
                            {lead.company}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {lead.email && (
                          <div className="flex items-center text-sm">
                            <Mail className="mr-1 h-3 w-3" />
                            {lead.email}
                          </div>
                        )}
                        {lead.phone && (
                          <div className="flex items-center text-sm">
                            <Phone className="mr-1 h-3 w-3" />
                            {lead.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          statusColors[lead.status as keyof typeof statusColors]
                        )}
                      >
                        {lead.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {getPriorityIcon(lead.priority)}
                        <Badge className={cn(priorityColors[lead.priority])}>
                          {lead.priority}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {formatCurrency(lead.value)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {lead.tagIds.map(tag => (
                          <Badge
                            key={tag.id}
                            variant="outline"
                            style={{ borderColor: tag.color, color: tag.color }}
                          >
                            {tag.name}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {lead.assignedTo ? (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
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
                      <div className="text-sm">
                        {formatDate(lead.createdAt)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        by {lead.createdBy.fullName}
                      </div>
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
                            onClick={() => {
                              setSelectedLead(lead)
                              setIsViewOpen(true)
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedLead(lead)
                              setIsNoteDialogOpen(true)
                            }}
                          >
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Add Note
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(lead.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {loading && (
            <div className="space-y-3 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex space-x-4">
                  <div className="h-8 w-8 animate-pulse rounded bg-muted"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted"></div>
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted"></div>
                  </div>
                  <div className="h-8 w-16 animate-pulse rounded bg-muted"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && leads.length === 0 && (
            <div className="py-8 text-center">
              <p className="text-muted-foreground">
                No leads found. Create your first lead to get started.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Lead Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Lead</DialogTitle>
            <DialogDescription>
              Add a new lead to your pipeline
            </DialogDescription>
          </DialogHeader>
          <LeadForm
            onSuccess={() => {
              setIsCreateOpen(false)
              fetchLeads(1, true)
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Add Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Note</DialogTitle>
            <DialogDescription>
              Add a note for {selectedLead?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="note-type">Note Type</Label>
              <Select
                value={noteType}
                onValueChange={(value: any) => setNoteType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="note">General Note</SelectItem>
                  <SelectItem value="call">Phone Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="task">Task</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="note-content">Content</Label>
              <Textarea
                id="note-content"
                placeholder="Enter your note here..."
                value={noteContent}
                onChange={e => setNoteContent(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsNoteDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddNote} disabled={!noteContent.trim()}>
                Add Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
