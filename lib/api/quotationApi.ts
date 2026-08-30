import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface QuotationItem {
  name: string
  description?: string
  quantity: number
  unitPrice: number
  discount?: number
  tax?: number
  total: number
}

export interface Quotation {
  _id: string
  workspaceId: string
  quotationNumber: string
  clientName: string
  clientEmail?: string
  clientPhone?: string
  clientAddress?: string
  items: QuotationItem[]
  subtotal: number
  discount?: number
  tax?: number
  total: number
  currency: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  validUntil?: string
  notes?: string
  terms?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface QuotationsResponse {
  success: boolean
  quotations: Quotation[]
  total?: number
}

export interface QuotationResponse {
  success: boolean
  quotation: Quotation
}

export const quotationApi = createApi({
  reducerPath: 'quotationApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['Quotation'],
  endpoints: builder => ({
    getQuotations: builder.query<QuotationsResponse, { workspaceId: string; status?: string }>({
      query: ({ workspaceId, ...rest }) => {
        const params = new URLSearchParams({ workspaceId, ...rest as Record<string, string> })
        return `api/quotations?${params.toString()}`
      },
      providesTags: ['Quotation'],
    }),
    getQuotation: builder.query<QuotationResponse, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/quotations/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'Quotation', id }],
    }),
    createQuotation: builder.mutation<QuotationResponse, Partial<Quotation> & { workspaceId: string }>({
      query: body => ({
        url: 'api/quotations',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Quotation'],
    }),
    updateQuotation: builder.mutation<QuotationResponse, { id: string } & Partial<Quotation>>({
      query: ({ id, ...body }) => ({
        url: `api/quotations/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Quotation', id }, 'Quotation'],
    }),
    deleteQuotation: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/quotations/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Quotation'],
    }),
  }),
})

export const {
  useGetQuotationsQuery,
  useGetQuotationQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useDeleteQuotationMutation,
} = quotationApi
