'use client'

import { useState, useEffect, useMemo } from 'react'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, X } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppSelector } from '@/lib/hooks'
import { toast } from 'sonner'
import {
  useCreateLeadMutation,
  useGetLeadStatusesQuery,
  useGetTagsQuery,
} from '@/lib/api/mongoApi'
import {
  leadFormSchema,
  type LeadFormData,
  validateCustomFields,
} from '@/lib/validation/leadValidation'

interface LeadFormProps {
  onSuccess?: () => void
}

export function LeadForm({ onSuccess }: LeadFormProps) {
  const [customFields, setCustomFields] = useState<Record<string, any>>({})
  const [newCustomField, setNewCustomField] = useState({ key: '', value: '' })

  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { user } = useAppSelector(state => state.auth)

  // Initial form values
  const initialValues: LeadFormData = useMemo(
    () => ({
      name: '',
      email: null,
      phone: null,
      company: null,
      value: null,
      source: 'manual',
      notes: null,
      statusId: null,
      tagIds: [],
      assignedTo: null,
      customFields: {},
    }),
    []
  )

  // RTK Query hooks
  const [createLead, { isLoading: isCreating }] = useCreateLeadMutation()
  const { data: statusesData, isLoading: loadingStatuses } =
    useGetLeadStatusesQuery(currentWorkspace?.id || '', {
      skip: !currentWorkspace?.id,
    })
  const { data: tagsData } = useGetTagsQuery(currentWorkspace?.id || '', {
    skip: !currentWorkspace?.id,
  })

  // Default lead sources
  const leadSources = [
    { id: 'website', name: 'Website' },
    { id: 'referral', name: 'Referral' },
    { id: 'social_media', name: 'Social Media' },
    { id: 'cold_outreach', name: 'Cold Outreach' },
    { id: 'event', name: 'Event' },
    { id: 'linkedin', name: 'LinkedIn' },
    { id: 'google_ads', name: 'Google Ads' },
    { id: 'facebook_ads', name: 'Facebook Ads' },
    { id: 'email_campaign', name: 'Email Campaign' },
    { id: 'phone_call', name: 'Phone Call' },
    { id: 'walk_in', name: 'Walk-in' },
    { id: 'other', name: 'Other' },
  ]

  // Fetch lead statuses
  // Get data from RTK Query
  const leadStatuses = statusesData?.statuses || []
  const tags = tagsData?.tags || []

  // Set default status when statuses are loaded
  useEffect(() => {
    if (statusesData?.statuses && statusesData.statuses.length > 0) {
      // Find default status or use first status
      const defaultStatus =
        statusesData.statuses.find(status => status.isDefault) ||
        statusesData.statuses[0]
      if (defaultStatus && !initialValues.statusId) {
        initialValues.statusId = defaultStatus.id
      }
    }
  }, [statusesData, initialValues])

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

  const handleSubmit = async (values: LeadFormData) => {
    if (!currentWorkspace?.id) {
      toast.error('No workspace selected')
      return
    }

    if (!user) {
      toast.error('User not authenticated')
      return
    }

    // Validate custom fields
    const customFieldErrors = validateCustomFields(customFields)
    if (customFieldErrors.length > 0) {
      toast.error(`Custom field errors: ${customFieldErrors.join(', ')}`)
      return
    }

    try {
      const createPayload = {
        name: values.name,
        email: values.email || undefined, // Convert null to undefined for API compatibility
        phone: values.phone || undefined,
        company: values.company || undefined,
        value: values.value || undefined,
        source: values.source,
        notes: values.notes || undefined,
        statusId: values.statusId || undefined,
        tagIds: (values.tagIds || []).filter((id): id is string => Boolean(id)),
        assignedTo: values.assignedTo || undefined,
        workspaceId: currentWorkspace.id,
        customFields: customFields,
      }

      await createLead(createPayload).unwrap()

      toast.success('Lead created successfully')
      onSuccess?.()
    } catch (error: any) {
      console.error('Error creating lead:', error)
      const errorMessage =
        error?.data?.message || error?.message || 'Failed to create lead'
      toast.error(errorMessage)
    }
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={leadFormSchema}
      onSubmit={handleSubmit}
    >
      {({ values, setFieldValue, isSubmitting }) => (
        <Form className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Field
                as={Input}
                id="name"
                name="name"
                placeholder="Lead's full name"
              />
              <ErrorMessage
                name="name"
                component="p"
                className="text-sm text-red-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Field
                as={Input}
                id="email"
                name="email"
                type="email"
                placeholder="lead@example.com"
              />
              <ErrorMessage
                name="email"
                component="p"
                className="text-sm text-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Field
                as={Input}
                id="phone"
                name="phone"
                placeholder="+1 (555) 123-4567"
              />
              <ErrorMessage
                name="phone"
                component="p"
                className="text-sm text-red-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Field
                as={Input}
                id="company"
                name="company"
                placeholder="Company name"
              />
              <ErrorMessage
                name="company"
                component="p"
                className="text-sm text-red-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={values.statusId || ''}
                onValueChange={value => setFieldValue('statusId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {loadingStatuses ? (
                    <SelectItem value="loading" disabled>
                      Loading statuses...
                    </SelectItem>
                  ) : leadStatuses.length > 0 ? (
                    leadStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-status" disabled>
                      No statuses available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <ErrorMessage
                name="statusId"
                component="p"
                className="text-sm text-red-600"
              />
            </div>

            <div className="space-y-2">
              <Label>Source</Label>
              <Select
                value={values.source || 'manual'}
                onValueChange={value => setFieldValue('source', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {leadSources.map(source => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorMessage
                name="source"
                component="p"
                className="text-sm text-red-600"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Potential Value ($)</Label>
            <Field
              as={Input}
              id="value"
              name="value"
              type="number"
              placeholder="0"
              min="0"
              step="0.01"
            />
            <ErrorMessage
              name="value"
              component="p"
              className="text-sm text-red-600"
            />
          </div>

          <div className="space-y-2">
            <Label>Tags</Label>
            <Select
              value={values.tagIds?.join(',') || ''}
              onValueChange={value => {
                const newTags = value ? value.split(',') : []
                setFieldValue('tagIds', newTags)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select tags (optional)" />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => (
                  <SelectItem key={tag.id} value={tag.id}>
                    <div className="flex items-center space-x-2">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span>{tag.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ErrorMessage
              name="tagIds"
              component="p"
              className="text-sm text-red-600"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Field
              as={Textarea}
              id="notes"
              name="notes"
              placeholder="Additional notes about this lead..."
              rows={3}
            />
            <ErrorMessage
              name="notes"
              component="p"
              className="text-sm text-red-600"
            />
          </div>

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
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onSuccess}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  )
}
