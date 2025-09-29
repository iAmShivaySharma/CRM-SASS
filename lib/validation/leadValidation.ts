import * as yup from 'yup'

// Lead form validation schema
export const leadFormSchema = yup.object({
  name: yup
    .string()
    .required('Name is required')
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  email: yup
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  phone: yup
    .string()
    .max(20, 'Phone number must be less than 20 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  company: yup
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  value: yup
    .number()
    .min(0, 'Value must be positive')
    .max(999999999, 'Value is too large')
    .nullable()
    .transform(value => (isNaN(value) ? null : value)),

  source: yup
    .string()
    .oneOf(
      [
        'manual',
        'website',
        'referral',
        'social',
        'social_media',
        'email',
        'phone',
        'other',
      ],
      'Invalid source'
    )
    .default('manual'),

  notes: yup
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  statusId: yup
    .string()
    .nullable()
    .transform(value => (value === '' ? null : value)),

  tagIds: yup
    .array()
    .of(yup.string())
    .max(10, 'Too many tags selected')
    .default([]),

  assignedTo: yup
    .string()
    .nullable()
    .transform(value =>
      value === '' || value === 'unassigned' ? null : value
    ),

  customFields: yup.object().default({}),
})

// Lead update validation schema (all fields optional except name)
export const leadUpdateSchema = yup.object({
  name: yup
    .string()
    .min(1, 'Name must be at least 1 character')
    .max(100, 'Name must be less than 100 characters')
    .trim(),

  email: yup
    .string()
    .email('Please enter a valid email address')
    .max(255, 'Email must be less than 255 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  phone: yup
    .string()
    .max(20, 'Phone number must be less than 20 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  company: yup
    .string()
    .max(100, 'Company name must be less than 100 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  value: yup
    .number()
    .min(0, 'Value must be positive')
    .max(999999999, 'Value is too large')
    .nullable()
    .transform(value => (isNaN(value) ? null : value)),

  source: yup
    .string()
    .oneOf(
      [
        'manual',
        'website',
        'referral',
        'social',
        'social_media',
        'email',
        'phone',
        'other',
      ],
      'Invalid source'
    ),

  notes: yup
    .string()
    .max(2000, 'Notes must be less than 2000 characters')
    .nullable()
    .transform(value => (value === '' ? null : value)),

  statusId: yup
    .string()
    .nullable()
    .transform(value => (value === '' ? null : value)),

  tagIds: yup.array().of(yup.string()).max(10, 'Too many tags selected'),

  assignedTo: yup
    .string()
    .nullable()
    .transform(value =>
      value === '' || value === 'unassigned' ? null : value
    ),

  customFields: yup.object(),
})

// Custom field validation schema
export const customFieldSchema = yup.object({
  key: yup
    .string()
    .required('Field name is required')
    .min(1, 'Field name must be at least 1 character')
    .max(50, 'Field name must be less than 50 characters')
    .matches(
      /^[a-zA-Z0-9_-]+$/,
      'Field name can only contain letters, numbers, underscores, and hyphens'
    )
    .trim(),

  value: yup
    .string()
    .required('Field value is required')
    .max(500, 'Field value must be less than 500 characters')
    .trim(),
})

// Type definitions for form data
export type LeadFormData = yup.InferType<typeof leadFormSchema>
export type LeadUpdateData = yup.InferType<typeof leadUpdateSchema>
export type CustomFieldData = yup.InferType<typeof customFieldSchema>

// Helper function to validate custom fields
export const validateCustomFields = (
  customFields: Record<string, any>
): string[] => {
  const errors: string[] = []

  Object.entries(customFields).forEach(([key, value]) => {
    try {
      customFieldSchema.validateSync({ key, value })
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        errors.push(`${key}: ${error.message}`)
      }
    }
  })

  return errors
}

// Helper function to clean form data
export const cleanLeadFormData = (data: any): LeadFormData => {
  return leadFormSchema.cast(data) as LeadFormData
}

export const cleanLeadUpdateData = (data: any): LeadUpdateData => {
  return leadUpdateSchema.cast(data) as LeadUpdateData
}
