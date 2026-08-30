import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface InvoiceItem {
  _id?: string
  name: string
  description?: string
  hsnSac?: string
  quantity: number
  unit: string
  rate: number
  discount: number
  discountType: 'percentage' | 'flat'
  taxRate: number
  taxAmount: number
  amount: number
}

export interface InvoiceType {
  id: string
  _id?: string
  workspaceId: string
  invoiceNumber: string
  type: 'tax_invoice' | 'proforma' | 'credit_note' | 'debit_note'
  status:
    | 'draft'
    | 'sent'
    | 'viewed'
    | 'paid'
    | 'partially_paid'
    | 'overdue'
    | 'cancelled'
  contactId?: {
    id: string
    name: string
    email?: string
    company?: string
  } | null
  customerName: string
  customerEmail?: string
  customerPhone?: string
  customerGstin?: string
  customerAddress?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  sellerName?: string
  sellerGstin?: string
  sellerAddress?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
  }
  invoiceDate: string
  dueDate?: string
  paidDate?: string
  items: InvoiceItem[]
  subtotal: number
  totalDiscount: number
  taxableAmount: number
  cgst: number
  sgst: number
  igst: number
  totalTax: number
  roundOff: number
  grandTotal: number
  amountPaid: number
  amountDue: number
  currency: string
  placeOfSupply?: string
  isInterState: boolean
  reverseCharge: boolean
  paymentTerms?: string
  bankDetails?: {
    bankName?: string
    accountNumber?: string
    ifscCode?: string
    upiId?: string
  }
  dealId?: string
  notes?: string
  termsAndConditions?: string
  isRecurring: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PaymentRecordType {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: string
  referenceNumber?: string
  notes?: string
  receivedBy: {
    id: string
    fullName: string
    email: string
  }
  createdAt: string
}

export interface InvoiceAnalytics {
  overview: {
    totalInvoices: number
    totalAmount: number
    totalPaid: number
    totalDue: number
    totalTax: number
    avgInvoiceValue: number
    collectionRate: number
  }
  byStatus: Array<{
    status: string
    count: number
    totalAmount: number
    totalDue: number
  }>
  monthlyTrend: Array<{
    month: string
    count: number
    totalAmount: number
    totalPaid: number
    totalTax: number
  }>
  overdueInvoices: Array<InvoiceType & { daysOverdue: number }>
  topCustomers: Array<{
    _id: string
    totalInvoices: number
    totalAmount: number
    totalPaid: number
    totalDue: number
  }>
  gstSummary: {
    totalTax: number
    cgst: number
    sgst: number
    igst: number
  }
}

export const invoiceApi = createApi({
  reducerPath: 'invoiceApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['Invoice', 'InvoiceAnalytics'],
  endpoints: builder => ({
    getInvoices: builder.query<
      {
        invoices: InvoiceType[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
          hasNext: boolean
          hasPrev: boolean
        }
      },
      {
        workspaceId: string
        status?: string
        type?: string
        contactId?: string
        search?: string
        dateFrom?: string
        dateTo?: string
        page?: number
        limit?: number
        sortBy?: string
        sortOrder?: string
      }
    >({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            searchParams.set(key, String(value))
          }
        })
        return `/invoices?${searchParams.toString()}`
      },
      providesTags: result =>
        result
          ? [
              ...result.invoices.map(inv => ({
                type: 'Invoice' as const,
                id: inv.id,
              })),
              { type: 'Invoice', id: 'LIST' },
            ]
          : [{ type: 'Invoice', id: 'LIST' }],
    }),

    getInvoice: builder.query<
      { invoice: InvoiceType; payments: PaymentRecordType[] },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `/invoices/${id}?workspaceId=${workspaceId}`,
      providesTags: (_result, _error, { id }) => [{ type: 'Invoice', id }],
    }),

    createInvoice: builder.mutation<
      { invoice: InvoiceType },
      Record<string, any>
    >({
      query: body => ({
        url: '/invoices',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }, 'InvoiceAnalytics'],
    }),

    updateInvoice: builder.mutation<
      { invoice: InvoiceType },
      { id: string } & Record<string, any>
    >({
      query: ({ id, ...body }) => ({
        url: `/invoices/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Invoice', id },
        { type: 'Invoice', id: 'LIST' },
        'InvoiceAnalytics',
      ],
    }),

    deleteInvoice: builder.mutation<void, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `/invoices/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Invoice', id: 'LIST' }, 'InvoiceAnalytics'],
    }),

    recordPayment: builder.mutation<
      { payment: PaymentRecordType; invoice: InvoiceType },
      {
        invoiceId: string
        workspaceId: string
        amount: number
        paymentDate?: string
        paymentMethod?: string
        referenceNumber?: string
        notes?: string
      }
    >({
      query: ({ invoiceId, ...body }) => ({
        url: `/invoices/${invoiceId}/record-payment`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { invoiceId }) => [
        { type: 'Invoice', id: invoiceId },
        { type: 'Invoice', id: 'LIST' },
        'InvoiceAnalytics',
      ],
    }),

    sendInvoice: builder.mutation<
      { invoice: InvoiceType },
      { invoiceId: string; workspaceId: string; channel?: string }
    >({
      query: ({ invoiceId, ...body }) => ({
        url: `/invoices/${invoiceId}/send`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { invoiceId }) => [
        { type: 'Invoice', id: invoiceId },
        { type: 'Invoice', id: 'LIST' },
      ],
    }),

    getNextInvoiceNumber: builder.query<
      { invoiceNumber: string; sequence: number },
      { workspaceId: string; type?: string }
    >({
      query: ({ workspaceId, type }) =>
        `/invoices/next-number?workspaceId=${workspaceId}${type ? `&type=${type}` : ''}`,
    }),

    getInvoiceAnalytics: builder.query<
      InvoiceAnalytics,
      { workspaceId: string; dateFrom?: string; dateTo?: string }
    >({
      query: params => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value) searchParams.set(key, value)
        })
        return `/invoices/analytics?${searchParams.toString()}`
      },
      transformResponse: (response: any) => response.analytics,
      providesTags: ['InvoiceAnalytics'],
    }),
  }),
})

export const {
  useGetInvoicesQuery,
  useGetInvoiceQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useRecordPaymentMutation,
  useSendInvoiceMutation,
  useGetNextInvoiceNumberQuery,
  useGetInvoiceAnalyticsQuery,
} = invoiceApi
