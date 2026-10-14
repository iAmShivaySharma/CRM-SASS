import { api } from './index'

export interface AssetRecord {
  id: string
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
    id: string
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
    id: string
    count: number
    totalValue: number
  }>
  upcomingMaintenance: number
  overdueReturns: number
}

const assetApi = api.injectEndpoints({
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
        return `api/assets?${searchParams.toString()}`
      },
      providesTags: ['Asset'],
    }),

    getAsset: builder.query<{ asset: AssetRecord }, string>({
      query: id => `api/assets/${id}`,
      providesTags: (result, error, id) => [{ type: 'Asset', id }],
    }),

    createAsset: builder.mutation<
      { success: boolean; asset: AssetRecord },
      CreateAssetRequest
    >({
      query: body => ({
        url: 'api/assets',
        method: 'POST',
        body,
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Asset', 'AssetStats']))
      },
    }),

    updateAsset: builder.mutation<
      { success: boolean; asset: AssetRecord },
      UpdateAssetRequest
    >({
      query: ({ id, ...body }) => ({
        url: `api/assets/${id}`,
        method: 'PUT',
        body,
      }),
      async onQueryStarted({ id }, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(
          api.util.invalidateTags([
            { type: 'Asset', id },
            'Asset',
            'AssetStats',
          ])
        )
      },
    }),

    deleteAsset: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({
        url: `api/assets/${id}`,
        method: 'DELETE',
      }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        await queryFulfilled
        dispatch(api.util.invalidateTags(['Asset', 'AssetStats']))
      },
    }),

    getAssetStats: builder.query<AssetStats, { workspaceId?: string }>({
      query: (params = {}) => {
        const searchParams = new URLSearchParams()
        if (params.workspaceId) {
          searchParams.append('workspaceId', params.workspaceId)
        }
        return `api/assets/stats?${searchParams.toString()}`
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
