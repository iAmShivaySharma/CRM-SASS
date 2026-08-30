import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface BlogAuthor {
  name: string
  avatar?: string
  bio?: string
}

export interface Blog {
  _id: string
  title: string
  slug: string
  content: string
  excerpt?: string
  featuredImage?: string
  featuredImageAlt?: string
  categoryId: string
  category?: { _id: string; name: string; slug: string }
  tags?: string[]
  author: BlogAuthor
  status: 'draft' | 'published' | 'archived'
  isFeatured?: boolean
  views?: number
  publishedAt?: string
  readTime?: number
  createdAt: string
  updatedAt: string
}

export interface BlogCategory {
  _id: string
  name: string
  slug: string
  description?: string
  postCount: number
  isActive: boolean
  createdAt: string
}

export interface BlogsResponse {
  blogs: Blog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export interface BlogResponse {
  blog: Blog
  relatedPosts?: Blog[]
}

export interface CategoriesResponse {
  categories: BlogCategory[]
}

export interface CreateBlogBody {
  title: string
  slug: string
  content: string
  excerpt?: string
  featuredImage?: string
  categoryId: string
  tags?: string[]
  author: BlogAuthor
  status?: 'draft' | 'published' | 'archived'
  isFeatured?: boolean
  metaTitle?: string
  metaDescription?: string
}

export const blogApi = createApi({
  reducerPath: 'blogApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['Blog', 'BlogCategory'],
  endpoints: builder => ({
    getBlogs: builder.query<
      BlogsResponse,
      { page?: number; limit?: number; category?: string; search?: string; status?: string; featured?: boolean }
    >({
      query: ({ page = 1, limit = 12, category, search, status, featured }) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) })
        if (category) params.set('category', category)
        if (search) params.set('search', search)
        if (status) params.set('status', status)
        if (featured) params.set('featured', 'true')
        return `api/blogs?${params.toString()}`
      },
      providesTags: ['Blog'],
    }),
    getBlog: builder.query<BlogResponse, string>({
      query: slug => `api/blogs/${slug}`,
      providesTags: (result, error, slug) => [{ type: 'Blog', id: slug }],
    }),
    createBlog: builder.mutation<{ blog: Blog }, CreateBlogBody>({
      query: body => ({ url: 'api/blogs', method: 'POST', body }),
      invalidatesTags: ['Blog'],
    }),
    updateBlog: builder.mutation<{ blog: Blog }, { slug: string } & Partial<CreateBlogBody>>({
      query: ({ slug, ...body }) => ({ url: `api/blogs/${slug}`, method: 'PUT', body }),
      invalidatesTags: (result, error, { slug }) => [{ type: 'Blog', id: slug }, 'Blog'],
    }),
    deleteBlog: builder.mutation<{ message: string }, string>({
      query: slug => ({ url: `api/blogs/${slug}`, method: 'DELETE' }),
      invalidatesTags: ['Blog'],
    }),
    getCategories: builder.query<CategoriesResponse, void>({
      query: () => 'api/blogs/categories',
      providesTags: ['BlogCategory'],
    }),
    createCategory: builder.mutation<{ category: BlogCategory }, { name: string; slug: string; description?: string }>({
      query: body => ({ url: 'api/blogs/categories', method: 'POST', body }),
      invalidatesTags: ['BlogCategory'],
    }),
    updateCategory: builder.mutation<{ category: BlogCategory }, { id: string; name?: string; description?: string; isActive?: boolean }>({
      query: ({ id, ...body }) => ({ url: `api/blogs/categories/${id}`, method: 'PUT', body }),
      invalidatesTags: ['BlogCategory'],
    }),
    deleteCategory: builder.mutation<{ message: string }, string>({
      query: id => ({ url: `api/blogs/categories/${id}`, method: 'DELETE' }),
      invalidatesTags: ['BlogCategory'],
    }),
  }),
})

export const {
  useGetBlogsQuery,
  useGetBlogQuery,
  useCreateBlogMutation,
  useUpdateBlogMutation,
  useDeleteBlogMutation,
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = blogApi
