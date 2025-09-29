'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, X, DollarSign, Calendar, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import {
  Contact,
  useCreateContactMutation,
  useUpdateContactMutation,
} from '@/lib/api/contactsApi'
import {
  useGetWorkspaceMembersQuery,
  useGetTagsQuery,
} from '@/lib/api/mongoApi'

// Form validation schema
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().max(20, 'Phone too long').optional().or(z.literal('')),
  company: z
    .string()
    .max(100, 'Company name too long')
    .optional()
    .or(z.literal('')),
  position: z
    .string()
    .max(100, 'Position too long')
    .optional()
    .or(z.literal('')),
  totalRevenue: z.number().min(0, 'Revenue must be positive').optional(),
  totalPayments: z.number().min(0, 'Payments must be positive').optional(),
  website: z.string().url('Invalid website URL').optional().or(z.literal('')),
  linkedIn: z.string().url('Invalid LinkedIn URL').optional().or(z.literal('')),
  twitter: z.string().url('Invalid Twitter URL').optional().or(z.literal('')),
  category: z
    .enum(['client', 'prospect', 'partner', 'vendor', 'other'])
    .optional(),
  assignedTo: z.string().optional().or(z.literal('')),
  accountManager: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().max(2000, 'Notes too long').optional().or(z.literal('')),
  lastContactDate: z.string().optional().or(z.literal('')),
  nextFollowUpDate: z.string().optional().or(z.literal('')),
  // Address fields
  street: z.string().optional().or(z.literal('')),
  city: z.string().optional().or(z.literal('')),
  state: z.string().optional().or(z.literal('')),
  zipCode: z.string().optional().or(z.literal('')),
  country: z.string().optional().or(z.literal('')),
})

type ContactFormData = z.infer<typeof contactSchema>

interface ContactFormProps {
  workspaceId: string
  contact?: Contact
  onSuccess: () => void
  onCancel: () => void
}

export function ContactForm({
  workspaceId,
  contact,
  onSuccess,
  onCancel,
}: ContactFormProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [newCustomField, setNewCustomField] = useState({ key: '', value: '' })

  const isEditing = !!contact

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      position: '',
      totalRevenue: 0,
      totalPayments: 0,
      website: '',
      linkedIn: '',
      twitter: '',
      category: 'prospect',
      status: 'active',
      priority: 'medium',
      notes: '',
      lastContactDate: '',
      nextFollowUpDate: '',
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
  })

  // RTK Query hooks
  const { data: membersData } = useGetWorkspaceMembersQuery(workspaceId, {
    skip: !workspaceId,
  })
  const { data: tagsData } = useGetTagsQuery(workspaceId, {
    skip: !workspaceId,
  })
  const [createContact] = useCreateContactMutation()
  const [updateContact] = useUpdateContactMutation()

  const users = membersData?.members || []
  const tags = tagsData?.tags || []

  // Initialize form with contact data if editing
  useEffect(() => {
    if (contact) {
      reset({
        name: contact.name,
        email: contact.email || '',
        phone: contact.phone || '',
        company: contact.company || '',
        position: contact.position || '',
        totalRevenue: contact.totalRevenue || 0,
        totalPayments: contact.totalPayments || 0,
        website: contact.website || '',
        linkedIn: contact.linkedIn || '',
        twitter: contact.twitter || '',
        category: contact.category,
        status: contact.status,
        priority: contact.priority,
        notes: contact.notes || '',
        lastContactDate: contact.lastContactDate
          ? contact.lastContactDate.split('T')[0]
          : '',
        nextFollowUpDate: contact.nextFollowUpDate
          ? contact.nextFollowUpDate.split('T')[0]
          : '',
        street: contact.address?.street || '',
        city: contact.address?.city || '',
        state: contact.address?.state || '',
        zipCode: contact.address?.zipCode || '',
        country: contact.address?.country || '',
      })

      if (contact.tagIds) {
        setSelectedTags(contact.tagIds.map(tag => tag._id))
      }

      if (contact.customData) {
        setCustomFields(contact.customData)
      }
    }
  }, [contact, reset])

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

  const onSubmit = async (data: ContactFormData) => {
    try {
      const contactData: any = {
        ...data,
        tagIds: selectedTags.filter(id => id !== ''),
        customData: customFields,
        assignedTo:
          data.assignedTo === 'unassigned' ? undefined : data.assignedTo,
        accountManager:
          data.accountManager === 'none' ? undefined : data.accountManager,
        lastContactDate: data.lastContactDate
          ? new Date(data.lastContactDate).toISOString()
          : undefined,
        nextFollowUpDate: data.nextFollowUpDate
          ? new Date(data.nextFollowUpDate).toISOString()
          : undefined,
      }

      // Add address only if at least one field is filled
      if (
        data.street ||
        data.city ||
        data.state ||
        data.zipCode ||
        data.country
      ) {
        contactData.address = {
          street: data.street,
          city: data.city,
          state: data.state,
          zipCode: data.zipCode,
          country: data.country,
        }
      }

      if (isEditing && contact) {
        await updateContact({
          id: contact._id,
          data: contactData,
          workspaceId,
        }).unwrap()
        toast.success('Contact updated successfully')
      } else {
        await createContact({
          data: contactData,
          workspaceId,
        }).unwrap()
        toast.success('Contact created successfully')
      }

      onSuccess()
    } catch (error: any) {
      console.error('Error saving contact:', error)
      toast.error(error.data?.message || 'Failed to save contact')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register('name')} placeholder="Full name" />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="email@example.com"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="+1 (555) 123-4567"
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                {...register('company')}
                placeholder="Company name"
              />
              {errors.company && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.company.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                id="position"
                {...register('position')}
                placeholder="Job title"
              />
              {errors.position && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.position.message}
                </p>
              )}
            </div>
          </div>
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
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="totalRevenue">Total Revenue</Label>
              <Input
                id="totalRevenue"
                type="number"
                min="0"
                step="0.01"
                {...register('totalRevenue', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.totalRevenue && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.totalRevenue.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="totalPayments">Total Payments</Label>
              <Input
                id="totalPayments"
                type="number"
                min="0"
                step="0.01"
                {...register('totalPayments', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.totalPayments && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.totalPayments.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contact Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select
                onValueChange={value => setValue('category', value as any)}
                defaultValue={watch('category')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="client">Client</SelectItem>
                  <SelectItem value="prospect">Prospect</SelectItem>
                  <SelectItem value="partner">Partner</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                onValueChange={value => setValue('status', value as any)}
                defaultValue={watch('status')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select
                onValueChange={value => setValue('priority', value as any)}
                defaultValue={watch('priority')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="assignedTo">Assigned To</Label>
              <Select
                onValueChange={value => setValue('assignedTo', value)}
                defaultValue={watch('assignedTo')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(member => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="accountManager">Account Manager</Label>
              <Select
                onValueChange={value => setValue('accountManager', value)}
                defaultValue={watch('accountManager')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account manager" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {users.map(member => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Address Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <MapPin className="mr-2 h-5 w-5" />
            Address Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="street">Street Address</Label>
              <Input
                id="street"
                {...register('street')}
                placeholder="123 Main Street"
              />
            </div>
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register('city')} placeholder="New York" />
            </div>
            <div>
              <Label htmlFor="state">State/Province</Label>
              <Input id="state" {...register('state')} placeholder="NY" />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP/Postal Code</Label>
              <Input
                id="zipCode"
                {...register('zipCode')}
                placeholder="10001"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="United States"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social & Web Presence */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Social & Web Presence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...register('website')}
                placeholder="https://example.com"
              />
              {errors.website && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.website.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="linkedIn">LinkedIn</Label>
              <Input
                id="linkedIn"
                {...register('linkedIn')}
                placeholder="https://linkedin.com/in/username"
              />
              {errors.linkedIn && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.linkedIn.message}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="twitter">Twitter</Label>
              <Input
                id="twitter"
                {...register('twitter')}
                placeholder="https://twitter.com/username"
              />
              {errors.twitter && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.twitter.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Important Dates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-lg">
            <Calendar className="mr-2 h-5 w-5" />
            Important Dates
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="lastContactDate">Last Contact Date</Label>
              <Input
                id="lastContactDate"
                type="date"
                {...register('lastContactDate')}
              />
            </div>
            <div>
              <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
              <Input
                id="nextFollowUpDate"
                type="date"
                {...register('nextFollowUpDate')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tags */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`tag-${tag.id}`}
                  checked={selectedTags.includes(tag.id)}
                  onChange={() => {
                    setSelectedTags(prev =>
                      prev.includes(tag.id)
                        ? prev.filter(id => id !== tag.id)
                        : [...prev, tag.id]
                    )
                  }}
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
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Custom Fields</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(customFields).map(([key, value]) => (
            <div key={key} className="flex items-center space-x-2">
              <Badge variant="outline" className="min-w-0 flex-shrink-0">
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
                setNewCustomField(prev => ({ ...prev, key: e.target.value }))
              }
            />
            <Input
              placeholder="Field value"
              value={newCustomField.value}
              onChange={e =>
                setNewCustomField(prev => ({ ...prev, value: e.target.value }))
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
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register('notes')}
            placeholder="Additional notes about this contact..."
            rows={4}
          />
          {errors.notes && (
            <p className="mt-1 text-sm text-red-600">{errors.notes.message}</p>
          )}
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Saving...'
            : isEditing
              ? 'Update Contact'
              : 'Create Contact'}
        </Button>
      </div>
    </form>
  )
}
