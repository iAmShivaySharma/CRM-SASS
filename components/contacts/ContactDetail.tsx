'use client'

import { Contact } from '@/lib/api/contactsApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Edit,
  Mail,
  Phone,
  Building,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Globe,
  Linkedin,
  Twitter,
  FileText,
  Tag,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ContactDetailProps {
  contact: Contact
  workspaceId: string
  onEdit: () => void
  onClose: () => void
}

export function ContactDetail({
  contact,
  workspaceId,
  onEdit,
  onClose,
}: ContactDetailProps) {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-lg text-primary-foreground">
              {getInitials(contact.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-2xl font-bold">{contact.name}</h2>
            <div className="mt-1 flex items-center space-x-2">
              <Badge className={getStatusColor(contact.status)}>
                {contact.status}
              </Badge>
              <Badge className={getCategoryColor(contact.category)}>
                {contact.category}
              </Badge>
              <Badge className={getPriorityColor(contact.priority)}>
                {contact.priority}
              </Badge>
              {contact.convertedFromLead && (
                <Badge variant="outline">From Lead</Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.email && (
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{contact.phone}</span>
              </div>
            )}
            {contact.company && (
              <div className="flex items-center space-x-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{contact.company}</span>
                {contact.position && (
                  <span className="text-muted-foreground">
                    • {contact.position}
                  </span>
                )}
              </div>
            )}
            {contact.fullAddress && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{contact.fullAddress}</span>
              </div>
            )}
            {contact.website && (
              <div className="flex items-center space-x-3">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {contact.website}
                </a>
              </div>
            )}
            {contact.linkedIn && (
              <div className="flex items-center space-x-3">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.linkedIn}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn Profile
                </a>
              </div>
            )}
            {contact.twitter && (
              <div className="flex items-center space-x-3">
                <Twitter className="h-4 w-4 text-muted-foreground" />
                <a
                  href={contact.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Twitter Profile
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <DollarSign className="mr-2 h-5 w-5" />
              Business Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contact.totalRevenue && contact.totalRevenue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Revenue</span>
                <span className="font-medium text-green-600">
                  ${contact.totalRevenue.toLocaleString()}
                </span>
              </div>
            )}
            {contact.totalPayments && contact.totalPayments > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Total Payments</span>
                <span className="font-medium">
                  ${contact.totalPayments.toLocaleString()}
                </span>
              </div>
            )}
            {contact.totalMilestoneValue && contact.totalMilestoneValue > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Milestone Value</span>
                <span className="font-medium text-blue-600">
                  ${contact.totalMilestoneValue.toLocaleString()}
                </span>
              </div>
            )}
            {contact.assignedTo && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Assigned To</span>
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                    {contact.assignedTo.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span>{contact.assignedTo.fullName}</span>
                </div>
              </div>
            )}
            {contact.accountManager && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Account Manager</span>
                <div className="flex items-center space-x-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                    {contact.accountManager.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span>{contact.accountManager.fullName}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tags */}
        {contact.tagIds && contact.tagIds.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Tag className="mr-2 h-5 w-5" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {contact.tagIds.map(tag => (
                  <Badge
                    key={tag._id}
                    variant="outline"
                    style={{ borderColor: tag.color, color: tag.color }}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Fields */}
        {contact.customData && Object.keys(contact.customData).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Custom Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(contact.customData).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="capitalize text-muted-foreground">
                    {key}
                  </span>
                  <span className="font-medium">{String(value)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {contact.notes && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <FileText className="mr-2 h-5 w-5" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">
                {contact.notes}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dates */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <Calendar className="mr-2 h-5 w-5" />
              Important Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>
                {formatDistanceToNow(new Date(contact.createdAt))} ago
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Last Updated</span>
              <span>
                {formatDistanceToNow(new Date(contact.updatedAt))} ago
              </span>
            </div>
            {contact.lastContactDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Last Contact</span>
                <span>
                  {new Date(contact.lastContactDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {contact.nextFollowUpDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Next Follow-up</span>
                <span>
                  {new Date(contact.nextFollowUpDate).toLocaleDateString()}
                </span>
              </div>
            )}
            {contact.leadConversionDate && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Converted from Lead
                </span>
                <span>
                  {new Date(contact.leadConversionDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
