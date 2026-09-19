import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { checkPermission } from '@/lib/security/check-permission'

const connectFacebookSchema = z.object({
  workspaceId: z.string().min(1),
  accessToken: z.string().min(1),
})

async function graphGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json()
  if (!res.ok) {
    const errMsg = data?.error?.message || res.statusText
    throw new Error(`Graph API ${res.status}: ${errMsg}`)
  }
  return data
}

export async function POST(request: NextRequest) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const parsed = connectFacebookSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid input', errors: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { workspaceId, accessToken } = parsed.data

    const permError = await checkPermission(
      auth.user.id,
      workspaceId,
      'leads.create'
    )
    if (permError) {
      return permError
    }

    let me
    try {
      me = await graphGet(
        'https://graph.facebook.com/v21.0/me?fields=id,name',
        accessToken
      )
    } catch (err: any) {
      return NextResponse.json(
        {
          message: 'Facebook token invalid or expired. Please try again.',
          debug: err?.message,
        },
        { status: 400 }
      )
    }

    let businesses: { id: string; name: string }[] = []
    try {
      const bizRes = await graphGet(
        'https://graph.facebook.com/v21.0/me/businesses?fields=id,name',
        accessToken
      )
      businesses = bizRes.data || []
    } catch {
      //
    }

    const createdAccounts: Record<string, unknown>[] = []

    if (businesses.length === 0) {
      try {
        const debugRes = await graphGet(
          'https://graph.facebook.com/v21.0/debug_token?input_token=' +
            accessToken,
          accessToken
        )
        const scopes = debugRes?.data?.scopes || []
        return NextResponse.json(
          {
            success: true,
            accounts: [],
            message: `No WhatsApp Business accounts found. Token scopes: ${scopes.join(', ')}. Make sure your Facebook account owns a WhatsApp Business Account.`,
          },
          { status: 200 }
        )
      } catch {
        return NextResponse.json(
          {
            success: true,
            accounts: [],
            message:
              'No business accounts found linked to this Facebook account. Use "Connect Manually" to add your WhatsApp account with a system token.',
          },
          { status: 200 }
        )
      }
    }

    for (const biz of businesses) {
      let wabas: { id: string; name: string }[] = []
      try {
        const wabasRes = await graphGet(
          `https://graph.facebook.com/v21.0/${biz.id}/owned_whatsapp_business_accounts?fields=id,name`,
          accessToken
        )
        wabas = wabasRes.data || []
      } catch {
        continue
      }

      for (const waba of wabas) {
        let phones: {
          id: string
          display_phone_number: string
          verified_name: string
        }[] = []
        try {
          const phonesRes = await graphGet(
            `https://graph.facebook.com/v21.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name`,
            accessToken
          )
          phones = phonesRes.data || []
        } catch {
          continue
        }

        for (const phone of phones) {
          const existing = await WhatsAppAccount.findOne({
            workspaceId,
            phoneNumberId: phone.id,
          })

          if (existing) {
            existing.accessToken = accessToken
            existing.businessAccountId = waba.id
            existing.isActive = true
            await existing.save()
            createdAccounts.push(existing.toObject())
          } else {
            const newAccount = await WhatsAppAccount.create({
              workspaceId,
              displayName:
                phone.verified_name ||
                `${biz.name} - ${phone.display_phone_number}`,
              phoneNumber: phone.display_phone_number,
              phoneNumberId: phone.id,
              accessToken,
              businessAccountId: waba.id,
              provider: 'meta_cloud',
              isActive: true,
              botEnabled: false,
              createdBy: auth.user._id,
            })
            createdAccounts.push(newAccount.toObject())
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      accounts: createdAccounts,
      message:
        createdAccounts.length > 0
          ? `Connected ${createdAccounts.length} account(s)`
          : `Found ${businesses.length} business(es) but no WhatsApp phone numbers. Add a phone number in Meta Business Suite first.`,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        message: 'Failed to connect. Check your Facebook permissions.',
        debug: error?.message,
      },
      { status: 500 }
    )
  }
}
