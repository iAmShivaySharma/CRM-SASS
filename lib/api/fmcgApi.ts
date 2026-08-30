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
  testType:
    | 'microbiological'
    | 'chemical'
    | 'physical'
    | 'sensory'
    | 'nutritional'
    | 'pesticide'
    | 'heavy_metals'
    | 'other'
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
  recipientType:
    'distributor' | 'retailer' | 'wholesaler' | 'direct_customer' | 'export'
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

export interface FmcgRmLotRecord {
  _id: string
  id: string
  workspaceId: string
  receiptDate: string
  supplierId?: string
  supplierName: string
  supplierFssaiNumber?: string
  purchaseOrderNumber?: string
  materialName: string
  quantityReceived: number
  unit: string
  supplierLotNumber?: string
  internalLotNumber: string
  testStatus: 'accepted' | 'rejected' | 'under_test'
  storageLocation?: string
  remarks?: string
  receivedBy: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgCleaningEntry {
  area: string
  cleanedBy: string
  time: string
  sanitizerUsed?: string
  verified: boolean
}

export interface FmcgCleaningLogRecord {
  _id: string
  id: string
  workspaceId: string
  date: string
  shift: 'morning' | 'afternoon' | 'evening' | 'full_day'
  entries: FmcgCleaningEntry[]
  issuesNoted?: string
  supervisorName: string
  supervisorSignOff: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgPestCheckEntry {
  area: string
  evidenceFound: boolean
  actionTaken?: string
}

export interface FmcgPestLogRecord {
  _id: string
  id: string
  workspaceId: string
  weekEnding: string
  type: 'internal_check' | 'pco_visit'
  entries: FmcgPestCheckEntry[]
  pcoName?: string
  pcoLicenseNumber?: string
  treatmentChemicals?: string
  checkedBy: string
  findings?: string
  reportUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgComplaintRecord {
  _id: string
  id: string
  workspaceId: string
  referenceNumber: string
  dateReceived: string
  source: 'consumer' | 'retailer' | 'distributor' | 'online_review' | 'internal'
  customerName?: string
  customerContact?: string
  productId?: string
  batchNumber?: string
  nature:
    | 'foreign_body'
    | 'spoilage'
    | 'illness'
    | 'labelling'
    | 'weight'
    | 'packaging'
    | 'other'
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  investigatedBy?: string
  rootCauseFound?: string
  actionTaken:
    | 'replacement'
    | 'refund'
    | 'recall_initiated'
    | 'no_action'
    | 'under_investigation'
  closedDate?: string
  customerInformed: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgTemperatureLogRecord {
  _id: string
  id: string
  workspaceId: string
  date: string
  location: string
  temperature: number
  humidity?: number
  loggedBy: string
  anomalyNoted: boolean
  anomalyDescription?: string
  actionTaken?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgCalibrationLogRecord {
  _id: string
  id: string
  workspaceId: string
  equipmentName: string
  equipmentId?: string
  calibrationDate: string
  nextDueDate: string
  method: string
  result: 'pass' | 'fail' | 'adjusted'
  referenceStandard?: string
  deviationFound?: string
  correctionApplied?: string
  calibratedBy: string
  notes?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgWaterTestParameter {
  name: string
  value: string
  unit?: string
  limit?: string
  status: 'pass' | 'fail'
}

export interface FmcgWaterTestRecord {
  _id: string
  id: string
  workspaceId: string
  testDate: string
  labName: string
  labAccreditationNumber?: string
  sampleSource: string
  parameters: FmcgWaterTestParameter[]
  overallResult: 'pass' | 'fail'
  validUntil: string
  reportUrl?: string
  remarks?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface FmcgDistributorNotification {
  recipientName: string
  recipientContact: string
  notifiedAt: string
  channel: 'email' | 'phone' | 'whatsapp'
  acknowledged: boolean
  quantityHeld?: number
}

export interface FmcgRecallEventRecord {
  _id: string
  id: string
  workspaceId: string
  recallNumber: string
  recallClass: 'I' | 'II' | 'III'
  status: 'initiated' | 'in_progress' | 'closed'
  trigger:
    | 'internal_testing'
    | 'consumer_complaint'
    | 'distributor_report'
    | 'fssai_alert'
    | 'audit_finding'
    | 'supplier_notification'
    | 'batch_record_error'
    | 'labelling_error'
  affectedBatchNumbers: string[]
  affectedProductIds: string[]
  description: string
  initiatedAt: string
  initiatedBy: string
  fssaiNotificationAt?: string
  fssaiReferenceNumber?: string
  distributorNotifications?: FmcgDistributorNotification[]
  quantityManufactured?: number
  quantityDistributed?: number
  quantityInStock?: number
  quantityRecalled?: number
  quantityReturned?: number
  disposalMethod?: string
  disposalDate?: string
  disposalSupervisor?: string
  rootCause?: string
  correctiveActions?: string
  preventiveActions?: string
  closedAt?: string
  closedBy?: string
  finalReportUrl?: string
  mockDrill: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface RmLotsResponse extends PaginatedResponse<FmcgRmLotRecord> {
  rmLots: FmcgRmLotRecord[]
}

export interface CleaningLogsResponse extends PaginatedResponse<FmcgCleaningLogRecord> {
  cleaningLogs: FmcgCleaningLogRecord[]
}

export interface PestLogsResponse extends PaginatedResponse<FmcgPestLogRecord> {
  pestLogs: FmcgPestLogRecord[]
}

export interface ComplaintsResponse extends PaginatedResponse<FmcgComplaintRecord> {
  complaints: FmcgComplaintRecord[]
}

export interface TemperatureLogsResponse extends PaginatedResponse<FmcgTemperatureLogRecord> {
  temperatureLogs: FmcgTemperatureLogRecord[]
}

export interface CalibrationLogsResponse extends PaginatedResponse<FmcgCalibrationLogRecord> {
  calibrationLogs: FmcgCalibrationLogRecord[]
}

export interface WaterTestsResponse extends PaginatedResponse<FmcgWaterTestRecord> {
  waterTests: FmcgWaterTestRecord[]
}

export interface RecallEventsResponse extends PaginatedResponse<FmcgRecallEventRecord> {
  recallEvents: FmcgRecallEventRecord[]
}

export interface RmLotQuery {
  workspaceId?: string
  page?: number
  limit?: number
  materialName?: string
  testStatus?: string
  search?: string
}

export interface CleaningLogQuery {
  workspaceId?: string
  page?: number
  limit?: number
  shift?: string
  dateFrom?: string
  dateTo?: string
}

export interface PestLogQuery {
  workspaceId?: string
  page?: number
  limit?: number
  type?: string
  dateFrom?: string
  dateTo?: string
}

export interface ComplaintQuery {
  workspaceId?: string
  page?: number
  limit?: number
  severity?: string
  source?: string
  nature?: string
  search?: string
}

export interface TemperatureLogQuery {
  workspaceId?: string
  page?: number
  limit?: number
  location?: string
  anomalyNoted?: boolean
  dateFrom?: string
  dateTo?: string
}

export interface CalibrationLogQuery {
  workspaceId?: string
  page?: number
  limit?: number
  equipmentName?: string
  result?: string
  dateFrom?: string
  dateTo?: string
}

export interface WaterTestQuery {
  workspaceId?: string
  page?: number
  limit?: number
  overallResult?: string
  sampleSource?: string
  dateFrom?: string
  dateTo?: string
}

export interface RecallEventQuery {
  workspaceId?: string
  page?: number
  limit?: number
  status?: string
  recallClass?: string
  mockDrill?: boolean
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
  tagTypes: [
    'FmcgProduct',
    'FmcgBatch',
    'FmcgLicense',
    'FmcgTestReport',
    'FmcgSupplier',
    'FmcgDistribution',
    'FmcgRmLot',
    'FmcgCleaningLog',
    'FmcgPestLog',
    'FmcgComplaint',
    'FmcgTemperatureLog',
    'FmcgCalibrationLog',
    'FmcgWaterTest',
    'FmcgRecallEvent',
  ],
  endpoints: builder => ({
    getProducts: builder.query<ProductsResponse, ProductQuery>({
      query: (params = {}) => `api/fmcg/products?${buildQueryString(params)}`,
      providesTags: ['FmcgProduct'],
    }),

    getProduct: builder.query<
      { success: boolean; product: FmcgProductRecord },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `api/fmcg/products/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'FmcgProduct', id }],
    }),

    createProduct: builder.mutation<
      { success: boolean; product: FmcgProductRecord },
      Partial<FmcgProductRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgProduct'],
    }),

    updateProduct: builder.mutation<
      { success: boolean; product: FmcgProductRecord },
      { id: string; workspaceId: string } & Partial<FmcgProductRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/products/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgProduct', id },
        'FmcgProduct',
      ],
    }),

    deleteProduct: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
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

    getBatch: builder.query<
      { success: boolean; batch: FmcgBatchRecord },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `api/fmcg/batches/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'FmcgBatch', id }],
    }),

    createBatch: builder.mutation<
      { success: boolean; batch: FmcgBatchRecord },
      Partial<FmcgBatchRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/batches',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgBatch'],
    }),

    updateBatch: builder.mutation<
      { success: boolean; batch: FmcgBatchRecord },
      { id: string; workspaceId: string } & Partial<FmcgBatchRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/batches/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgBatch', id },
        'FmcgBatch',
      ],
    }),

    deleteBatch: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
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

    createLicense: builder.mutation<
      { success: boolean; license: FmcgLicenseRecord },
      Partial<FmcgLicenseRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/licenses',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgLicense'],
    }),

    updateLicense: builder.mutation<
      { success: boolean; license: FmcgLicenseRecord },
      { id: string; workspaceId: string } & Partial<FmcgLicenseRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/licenses/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgLicense', id },
        'FmcgLicense',
      ],
    }),

    deleteLicense: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/licenses/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgLicense'],
    }),

    getTestReports: builder.query<TestReportsResponse, TestReportQuery>({
      query: (params = {}) =>
        `api/fmcg/test-reports?${buildQueryString(params)}`,
      providesTags: ['FmcgTestReport'],
    }),

    createTestReport: builder.mutation<
      { success: boolean; report: FmcgTestReportRecord },
      Partial<FmcgTestReportRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/test-reports',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgTestReport'],
    }),

    updateTestReport: builder.mutation<
      { success: boolean; report: FmcgTestReportRecord },
      { id: string; workspaceId: string } & Partial<FmcgTestReportRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/test-reports/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgTestReport', id },
        'FmcgTestReport',
      ],
    }),

    deleteTestReport: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
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

    getSupplier: builder.query<
      { success: boolean; supplier: FmcgSupplierRecord },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `api/fmcg/suppliers/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'FmcgSupplier', id }],
    }),

    createSupplier: builder.mutation<
      { success: boolean; supplier: FmcgSupplierRecord },
      Partial<FmcgSupplierRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/suppliers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgSupplier'],
    }),

    updateSupplier: builder.mutation<
      { success: boolean; supplier: FmcgSupplierRecord },
      { id: string; workspaceId: string } & Partial<FmcgSupplierRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/suppliers/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgSupplier', id },
        'FmcgSupplier',
      ],
    }),

    deleteSupplier: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/suppliers/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgSupplier'],
    }),

    getDistributions: builder.query<DistributionsResponse, DistributionQuery>({
      query: (params = {}) =>
        `api/fmcg/distributions?${buildQueryString(params)}`,
      providesTags: ['FmcgDistribution'],
    }),

    createDistribution: builder.mutation<
      { success: boolean; distribution: FmcgDistributionRecord },
      Partial<FmcgDistributionRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/distributions',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgDistribution'],
    }),

    updateDistribution: builder.mutation<
      { success: boolean; distribution: FmcgDistributionRecord },
      { id: string; workspaceId: string } & Partial<FmcgDistributionRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/distributions/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgDistribution', id },
        'FmcgDistribution',
      ],
    }),

    deleteDistribution: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/distributions/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgDistribution'],
    }),

    getTraceability: builder.query<any, TraceabilityQuery>({
      query: (params = {}) =>
        `api/fmcg/traceability?${buildQueryString(params)}`,
    }),

    getRmLots: builder.query<RmLotsResponse, RmLotQuery>({
      query: (params = {}) => `api/fmcg/rm-lots?${buildQueryString(params)}`,
      providesTags: ['FmcgRmLot'],
    }),

    createRmLot: builder.mutation<
      { success: boolean; rmLot: FmcgRmLotRecord },
      Partial<FmcgRmLotRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/rm-lots',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgRmLot'],
    }),

    updateRmLot: builder.mutation<
      { success: boolean; rmLot: FmcgRmLotRecord },
      { id: string; workspaceId: string } & Partial<FmcgRmLotRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/rm-lots/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgRmLot', id },
        'FmcgRmLot',
      ],
    }),

    deleteRmLot: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/rm-lots/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgRmLot'],
    }),

    getCleaningLogs: builder.query<CleaningLogsResponse, CleaningLogQuery>({
      query: (params = {}) =>
        `api/fmcg/cleaning-logs?${buildQueryString(params)}`,
      providesTags: ['FmcgCleaningLog'],
    }),

    createCleaningLog: builder.mutation<
      { success: boolean; cleaningLog: FmcgCleaningLogRecord },
      Partial<FmcgCleaningLogRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/cleaning-logs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgCleaningLog'],
    }),

    updateCleaningLog: builder.mutation<
      { success: boolean; cleaningLog: FmcgCleaningLogRecord },
      { id: string; workspaceId: string } & Partial<FmcgCleaningLogRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/cleaning-logs/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgCleaningLog', id },
        'FmcgCleaningLog',
      ],
    }),

    deleteCleaningLog: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/cleaning-logs/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgCleaningLog'],
    }),

    getPestLogs: builder.query<PestLogsResponse, PestLogQuery>({
      query: (params = {}) => `api/fmcg/pest-logs?${buildQueryString(params)}`,
      providesTags: ['FmcgPestLog'],
    }),

    createPestLog: builder.mutation<
      { success: boolean; pestLog: FmcgPestLogRecord },
      Partial<FmcgPestLogRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/pest-logs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgPestLog'],
    }),

    updatePestLog: builder.mutation<
      { success: boolean; pestLog: FmcgPestLogRecord },
      { id: string; workspaceId: string } & Partial<FmcgPestLogRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/pest-logs/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgPestLog', id },
        'FmcgPestLog',
      ],
    }),

    deletePestLog: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/pest-logs/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgPestLog'],
    }),

    getComplaints: builder.query<ComplaintsResponse, ComplaintQuery>({
      query: (params = {}) => `api/fmcg/complaints?${buildQueryString(params)}`,
      providesTags: ['FmcgComplaint'],
    }),

    createComplaint: builder.mutation<
      { success: boolean; complaint: FmcgComplaintRecord },
      Partial<FmcgComplaintRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/complaints',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgComplaint'],
    }),

    updateComplaint: builder.mutation<
      { success: boolean; complaint: FmcgComplaintRecord },
      { id: string; workspaceId: string } & Partial<FmcgComplaintRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/complaints/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgComplaint', id },
        'FmcgComplaint',
      ],
    }),

    deleteComplaint: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/complaints/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgComplaint'],
    }),

    getTemperatureLogs: builder.query<
      TemperatureLogsResponse,
      TemperatureLogQuery
    >({
      query: (params = {}) =>
        `api/fmcg/temperature-logs?${buildQueryString(params)}`,
      providesTags: ['FmcgTemperatureLog'],
    }),

    createTemperatureLog: builder.mutation<
      { success: boolean; temperatureLog: FmcgTemperatureLogRecord },
      Partial<FmcgTemperatureLogRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/temperature-logs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgTemperatureLog'],
    }),

    updateTemperatureLog: builder.mutation<
      { success: boolean; temperatureLog: FmcgTemperatureLogRecord },
      { id: string; workspaceId: string } & Partial<FmcgTemperatureLogRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/temperature-logs/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgTemperatureLog', id },
        'FmcgTemperatureLog',
      ],
    }),

    deleteTemperatureLog: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/temperature-logs/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgTemperatureLog'],
    }),

    getCalibrationLogs: builder.query<
      CalibrationLogsResponse,
      CalibrationLogQuery
    >({
      query: (params = {}) =>
        `api/fmcg/calibration-logs?${buildQueryString(params)}`,
      providesTags: ['FmcgCalibrationLog'],
    }),

    createCalibrationLog: builder.mutation<
      { success: boolean; calibrationLog: FmcgCalibrationLogRecord },
      Partial<FmcgCalibrationLogRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/calibration-logs',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgCalibrationLog'],
    }),

    updateCalibrationLog: builder.mutation<
      { success: boolean; calibrationLog: FmcgCalibrationLogRecord },
      { id: string; workspaceId: string } & Partial<FmcgCalibrationLogRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/calibration-logs/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgCalibrationLog', id },
        'FmcgCalibrationLog',
      ],
    }),

    deleteCalibrationLog: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/calibration-logs/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgCalibrationLog'],
    }),

    getWaterTests: builder.query<WaterTestsResponse, WaterTestQuery>({
      query: (params = {}) =>
        `api/fmcg/water-tests?${buildQueryString(params)}`,
      providesTags: ['FmcgWaterTest'],
    }),

    createWaterTest: builder.mutation<
      { success: boolean; waterTest: FmcgWaterTestRecord },
      Partial<FmcgWaterTestRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/water-tests',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgWaterTest'],
    }),

    updateWaterTest: builder.mutation<
      { success: boolean; waterTest: FmcgWaterTestRecord },
      { id: string; workspaceId: string } & Partial<FmcgWaterTestRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/water-tests/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgWaterTest', id },
        'FmcgWaterTest',
      ],
    }),

    deleteWaterTest: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/water-tests/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgWaterTest'],
    }),

    getRecallEvents: builder.query<RecallEventsResponse, RecallEventQuery>({
      query: (params = {}) =>
        `api/fmcg/recall-events?${buildQueryString(params)}`,
      providesTags: ['FmcgRecallEvent'],
    }),

    getRecallEvent: builder.query<
      { success: boolean; recallEvent: FmcgRecallEventRecord },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) =>
        `api/fmcg/recall-events/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [
        { type: 'FmcgRecallEvent', id },
      ],
    }),

    createRecallEvent: builder.mutation<
      { success: boolean; recallEvent: FmcgRecallEventRecord },
      Partial<FmcgRecallEventRecord> & { workspaceId: string }
    >({
      query: body => ({
        url: 'api/fmcg/recall-events',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['FmcgRecallEvent'],
    }),

    updateRecallEvent: builder.mutation<
      { success: boolean; recallEvent: FmcgRecallEventRecord },
      { id: string; workspaceId: string } & Partial<FmcgRecallEventRecord>
    >({
      query: ({ id, workspaceId, ...body }) => ({
        url: `api/fmcg/recall-events/${id}?workspaceId=${workspaceId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'FmcgRecallEvent', id },
        'FmcgRecallEvent',
      ],
    }),

    deleteRecallEvent: builder.mutation<
      { success: boolean; message: string },
      { id: string; workspaceId: string }
    >({
      query: ({ id, workspaceId }) => ({
        url: `api/fmcg/recall-events/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['FmcgRecallEvent'],
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
  useGetRmLotsQuery,
  useCreateRmLotMutation,
  useUpdateRmLotMutation,
  useDeleteRmLotMutation,
  useGetCleaningLogsQuery,
  useCreateCleaningLogMutation,
  useUpdateCleaningLogMutation,
  useDeleteCleaningLogMutation,
  useGetPestLogsQuery,
  useCreatePestLogMutation,
  useUpdatePestLogMutation,
  useDeletePestLogMutation,
  useGetComplaintsQuery,
  useCreateComplaintMutation,
  useUpdateComplaintMutation,
  useDeleteComplaintMutation,
  useGetTemperatureLogsQuery,
  useCreateTemperatureLogMutation,
  useUpdateTemperatureLogMutation,
  useDeleteTemperatureLogMutation,
  useGetCalibrationLogsQuery,
  useCreateCalibrationLogMutation,
  useUpdateCalibrationLogMutation,
  useDeleteCalibrationLogMutation,
  useGetWaterTestsQuery,
  useCreateWaterTestMutation,
  useUpdateWaterTestMutation,
  useDeleteWaterTestMutation,
  useGetRecallEventsQuery,
  useGetRecallEventQuery,
  useCreateRecallEventMutation,
  useUpdateRecallEventMutation,
  useDeleteRecallEventMutation,
} = fmcgApi
