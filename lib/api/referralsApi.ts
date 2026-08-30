import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export interface Referral {
  _id: string
  referrerId: string
  referrerWorkspaceId: string
  referredUserId?: string
  referralCode: string
  status: 'pending' | 'signed_up' | 'converted' | 'rewarded'
  createdAt: string
  updatedAt: string
}

export interface ReferralStats {
  totalReferred: number
  signedUp: number
  converted: number
  rewarded: number
}

export interface ReferralsResponse {
  success: boolean
  referralCode: string
  referralLink: string
  referrals: Referral[]
  stats: ReferralStats
}

export interface ValidateReferralResponse {
  success: boolean
  valid: boolean
  referrerId?: string
}

export const referralsApi = createApi({
  reducerPath: 'referralsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/', credentials: 'include' }),
  tagTypes: ['Referral'],
  endpoints: builder => ({
    getReferrals: builder.query<ReferralsResponse, { workspaceId: string }>({
      query: ({ workspaceId }) => `api/referrals?workspaceId=${workspaceId}`,
      providesTags: ['Referral'],
    }),
    validateReferralCode: builder.mutation<ValidateReferralResponse, { referralCode: string }>({
      query: body => ({ url: 'api/referrals', method: 'POST', body }),
    }),
  }),
})

export const { useGetReferralsQuery, useValidateReferralCodeMutation } = referralsApi
