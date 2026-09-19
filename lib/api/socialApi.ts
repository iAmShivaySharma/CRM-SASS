import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface SocialAccount {
  id: string
  workspaceId: string
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter'
  accountName: string
  accountId: string
  profileUrl?: string
  profileImage?: string
  isActive: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface SocialPostPlatform {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter'
  accountId: string
  customContent?: string
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  publishedAt?: string
  externalPostId?: string
  error?: string
  analytics?: {
    likes: number
    shares: number
    comments: number
    reach: number
  }
}

export interface SocialPost {
  id: string
  workspaceId: string
  content: string
  mediaUrls?: string[]
  platforms: SocialPostPlatform[]
  scheduledAt?: string
  publishedAt?: string
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed'
  aiGenerated: boolean
  createdBy: string
  createdAt: string
  updatedAt: string
}

interface AccountsResponse {
  success: boolean
  accounts: SocialAccount[]
}

interface AccountResponse {
  success: boolean
  account: SocialAccount
}

interface PostsResponse {
  success: boolean
  posts: SocialPost[]
  total: number
  page: number
  totalPages: number
}

interface PostResponse {
  success: boolean
  post: SocialPost
}

interface GenerateResponse {
  content: string
  hashtags: string[]
  platform: string
}

export const socialApi = createApi({
  reducerPath: 'socialApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['SocialAccount', 'SocialPost'],
  endpoints: builder => ({
    getSocialAccounts: builder.query<AccountsResponse, { workspaceId: string }>(
      {
        query: ({ workspaceId }) =>
          `api/social/accounts?workspaceId=${workspaceId}`,
        providesTags: ['SocialAccount'],
      }
    ),
    connectSocialAccount: builder.mutation<
      AccountResponse,
      {
        workspaceId: string
        platform: string
        accountName: string
        accountId: string
        accessToken: string
        profileUrl?: string
        profileImage?: string
      }
    >({
      query: body => ({
        url: 'api/social/accounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SocialAccount'],
    }),
    disconnectSocialAccount: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({
        url: `api/social/accounts?id=${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SocialAccount'],
    }),
    getSocialPosts: builder.query<
      PostsResponse,
      { workspaceId: string; status?: string; page?: number; limit?: number }
    >({
      query: ({ workspaceId, status, page = 1, limit = 20 }) => {
        let url = `api/social/posts?workspaceId=${workspaceId}&page=${page}&limit=${limit}`
        if (status) {
          url += `&status=${status}`
        }
        return url
      },
      providesTags: ['SocialPost'],
    }),
    createSocialPost: builder.mutation<
      PostResponse,
      {
        workspaceId: string
        content: string
        mediaUrls?: string[]
        platforms: Array<{
          platform: string
          accountId: string
          customContent?: string
        }>
        scheduledAt?: string
        status?: string
        aiGenerated?: boolean
      }
    >({
      query: body => ({
        url: 'api/social/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['SocialPost'],
    }),
    updateSocialPost: builder.mutation<
      PostResponse,
      {
        id: string
        content?: string
        mediaUrls?: string[]
        platforms?: Array<{
          platform: string
          accountId: string
          customContent?: string
        }>
        scheduledAt?: string
        status?: string
      }
    >({
      query: ({ id, ...body }) => ({
        url: `api/social/posts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['SocialPost'],
    }),
    deleteSocialPost: builder.mutation<
      { success: boolean; message: string },
      string
    >({
      query: id => ({
        url: `api/social/posts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['SocialPost'],
    }),
    generateAIPost: builder.mutation<
      GenerateResponse,
      {
        workspaceId: string
        topic: string
        platform: string
        tone: string
        brandName?: string
        includeHashtags?: boolean
        includeEmoji?: boolean
        length?: string
      }
    >({
      query: body => ({
        url: 'api/social/generate',
        method: 'POST',
        body,
      }),
    }),
  }),
})

export const {
  useGetSocialAccountsQuery,
  useConnectSocialAccountMutation,
  useDisconnectSocialAccountMutation,
  useGetSocialPostsQuery,
  useCreateSocialPostMutation,
  useUpdateSocialPostMutation,
  useDeleteSocialPostMutation,
  useGenerateAIPostMutation,
} = socialApi
