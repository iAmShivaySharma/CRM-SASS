import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Product {
  _id: string
  workspaceId: string
  name: string
  sku: string
  description?: string
  category?: string
  unitPrice: number
  costPrice?: number
  currency: string
  stockQuantity: number
  lowStockThreshold?: number
  unit?: string
  isActive: boolean
  imageUrl?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  _id: string
  workspaceId: string
  productId: string
  type: 'in' | 'out' | 'adjustment'
  quantity: number
  reason?: string
  referenceId?: string
  referenceType?: string
  createdBy: string
  createdAt: string
}

export interface ProductsResponse {
  success: boolean
  products: Product[]
  total?: number
}

export interface ProductResponse {
  success: boolean
  product: Product
}

export interface LowStockResponse {
  success: boolean
  products: Product[]
}

export interface ProductAnalytics {
  totalProducts: number
  lowStockCount: number
  totalStockValue: number
  topMoving: Product[]
}

export interface AnalyticsResponse {
  success: boolean
  analytics: ProductAnalytics
}

export const inventoryApi = createApi({
  reducerPath: 'inventoryApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/',
    credentials: 'include',
  }),
  tagTypes: ['Product', 'StockMovement'],
  endpoints: builder => ({
    getProducts: builder.query<ProductsResponse, { workspaceId: string; category?: string; search?: string }>({
      query: ({ workspaceId, ...rest }) => {
        const params = new URLSearchParams({ workspaceId, ...rest as Record<string, string> })
        return `api/products?${params.toString()}`
      },
      providesTags: ['Product'],
    }),
    getProduct: builder.query<ProductResponse, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => `api/products/${id}?workspaceId=${workspaceId}`,
      providesTags: (result, error, { id }) => [{ type: 'Product', id }],
    }),
    createProduct: builder.mutation<ProductResponse, Partial<Product> & { workspaceId: string }>({
      query: body => ({
        url: 'api/products',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Product'],
    }),
    updateProduct: builder.mutation<ProductResponse, { id: string } & Partial<Product>>({
      query: ({ id, ...body }) => ({
        url: `api/products/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Product', id }, 'Product'],
    }),
    deleteProduct: builder.mutation<{ success: boolean; message: string }, { id: string; workspaceId: string }>({
      query: ({ id, workspaceId }) => ({
        url: `api/products/${id}?workspaceId=${workspaceId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Product'],
    }),
    getLowStock: builder.query<LowStockResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/products/low-stock?workspaceId=${workspaceId}`,
      providesTags: ['Product'],
    }),
    getProductAnalytics: builder.query<AnalyticsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/products/analytics?workspaceId=${workspaceId}`,
    }),
  }),
})

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useGetLowStockQuery,
  useGetProductAnalyticsQuery,
} = inventoryApi
