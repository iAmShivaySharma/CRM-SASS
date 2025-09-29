'use client'

import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { useGetContactsQuery } from '@/lib/api/contactsApi'
import { ContactList } from '@/components/contacts/ContactList'
import { ContactForm } from '@/components/contacts/ContactForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Search, Filter } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function ContactsPage() {
  const currentWorkspace = useSelector(
    (state: RootState) => state.workspace.currentWorkspace
  )
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [page, setPage] = useState(1)

  const {
    data: contactsData,
    isLoading,
    error,
    refetch,
  } = useGetContactsQuery(
    {
      workspaceId: currentWorkspace?.id || '',
      page,
      limit: 20,
      search: searchTerm || undefined,
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      priority: priorityFilter || undefined,
    },
    {
      skip: !currentWorkspace?.id,
      refetchOnMountOrArgChange: true,
    }
  )

  const handleCreateSuccess = () => {
    setIsCreateDialogOpen(false)
    refetch()
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setPage(1) // Reset to first page when searching
  }

  const handleFilterChange = (filterType: string, value: string) => {
    // Convert "all" values to empty string for API filtering
    const filterValue = value === 'all' ? '' : value

    switch (filterType) {
      case 'status':
        setStatusFilter(filterValue)
        break
      case 'category':
        setCategoryFilter(filterValue)
        break
      case 'priority':
        setPriorityFilter(filterValue)
        break
    }
    setPage(1) // Reset to first page when filtering
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setCategoryFilter('')
    setPriorityFilter('')
    setPage(1)
  }

  if (!currentWorkspace) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">
          Please select a workspace to view contacts.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground">
            Manage your business contacts and relationships
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Contact</DialogTitle>
            </DialogHeader>
            <ContactForm
              workspaceId={currentWorkspace.id}
              onSuccess={handleCreateSuccess}
              onCancel={() => setIsCreateDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      {contactsData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {contactsData.pagination.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Contacts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  contactsData.contacts.filter(c => c.status === 'active')
                    .length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  contactsData.contacts.filter(c => c.category === 'client')
                    .length
                }
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Prospects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  contactsData.contacts.filter(c => c.category === 'prospect')
                    .length
                }
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4 md:flex-row md:space-x-4 md:space-y-0">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts by name, email, company..."
                  value={searchTerm}
                  onChange={e => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={statusFilter || 'all'}
              onValueChange={value => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={categoryFilter || 'all'}
              onValueChange={value => handleFilterChange('category', value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="client">Client</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={priorityFilter || 'all'}
              onValueChange={value => handleFilterChange('priority', value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            {(searchTerm ||
              statusFilter ||
              categoryFilter ||
              priorityFilter) && (
              <Button variant="outline" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>

          {/* Active Filters Display */}
          {(searchTerm || statusFilter || categoryFilter || priorityFilter) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary">Search: {searchTerm}</Badge>
              )}
              {statusFilter && (
                <Badge variant="secondary">Status: {statusFilter}</Badge>
              )}
              {categoryFilter && (
                <Badge variant="secondary">Category: {categoryFilter}</Badge>
              )}
              {priorityFilter && (
                <Badge variant="secondary">Priority: {priorityFilter}</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact List */}
      <ContactList
        contactsData={contactsData}
        isLoading={isLoading}
        error={error}
        currentPage={page}
        onPageChange={setPage}
        workspaceId={currentWorkspace.id}
      />
    </div>
  )
}
