import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { WhatsAppAccount } from '@/lib/mongodb/models/WhatsAppAccount'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'
import { log } from '@/lib/logging/logger'
import { checkPermission } from '@/lib/security/check-permission'

const connectFacebookSchema = z.object({
  workspaceId: z.string().min(1),
  accessToken: z.string().min(1),
})

async function graphGet(url: string, token: string) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph API error: ${res.status} ${text}`)
  }
  return res.json()
}

export const POST = withSecurityLogging(
  withLogging(
    async (request: NextRequest) => {
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
        if (permError) return permError

        const me = await graphGet(
          `https://graph.facebook.com/v18.0/me?fields=id,name`,
          accessToken
        )

        const businessesRes = await graphGet(
          `https://graph.facebook.com/v18.0/me/businesses?fields=id,name`,
          accessToken
        )

        const businesses: { id: string; name: string }[] =
          businessesRes.data || []
        const createdAccounts: Record<string, unknown>[] = []

        for (const biz of businesses) {
          let wabasRes
          try {
            wabasRes = await graphGet(
              `https://graph.facebook.com/v18.0/${biz.id}/owned_whatsapp_business_accounts?fields=id,name`,
              accessToken
            )
          } catch {
            continue
          }

          const wabas: { id: string; name: string }[] = wabasRes.data || []

          for (const waba of wabas) {
            let phonesRes
            try {
              phonesRes = await graphGet(
                `https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?fields=id,display_phone_number,verified_name`,
                accessToken
              )
            } catch {
              continue
            }

            const phones: {
              id: string
              display_phone_number: string
              verified_name: string
            }[] = phonesRes.data || []

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
                  name:
                    phone.verified_name ||
                    `${biz.name} - ${phone.display_phone_number}`,
                  phoneNumber: phone.display_phone_number,
                  phoneNumberId: phone.id,
                  accessToken,
                  businessAccountId: waba.id,
                  provider: 'meta_cloud',
                  isActive: true,
                  botEnabled: false,
                })
                createdAccounts.push(newAccount.toObject())
              }
            }
          }
        }

        log.info('whatsapp-fb-connect', {
          userId: auth.user.id,
          workspaceId,
          facebookUserId: me.id,
          accountsConnected: createdAccounts.length,
        })

        return NextResponse.json({
          success: true,
          accounts: createdAccounts,
        })
      } catch (error) {
        log.error('whatsapp-fb-connect-error', { error })
        return NextResponse.json(
          { message: 'Failed to connect Facebook WhatsApp accounts' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
