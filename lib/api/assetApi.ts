import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface AssetRecord {
  _id: string
  workspaceId: string
  name: string
  category: string
  subcategory?: string
  brand: string
  model: string
  serialNumber: string
  assetTag?: string
  purchaseDate: string
  purchasePrice: number
  vendor?: string
  condition: 'excellent' | 'good' | 'fair' | 'poor'
  status:
    | 'available'
    | 'allocated'
    | 'maintenance'
    | 'retired'
    | 'lost'
    | 'damaged'
  location: string
  department?: string
  warranty?: {
    expiryDate: string
    provider: string
  }
  specifications?: Record<string, string>
  images?: string[]
  documents?: string[]
  depreciation?: {
    method: string
    rate: number
    currentValue: number
  }
  insurance?: {
    provider: string
    policyNumber: string
    expiryDate: string
  }
  notes?: string
  createdBy?: {
    _id: string
    fullName: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

export interface AssetQuery {
  workspaceId?: string
  category?: string
  status?: string
  search?: string
  page?: number
  limit?: number
}

export interface CreateAssetRequest {
  workspaceId?: string
  name: string
  category: string
  brand: string
  model: string
  serialNumber: string
  purchaseDate: string
  purchasePrice: number
  location: string
  subcategory?: string
  assetTag?: string
  vendor?: string
  condition?: string
  status?: string
  department?: string
  warranty?: {
    expiryDate: string
    provider: string
  }
  specifications?: Record<string, string>
  notes?: string
}

export interface UpdateAssetRequest {
  id: string
  name?: string
  category?: string
  brand?: string
  model?: string
  serialNumber?: string
  purchaseDate?: string
  purchasePrice?: number
  location?: string
  condition?: string
  status?: string
  department?: string
  warranty?: {
    expiryDate: string
    provider: string
  }
  specifications?: Record<string, string>
  notes?: string
}

export interface AssetStats {
  totalAssets: number
  byStatus: {
    available: number
    allocated: number
    maintenance: number
    retired: number
    lost: number
    damaged: number
  }
  totalPortfolioValue: number
  categoryBreakdown: Array<{
    _id: string
    count: number
    totalValue: number
  }>
  upcomingMaintenance: number
  overdueReturns: number
}

export const assetApi = createApi({
  reducerPath: 'assetApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api/assets',
    credentials: 'include',
  }),
  tagTypes: ['Asset', 'AssetStats'],
  endpoints: builder => ({
    getAssets: builder.query<
      {
        assets: AssetRecord[]
        pagination: {
          page: number
          limit: number
          total: number
          pages: number
        }
      },
      AssetQuery
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== 'all') {
            searchParams.append(key, value.toString())
          }
        })
        return `?${searchParams.toString()}`
      },
      providesTags: ['Asset'],
    }),

    getAsset: builder.query<{ asset: AssetRecord }, string>({
      query: id => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Asset', id }],
    }),

    createAsset: builder.mutation<
      { success: boolean; asset: AssetRecord },
      CreateAssetRequest
    >({
      query: body => ({
        url: '',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Asset', 'AssetStats'],
    }),

    updateAsset: builder.mutation<
      { success: boolean; asset: AssetRecord },
      UpdateAssetRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Asset', id },
        'Asset',
        'AssetStats',
      ],
    }),

    deleteAsset: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({
        url: `/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Asset', 'AssetStats'],
    }),

    getAssetStats: builder.query<AssetStats, { workspaceId?: string }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        if (params.workspaceId) {
          searchParams.append('workspaceId', params.workspaceId)
        }
        return `../assets/stats?${searchParams.toString()}`
      },
      providesTags: ['AssetStats'],
    }),
  }),
})

export const {
  useGetAssetsQuery,
  useGetAssetQuery,
  useCreateAssetMutation,
  useUpdateAssetMutation,
  useDeleteAssetMutation,
  useGetAssetStatsQuery,
} = assetApi
