'use client'

import { useState } from 'react'
import {
  ContactsListResponse,
  Contact,
  useDeleteContactMutation,
} from '@/lib/api/contactsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { ContactForm } from './ContactForm'
import { ContactDetail } from './ContactDetail'
import {
  Edit,
  Trash2,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  User,
  ChevronLeft,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'

interface ContactListProps {
  contactsData?: ContactsListResponse
  isLoading: boolean
  error: any
  currentPage: number
  onPageChange: (page: number) => void
  workspaceId: string
}

export function ContactList({
  contactsData,
  isLoading,
  error,
  currentPage,
  onPageChange,
  workspaceId,
}: ContactListProps) {
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)
  const [deletingContact, setDeletingContact] = useState<Contact | null>(null)

  const [deleteContact] = useDeleteContactMutation()

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact)
  }

  const handleView = (contact: Contact) => {
    setViewingContact(contact)
  }

  const handleDelete = async (contact: Contact) => {
    try {
      await deleteContact({ id: contact._id, workspaceId }).unwrap()
      toast.success('Contact deleted successfully')
      setDeletingContact(null)
    } catch (error) {
      console.error('Failed to delete contact:', error)
      toast.error('Failed to delete contact')
    }
  }

  const handleEditSuccess = () => {
    setEditingContact(null)
    toast.success('Contact updated successfully')
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
      case 'archived':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'client':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'prospect':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'partner':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300'
      case 'vendor':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex h-32 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading contacts: {error.message || 'Unknown error'}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!contactsData || contactsData.contacts.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            <User className="mx-auto mb-4 h-12 w-12" />
            <p className="text-lg font-medium">No contacts found</p>
            <p className="text-sm">Create your first contact to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contactsData.pagination.total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {contactsData.contacts.map(contact => (
              <div
                key={contact._id}
                className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
              >
                <div className="flex flex-1 items-center space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(contact.name)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center space-x-2">
                      <h3 className="truncate font-medium">{contact.name}</h3>
                      {contact.convertedFromLead && (
                        <Badge variant="outline" className="text-xs">
                          From Lead
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      {contact.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-3 w-3" />
                          <span className="max-w-[200px] truncate">
                            {contact.email}
                          </span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-3 w-3" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                      {contact.company && (
                        <div className="flex items-center space-x-1">
                          <Building className="h-3 w-3" />
                          <span className="max-w-[150px] truncate">
                            {contact.company}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="mt-2 flex items-center space-x-2">
                      <Badge className={getStatusColor(contact.status)}>
                        {contact.status}
                      </Badge>
                      <Badge className={getCategoryColor(contact.category)}>
                        {contact.category}
                      </Badge>
                      <Badge className={getPriorityColor(contact.priority)}>
                        {contact.priority}
                      </Badge>
                      {contact.totalRevenue && contact.totalRevenue > 0 && (
                        <Badge variant="outline" className="text-green-600">
                          <DollarSign className="mr-1 h-3 w-3" />$
                          {contact.totalRevenue.toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="text-right text-xs text-muted-foreground">
                    <div>
                      Created {formatDistanceToNow(new Date(contact.createdAt))}{' '}
                      ago
                    </div>
                    {contact.assignedTo && (
                      <div>Assigned to {contact.assignedTo.fullName}</div>
                    )}
                  </div>

                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(contact)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(contact)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingContact(contact)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {contactsData.pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * 20 + 1} to{' '}
                {Math.min(currentPage * 20, contactsData.pagination.total)} of{' '}
                {contactsData.pagination.total} contacts
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {contactsData.pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage === contactsData.pagination.pages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Contact Dialog */}
      <Dialog
        open={!!editingContact}
        onOpenChange={() => setEditingContact(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {editingContact && (
            <ContactForm
              workspaceId={workspaceId}
              contact={editingContact}
              onSuccess={handleEditSuccess}
              onCancel={() => setEditingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Contact Dialog */}
      <Dialog
        open={!!viewingContact}
        onOpenChange={() => setViewingContact(null)}
      >
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
          </DialogHeader>
          {viewingContact && (
            <ContactDetail
              contact={viewingContact}
              workspaceId={workspaceId}
              onEdit={() => {
                setViewingContact(null)
                setEditingContact(viewingContact)
              }}
              onClose={() => setViewingContact(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingContact}
        onOpenChange={() => setDeletingContact(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingContact?.name}
              &quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingContact && handleDelete(deletingContact)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
