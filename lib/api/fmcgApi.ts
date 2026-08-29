import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface FmcgProductRecord {
  _id: string
  id: string
  workspaceId: string
  name: string
  sku: string
  hsnCode?: string
  fssaiProductCode?: string
  category: string
  subCategory?: string
  description?: string
  ingredients?: string
  allergens: string[]
  netWeight?: number
  weightUnit: string
  shelfLife?: number
  storageConditions?: string
  mrp?: number
  manufacturerName: string
  manufacturerAddress: string
  brandName?: string
  countryOfOrigin: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgBatchRecord {
  _id: string
  id: string
  workspaceId: string
  productId: string
  batchNumber: string
  manufacturingDate: string
  expiryDate: string
  bestBeforeDate?: string
  quantityProduced: number
  quantityUnit: string
  quantityRemaining?: number
  lineNumber?: string
  plantCode?: string
  qcStatus: 'pending' | 'passed' | 'failed' | 'hold'
  qcNotes?: string
  qcApprovedBy?: string
  qcApprovedAt?: string
  rawMaterialDetails?: string
  packagingMaterial?: string
  storageLocation?: string
  temperature?: number
  humidity?: number
  dispatchDetails?: string
  recallStatus: 'none' | 'partial' | 'full'
  recallReason?: string
  recallDate?: string
  status: 'active' | 'consumed' | 'recalled' | 'expired' | 'destroyed'
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgLicenseRecord {
  _id: string
  id: string
  workspaceId: string
  licenseNumber: string
  licenseType: 'registration' | 'state' | 'central'
  category?: string
  businessName: string
  businessAddress: string
  state: string
  district?: string
  pincode?: string
  issueDate: string
  expiryDate: string
  renewalDate?: string
  status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'renewal_pending'
  documentUrl?: string
  remarks?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgTestParameter {
  name: string
  value: string
  unit: string
  minLimit: string
  maxLimit: string
  status: 'pass' | 'fail'
}

export interface FmcgTestReportRecord {
  _id: string
  id: string
  workspaceId: string
  batchId: string
  productId: string
  reportNumber: string
  testType: 'microbiological' | 'chemical' | 'physical' | 'sensory' | 'nutritional' | 'pesticide' | 'heavy_metals' | 'other'
  labName: string
  labAccreditationNumber?: string
  sampleCollectedAt: string
  reportDate: string
  result: 'pass' | 'fail' | 'conditional_pass'
  parameters: FmcgTestParameter[]
  overallObservations?: string
  reportUrl?: string
  certificateNumber?: string
  validUntil?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface PaginatedResponse<T> {
  success: boolean
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface ProductsResponse extends PaginatedResponse<FmcgProductRecord> {
  products: FmcgProductRecord[]
}

export interface BatchesResponse extends PaginatedResponse<FmcgBatchRecord> {
  batches: FmcgBatchRecord[]
}

export interface LicensesResponse extends PaginatedResponse<FmcgLicenseRecord> {
  licenses: FmcgLicenseRecord[]
}

export interface TestReportsResponse extends PaginatedResponse<FmcgTestReportRecord> {
  reports: FmcgTestReportRecord[]
}

export interface ProductQuery {
  workspaceId?: string
  page?: number
  limit?: number
  search?: string
  category?: string
  isActive?: boolean
}

export interface BatchQuery {
  workspaceId?: string
  page?: number
  limit?: number
  productId?: string
  qcStatus?: string
  status?: string
  search?: string
  expiryBefore?: string
  expiryAfter?: string
}

export interface LicenseQuery {
  workspaceId?: string
  page?: number
  limit?: number
  status?: string
  licenseType?: string
}

export interface TestReportQuery {
  workspaceId?: string
  page?: number
  limit?: number
  batchId?: string
  productId?: string
  result?: string
  testType?: string
}

export interface FmcgSupplierRecord {
  _id: string
  id: string
  workspaceId: string
  name: string
  code?: string
  fssaiLicenseNumber?: string
  fssaiLicenseExpiry?: string
  gstNumber?: string
  contactPerson?: string
  phone?: string
  email?: string
  address?: string
  state?: string
  city?: string
  pincode?: string
  categories: string[]
  approvalStatus: 'pending' | 'approved' | 'suspended' | 'blacklisted'
  approvalDate?: string
  approvalNotes?: string
  rating?: number
  notes?: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgDistributionRecord {
  _id: string
  id: string
  workspaceId: string
  batchId: string
  productId: string
  dispatchDate: string
  deliveryDate?: string
  recipientType: 'distributor' | 'retailer' | 'wholesaler' | 'direct_customer' | 'export'
  recipientName: string
  recipientFssaiNumber?: string
  recipientGst?: string
  recipientAddress?: string
  recipientState?: string
  recipientCity?: string
  recipientPhone?: string
  invoiceNumber?: string
  quantityDispatched: number
  quantityUnit: string
  vehicleNumber?: string
  driverName?: string
  transporterName?: string
  lrNumber?: string
  status: 'dispatched' | 'in_transit' | 'delivered' | 'returned' | 'recalled'
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SuppliersResponse extends PaginatedResponse<FmcgSupplierRecord> {
  suppliers: FmcgSupplierRecord[]
}

export interface DistributionsResponse extends PaginatedResponse<FmcgDistributionRecord> {
  distributions: FmcgDistributionRecord[]
}

export interface SupplierQuery {
  workspaceId?: string
  page?: number
  limit?: number
  search?: string
  approvalStatus?: string
  isActive?: boolean
}

export interface DistributionQuery {
  workspaceId?: string
  page?: number
  limit?: number
  batchId?: string
  productId?: string
  status?: string
  recipientType?: string
  dateFrom?: string
  dateTo?: string
}

export interface TraceabilityQuery {
  workspaceId?: string
  batchId?: string
  productId?: string
  dateFrom?: string
  dateTo?: string
}

export interface ExportQuery {
  workspaceId?: string
  productId?: string
  batchId?: string
  dateFrom?: string
  dateTo?: string
}

function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString())
    }
  })
  return searchParams.toString()
}

export const fmcgApi = createApi({
  reducerPath: 'fmcgApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['FmcgProduct', 'FmcgBatch', 'FmcgLicense', 'FmcgTestReport', 'FmcgSupplier', 'FmcgDistribution'],
  endpoints: builder => ({
    getProducts: builder.query<ProductsResponse, ProductQuery>({
      query: (params = {}) => `api/fmcg/products?${buildQueryString(params)}`,
      providesTags: ['FmcgProduct'],
    }),

    getProduct: builder.query<{ success: boolean; product: FmcgProductRecord }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/fmcg/products/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'FmcgProduct', id }],
    }),

    createProduct: builder.mutation<{ success: boolean; product: FmcgProductRecord }, Partial<FmcgProductRecord> & { workspaceId: string }>({
      query: body => ({
        url: 'api/fmcg/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgProduct'],
    }),

    updateProduct: builder.mutation<{ success: boolean; product: FmcgProductRecord }, { id: string; workspaceId: string } & Partial<FmcgProductRecord>>({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/products/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FmcgProduct', id }, 'FmcgProduct'],
    }),

    deleteProduct: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/products/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgProduct'],
    }),

    getBatches: builder.query<BatchesResponse, BatchQuery>({
      query: (params = {}) => `api/fmcg/batches?${buildQueryString(params)}`,
      providesTags: ['FmcgBatch'],
    }),

    getBatch: builder.query<{ success: boolean; batch: FmcgBatchRecord }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/fmcg/batches/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'FmcgBatch', id }],
    }),

    createBatch: builder.mutation<{ success: boolean; batch: FmcgBatchRecord }, Partial<FmcgBatchRecord> & { workspaceId: string }>({
      query: body => ({
        url: 'api/fmcg/batches',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgBatch'],
    }),

    updateBatch: builder.mutation<{ success: boolean; batch: FmcgBatchRecord }, { id: string; workspaceId: string } & Partial<FmcgBatchRecord>>({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/batches/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FmcgBatch', id }, 'FmcgBatch'],
    }),

    deleteBatch: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/batches/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgBatch'],
    }),

    getLicenses: builder.query<LicensesResponse, LicenseQuery>({
      query: (params = {}) => `api/fmcg/licenses?${buildQueryString(params)}`,
      providesTags: ['FmcgLicense'],
    }),

    createLicense: builder.mutation<{ success: boolean; license: FmcgLicenseRecord }, Partial<FmcgLicenseRecord> & { workspaceId: string }>({
      query: body => ({
        url: 'api/fmcg/licenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgLicense'],
    }),

    updateLicense: builder.mutation<{ success: boolean; license: FmcgLicenseRecord }, { id: string; workspaceId: string } & Partial<FmcgLicenseRecord>>({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/licenses/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FmcgLicense', id }, 'FmcgLicense'],
    }),

    deleteLicense: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/licenses/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgLicense'],
    }),

    getTestReports: builder.query<TestReportsResponse, TestReportQuery>({
      query: (params = {}) => `api/fmcg/test-reports?${buildQueryString(params)}`,
      providesTags: ['FmcgTestReport'],
    }),

    createTestReport: builder.mutation<{ success: boolean; report: FmcgTestReportRecord }, Partial<FmcgTestReportRecord> & { workspaceId: string }>({
      query: body => ({
        url: 'api/fmcg/test-reports',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgTestReport'],
    }),

    updateTestReport: builder.mutation<{ success: boolean; report: FmcgTestReportRecord }, { id: string; workspaceId: string } & Partial<FmcgTestReportRecord>>({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/test-reports/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FmcgTestReport', id }, 'FmcgTestReport'],
    }),

    deleteTestReport: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/test-reports/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgTestReport'],
    }),

    exportFssaiData: builder.query<any, ExportQuery>({
      query: (params = {}) => `api/fmcg/export?${buildQueryString(params)}`,
    }),

    getSuppliers: builder.query<SuppliersResponse, SupplierQuery>({
      query: (params = {}) => `api/fmcg/suppliers?${buildQueryString(params)}`,
      providesTags: ['FmcgSupplier'],
    }),

    getSupplier: builder.query<{ success: boolean; supplier: FmcgSupplierRecord }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/fmcg/suppliers/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'FmcgSupplier', id }],
    }),

    createSupplier: builder.mutation<{ success: boolean; supplier: FmcgSupplierRecord }, Partial<FmcgSupplierRecord> & { workspaceId: string }>({
      query: body => ({
        url: 'api/fmcg/suppliers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgSupplier'],
    }),

    updateSupplier: builder.mutation<{ success: boolean; supplier: FmcgSupplierRecord }, { id: string; workspaceId: string } & Partial<FmcgSupplierRecord>>({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/suppliers/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FmcgSupplier', id }, 'FmcgSupplier'],
    }),

    deleteSupplier: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/suppliers/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgSupplier'],
    }),

    getDistributions: builder.query<DistributionsResponse, DistributionQuery>({
      query: (params = {}) => `api/fmcg/distributions?${buildQueryString(params)}`,
      providesTags: ['FmcgDistribution'],
    }),

    createDistribution: builder.mutation<{ success: boolean; distribution: FmcgDistributionRecord }, Partial<FmcgDistributionRecord> & { workspaceId: string }>({
      query: body => ({
        url: 'api/fmcg/distributions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgDistribution'],
    }),

    updateDistribution: builder.mutation<{ success: boolean; distribution: FmcgDistributionRecord }, { id: string; workspaceId: string } & Partial<FmcgDistributionRecord>>({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/distributions/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'FmcgDistribution', id }, 'FmcgDistribution'],
    }),

    deleteDistribution: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/distributions/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgDistribution'],
    }),

    getTraceability: builder.query<any, TraceabilityQuery>({
      query: (params = {}) => `api/fmcg/traceability?${buildQueryString(params)}`,
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetBatchesQuery,
  useGetBatchQuery,
  useCreateBatchMutation,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  useGetLicensesQuery,
  useCreateLicenseMutation,
  useUpdateLicenseMutation,
  useDeleteLicenseMutation,
  useGetTestReportsQuery,
  useCreateTestReportMutation,
  useUpdateTestReportMutation,
  useDeleteTestReportMutation,
  useLazyExportFssaiDataQuery,
  useGetSuppliersQuery,
  useGetSupplierQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useGetDistributionsQuery,
  useCreateDistributionMutation,
  useUpdateDistributionMutation,
  useDeleteDistributionMutation,
  useGetTraceabilityQuery,
} = fmcgApi
