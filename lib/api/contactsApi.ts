import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Contact {
  _id: string
  workspaceId: string
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string
  totalRevenue?: number
  totalPayments?: number
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  milestones?: Array<{
    _id?: string
    title: string
    description?: string
    date: string
    type: 'payment' | 'meeting' | 'contract' | 'delivery' | 'other'
    amount?: number
    status: 'completed' | 'pending' | 'cancelled'
  }>
  website?: string
  linkedIn?: string
  twitter?: string
  originalLeadId?: string
  convertedFromLead?: boolean
  leadConversionDate?: string
  customData?: Record<string, any>
  tagIds?: Array<{
    _id: string
    name: string
    color: string
  }>
  category: 'client' | 'prospect' | 'partner' | 'vendor' | 'other'
  assignedTo?: {
    _id: string
    fullName: string
    email: string
  }
  accountManager?: {
    _id: string
    fullName: string
    email: string
  }
  status: 'active' | 'inactive' | 'archived'
  priority: 'low' | 'medium' | 'high'
  notes?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  createdBy: {
    _id: string
    fullName: string
    email: string
  }
  createdAt: string
  updatedAt: string
  fullAddress?: string
  totalMilestoneValue?: number
}

export interface ContactsListResponse {
  success: boolean
  contacts: Contact[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface ContactResponse {
  success: boolean
  contact: Contact
  message?: string
}

export interface CreateContactRequest {
  name: string
  email?: string
  phone?: string
  company?: string
  position?: string
  totalRevenue?: number
  totalPayments?: number
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  website?: string
  linkedIn?: string
  twitter?: string
  tagIds?: string[]
  category?: 'client' | 'prospect' | 'partner' | 'vendor' | 'other'
  assignedTo?: string
  accountManager?: string
  status?: 'active' | 'inactive' | 'archived'
  priority?: 'low' | 'medium' | 'high'
  notes?: string
  lastContactDate?: string
  nextFollowUpDate?: string
  customData?: Record<string, any>
  originalLeadId?: string
  convertedFromLead?: boolean
}

export interface UpdateContactRequest extends Partial<CreateContactRequest> {
  milestones?: Array<{
    title: string
    description?: string
    date: string
    type?: 'payment' | 'meeting' | 'contract' | 'delivery' | 'other'
    amount?: number
    status?: 'completed' | 'pending' | 'cancelled'
  }>
}

export interface ContactsQueryParams {
  workspaceId: string
  page?: number
  limit?: number
  search?: string
  status?: string
  category?: string
  assignedTo?: string
  priority?: string
}

export interface ConvertLeadToContactResponse {
  success: boolean
  message: string
  contact: Contact
  leadId: string
}

export const contactsApi = createApi({
  reducerPath: 'contactsApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/contacts',
    credentials: 'include',
    prepareHeaders: headers => {
      headers.set('Content-Type', 'application/json')
      return headers
    },
  }),
  tagTypes: ['Contact', 'ContactsList'],
  endpoints: builder => ({
    // Get all contacts
    getContacts: builder.query<ContactsListResponse, ContactsQueryParams>({
      query: ({
        workspaceId,
        page = 1,
        limit = 20,
        search,
        status,
        category,
        assignedTo,
        priority,
      }) => {
        const params = new URLSearchParams({
          workspaceId,
          page: page.toString(),
          limit: limit.toString(),
        })

        if (search) params.append('search', search)
        if (status) params.append('status', status)
        if (category) params.append('category', category)
        if (assignedTo) params.append('assignedTo', assignedTo)
        if (priority) params.append('priority', priority)

        return `?${params.toString()}`
      },
      providesTags: result =>
        result
          ? [
              ...result.contacts.map(({ _id }) => ({
                type: 'Contact' as const,
                id: _id,
              })),
              { type: 'ContactsList', id: 'LIST' },
            ]
          : [{ type: 'ContactsList', id: 'LIST' }],
    }),

    // Get a single contact
    getContact: builder.query<
      ContactResponse,
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => `/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'Contact', id }],
    }),

    // Create a new contact
    createContact: builder.mutation<
      ContactResponse,
      { data: CreateContactRequest; workspaceId: string }
    >({
      query: ({ data, workspaceId }) => ({
        url: `?workspaceId=${workspaceId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'ContactsList', id: 'LIST' }],
    }),

    // Update a contact
    updateContact: builder.mutation<
      ContactResponse,
      { id: string; data: UpdateContactRequest; workspaceId: string }
    >({
      query: ({ id, data, workspaceId }) => ({
        url: `/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Contact', id },
        { type: 'ContactsList', id: 'LIST' },
      ],
    }),

    // Delete a contact
    deleteContact: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Contact', id },
        { type: 'ContactsList', id: 'LIST' },
      ],
    }),

    // Convert lead to contact
    convertLeadToContact: builder.mutation<
      ConvertLeadToContactResponse,
      { leadId: string; workspaceId: string }
    >({
      query: ({ leadId, workspaceId }) => ({
        url: `http://localhost:3000/api/leads/${leadId}/convert-to-contact?workspaceId=${workspaceId}`,
        method: 'POST',
        credentials: 'include',
      }),
      invalidatesTags: [
        { type: 'ContactsList', id: 'LIST' },
        { type: 'Contact', id: 'NEW' },
      ],
    }),
  }),
})

export const {
  useGetContactsQuery,
  useGetContactQuery,
  useCreateContactMutation,
  useUpdateContactMutation,
  useDeleteContactMutation,
  useConvertLeadToContactMutation,
} = contactsApi
