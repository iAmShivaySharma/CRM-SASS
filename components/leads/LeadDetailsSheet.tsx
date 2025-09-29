'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  User,
  Mail,
  Phone,
  Building,
  DollarSign,
  Calendar,
  Tag,
  FileText,
  Edit,
  Trash2,
  ExternalLink,
  Plus,
  X,
} from 'lucide-react'
import { useAppSelector } from '@/lib/hooks'
import { useWorkspaceFormatting } from '@/lib/utils/workspace-formatting'
import {
  useGetLeadStatusesQuery,
  useGetTagsQuery,
  useUpdateLeadMutation,
  useGetWorkspaceMembersQuery,
} from '@/lib/api/mongoApi'
import { toast } from 'sonner'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import {
  leadUpdateSchema,
  type LeadUpdateData,
  validateCustomFields,
} from '@/lib/validation/leadValidation'
import { LeadActivityHistory } from './LeadActivityHistory'

interface Lead {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  status: string
  statusId?: string
  source: string
  value?: number
  assignedTo?: string
  tags?: string[]
  tagIds?: string[]
  notes?: string
  priority: 'low' | 'medium' | 'high'
  workspaceId: string
  createdBy: string
  createdAt: string
  updatedAt: string
  nextFollowUpAt?: string
  customData?: Record<string, any>
}

interface LeadDetailsSheetProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
  onEdit?: (lead: Lead) => void
  onDelete?: (leadId: string) => void
  onUpdate?: (lead: any) => void
}

export function LeadDetailsSheet({
  lead,
  open,
  onClose,
  onEdit,
  onDelete,
  onUpdate,
}: LeadDetailsSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [assignedUser, setAssignedUser] = useState<string>('unassigned')

  // Form fields
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editCompany, setEditCompany] = useState('')
  const [editValue, setEditValue] = useState('')
  const [editSource, setEditSource] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [newCustomField, setNewCustomField] = useState({ key: '', value: '' })

  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { formatCurrency, getTimeAgo, formatDateTime, getCurrencyCode } =
    useWorkspaceFormatting()

  // RTK Query hooks
  const [updateLead, { isLoading: isUpdating }] = useUpdateLeadMutation()
  const { data: statusesData } = useGetLeadStatusesQuery(
    currentWorkspace?.id || '',
    {
      skip: !currentWorkspace?.id,
    }
  )
  const { data: tagsData } = useGetTagsQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })
  const { data: membersData } = useGetWorkspaceMembersQuery(
    currentWorkspace?.id || '',
    {
      skip: !currentWorkspace?.id,
    }
  )

  const statuses = statusesData?.statuses || []
  const tags = tagsData?.tags || []
  const members = membersData?.members || []

  // Initialize form values when lead changes
  useEffect(() => {
    if (lead) {
      // Extract IDs from populated objects
      const tagIds = Array.isArray(lead.tagIds)
        ? lead.tagIds.map((tag: any) =>
            typeof tag === 'string' ? tag : tag.id || tag._id
          )
        : []

      const statusId =
        typeof lead.statusId === 'string'
          ? lead.statusId
          : (lead.statusId as any)?.id || (lead.statusId as any)?._id || ''

      const assignedUserId =
        typeof lead.assignedTo === 'string'
          ? lead.assignedTo
          : (lead.assignedTo as any)?.id ||
            (lead.assignedTo as any)?._id ||
            'unassigned'

      setSelectedTags(tagIds)
      setSelectedStatus(statusId)
      setAssignedUser(assignedUserId)
      setEditName(lead.name || '')
      setEditEmail(lead.email || '')
      setEditPhone(lead.phone || '')
      setEditCompany(lead.company || '')
      setEditValue(lead.value?.toString() || '')
      setEditSource(lead.source || '')
      setEditNotes(lead.notes || '')
      setCustomFields(lead.customData || {})
    }
  }, [lead])

  if (!lead) return null

  const handleDelete = async () => {
    if (!onDelete) return

    setIsDeleting(true)
    try {
      await onDelete(lead.id)
      onClose()
    } catch (error) {
      console.error('Error deleting lead:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!currentWorkspace?.id) return

    // Validate custom fields
    const customFieldErrors = validateCustomFields(customFields)
    if (customFieldErrors.length > 0) {
      toast.error(`Custom field errors: ${customFieldErrors.join(', ')}`)
      return
    }

    try {
      const updatePayload = {
        name: editName,
        email: editEmail || undefined, // Convert empty string to undefined for API compatibility
        phone: editPhone || undefined,
        company: editCompany || undefined,
        value: editValue ? Number(editValue) : undefined,
        source: editSource,
        notes: editNotes || undefined,
        statusId: selectedStatus || undefined,
        tagIds: selectedTags,
        assignedTo: assignedUser === 'unassigned' ? undefined : assignedUser,
        customFields: customFields,
      }

      const updatedLead = await updateLead({
        id: lead.id,
        workspaceId: currentWorkspace.id,
        ...updatePayload,
      }).unwrap()

      toast.success('Lead updated successfully')
      setIsEditing(false)

      // Trigger a refetch of the lead data to ensure UI is updated
      if (onUpdate) {
        onUpdate(updatedLead)
      }
    } catch (error: any) {
      console.error('Error updating lead:', error)
      const errorMessage =
        error?.data?.message || error?.message || 'Failed to update lead'
      toast.error(errorMessage)
    }
  }

  const handleAddCustomField = () => {
    if (newCustomField.key && newCustomField.value) {
      setCustomFields(prev => ({
        ...prev,
        [newCustomField.key]: newCustomField.value,
      }))
      setNewCustomField({ key: '', value: '' })
    }
  }

  const handleRemoveCustomField = (key: string) => {
    setCustomFields(prev => {
      const updated = { ...prev }
      delete updated[key]
      return updated
    })
  }

  const handleCancel = () => {
    // Reset to original values with proper ID extraction
    const tagIds = Array.isArray(lead.tagIds)
      ? lead.tagIds.map((tag: any) =>
          typeof tag === 'string' ? tag : tag.id || tag._id
        )
      : []

    const statusId =
      typeof lead.statusId === 'string'
        ? lead.statusId
        : (lead.statusId as any)?.id || (lead.statusId as any)?._id || ''

    const assignedUserId =
      typeof lead.assignedTo === 'string'
        ? lead.assignedTo
        : (lead.assignedTo as any)?.id ||
          (lead.assignedTo as any)?._id ||
          'unassigned'

    setSelectedTags(tagIds)
    setSelectedStatus(statusId)
    setAssignedUser(assignedUserId)
    setEditName(lead.name || '')
    setEditEmail(lead.email || '')
    setEditPhone(lead.phone || '')
    setEditCompany(lead.company || '')
    setEditValue(lead.value?.toString() || '')
    setEditSource(lead.source || '')
    setEditNotes(lead.notes || '')
    setIsEditing(false)
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
    }
  }
  console.log(lead)
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-6xl lg:max-w-7xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl font-bold">{lead.name}</SheetTitle>
              <SheetDescription>Lead details and information</SheetDescription>
            </div>
            <div className="flex items-center space-x-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={isUpdating}
                  >
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                    {isUpdating ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <>
                  <LeadActivityHistory leadId={lead.id} leadName={lead.name} />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Lead
                  </Button>
                  {onDelete && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <User className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  {isEditing ? (
                    <Input
                      id="edit-name"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      placeholder="Lead's full name"
                    />
                  ) : (
                    <p className="rounded bg-muted p-2 text-sm">{lead.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  {isEditing ? (
                    <Input
                      id="edit-email"
                      type="email"
                      value={editEmail}
                      onChange={e => setEditEmail(e.target.value)}
                      placeholder="lead@example.com"
                    />
                  ) : (
                    <p className="rounded bg-muted p-2 text-sm">
                      {lead.email || 'Not provided'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  {isEditing ? (
                    <Input
                      id="edit-phone"
                      value={editPhone}
                      onChange={e => setEditPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  ) : (
                    <p className="rounded bg-muted p-2 text-sm">
                      {lead.phone || 'Not provided'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-company">Company</Label>
                  {isEditing ? (
                    <Input
                      id="edit-company"
                      value={editCompany}
                      onChange={e => setEditCompany(e.target.value)}
                      placeholder="Company name"
                    />
                  ) : (
                    <p className="rounded bg-muted p-2 text-sm">
                      {lead.company || 'Not provided'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-value">
                    Potential Value ({getCurrencyCode()})
                  </Label>
                  {isEditing ? (
                    <Input
                      id="edit-value"
                      type="number"
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.01"
                    />
                  ) : (
                    <p className="rounded bg-muted p-2 text-sm">
                      {lead.value
                        ? formatCurrency(lead.value)
                        : 'Not specified'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-source">Source</Label>
                  {isEditing ? (
                    <Select value={editSource} onValueChange={setEditSource}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select source" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="referral">Referral</SelectItem>
                        <SelectItem value="social">Social Media</SelectItem>
                        <SelectItem value="email">Email Campaign</SelectItem>
                        <SelectItem value="phone">Phone Call</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="rounded bg-muted p-2 text-sm capitalize">
                      {lead.source}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status and Assignment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status & Assignment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Status</span>
                {isEditing ? (
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map(status => (
                        <SelectItem key={status.id} value={status.id}>
                          <div className="flex items-center space-x-2">
                            <div
                              className="h-3 w-3 rounded-full"
                              style={{ backgroundColor: status.color }}
                            />
                            <span>{status.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="secondary"
                    className="px-3 py-1 text-sm font-medium"
                    style={{
                      backgroundColor: (lead.statusId as any)?.color
                        ? `${(lead.statusId as any).color}20`
                        : undefined,
                      color: (lead.statusId as any)?.color || undefined,
                      borderColor: (lead.statusId as any)?.color || undefined,
                    }}
                  >
                    {typeof lead.statusId === 'object' &&
                    (lead.statusId as any)?.name
                      ? (lead.statusId as any).name
                      : lead.status}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Assigned To</span>
                {isEditing ? (
                  <Select value={assignedUser} onValueChange={setAssignedUser}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">
                        <span className="text-muted-foreground">
                          Unassigned
                        </span>
                      </SelectItem>
                      {members.map(member => (
                        <SelectItem key={member.id} value={member.userId}>
                          <div className="flex items-center space-x-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                              {member.user.fullName.charAt(0).toUpperCase()}
                            </div>
                            <span>{member.user.fullName}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">
                    {lead.assignedTo
                      ? members.find(m => m.userId === lead.assignedTo)?.user
                          .fullName || 'Unknown User'
                      : 'Unassigned'}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Priority</span>
                <Badge className={getPriorityColor(lead.priority)}>
                  {lead.priority}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Source</span>
                <Badge variant="outline">{lead.source}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Tag className="h-5 w-5" />
                <span>Tags</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Select tags for this lead:
                  </p>
                  <div className="grid max-h-40 grid-cols-1 gap-2 overflow-y-auto">
                    {tags.map(tag => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={selectedTags.includes(tag.id)}
                          onCheckedChange={() => handleTagToggle(tag.id)}
                        />
                        <label
                          htmlFor={`tag-${tag.id}`}
                          className="flex cursor-pointer items-center space-x-2"
                        >
                          <div
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="text-sm">{tag.name}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.length > 0 ? (
                    selectedTags.map(tagId => {
                      const tag = tags.find(t => t.id === tagId)
                      return tag ? (
                        <Badge
                          key={tagId}
                          variant="secondary"
                          className="flex items-center space-x-1"
                        >
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span>{tag.name}</span>
                        </Badge>
                      ) : null
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No tags assigned
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Tag className="h-5 w-5" />
                <span>Custom Fields</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  {Object.entries(customFields).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <Badge
                        variant="outline"
                        className="min-w-0 flex-shrink-0"
                      >
                        {key}
                      </Badge>
                      <span className="flex-1 truncate">{String(value)}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveCustomField(key)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-center space-x-2">
                    <Input
                      placeholder="Field name"
                      value={newCustomField.key}
                      onChange={e =>
                        setNewCustomField(prev => ({
                          ...prev,
                          key: e.target.value,
                        }))
                      }
                    />
                    <Input
                      placeholder="Field value"
                      value={newCustomField.value}
                      onChange={e =>
                        setNewCustomField(prev => ({
                          ...prev,
                          value: e.target.value,
                        }))
                      }
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomField}
                      disabled={!newCustomField.key || !newCustomField.value}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  {Object.keys(customFields).length > 0 ? (
                    Object.entries(customFields).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm font-medium capitalize">
                          {key}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {String(value)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      No custom fields added
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <FileText className="h-5 w-5" />
                <span>Notes</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Notes</Label>
                  <Textarea
                    id="edit-notes"
                    value={editNotes}
                    onChange={e => setEditNotes(e.target.value)}
                    placeholder="Add notes about this lead..."
                    rows={4}
                  />
                </div>
              ) : (
                <p className="min-h-[100px] whitespace-pre-wrap rounded bg-muted p-2 text-sm text-muted-foreground">
                  {lead.notes || 'No notes added yet'}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Calendar className="h-5 w-5" />
                <span>Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Created</span>
                <span className="text-sm text-muted-foreground">
                  {getTimeAgo(lead.createdAt)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-sm text-muted-foreground">
                  {getTimeAgo(lead.updatedAt)}
                </span>
              </div>

              {lead.nextFollowUpAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Next Follow-up</span>
                  <span className="text-sm text-muted-foreground">
                    {getTimeAgo(lead.nextFollowUpAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}
