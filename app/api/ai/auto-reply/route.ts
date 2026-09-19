import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { withLogging, withSecurityLogging } from '@/lib/logging/middleware'

const autoReplySchema = z.object({
  workspaceId: z.string().min(1),
  channel: z.enum(['whatsapp', 'sms', 'email']),
  incomingMessage: z.string().min(1),
  senderName: z.string().optional(),
  businessName: z.string().optional(),
  tone: z.enum(['professional', 'friendly', 'casual']).default('friendly'),
  businessContext: z.string().optional(),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(5)
    .optional(),
})

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
        const validation = autoReplySchema.safeParse(body)

        if (!validation.success) {
          return NextResponse.json(
            { message: 'Validation failed', errors: validation.error.errors },
            { status: 400 }
          )
        }

        const {
          channel,
          incomingMessage,
          senderName,
          businessName,
          tone,
          businessContext,
          conversationHistory,
        } = validation.data

        const apiKey = process.env.PLATFORM_OPENROUTER_API_KEY
        if (!apiKey) {
          return NextResponse.json(
            { message: 'AI service not configured' },
            { status: 503 }
          )
        }

        const resolvedBusiness = businessName || 'our company'
        const resolvedSender = senderName || 'a customer'

        const maxTokens = channel === 'email' ? 500 : 200

        const businessContextSection = businessContext
          ? `\n\nBusiness Information:\n${businessContext}`
          : ''

        const systemPrompt = `You are a customer support agent for ${resolvedBusiness}.${businessContextSection}

Tone: ${tone}
Channel: ${channel}

Reply rules:
- Stay within ${maxTokens} characters for ${channel} (email: longer ok, whatsapp/sms: keep under 200 chars)
- Answer based on the business information provided
- If you don't know the answer, say you'll follow up
- Do NOT make up prices, policies, or facts not in the business context
- Reply to this ${channel} message from ${resolvedSender}
- Do not mention that you are an AI
- Reply only with the message text — no subject line, no formatting, no preamble`

        const historyMessages = conversationHistory
          ? conversationHistory.map(m => ({ role: m.role, content: m.content }))
          : []

        const response = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer':
                process.env.NEXT_PUBLIC_APP_URL || 'https://clearcrm.app',
              'X-Title': 'ClearCRM Auto-Reply',
            },
            body: JSON.stringify({
              model: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
              messages: [
                { role: 'system', content: systemPrompt },
                ...historyMessages,
                { role: 'user', content: incomingMessage },
              ],
              max_tokens: 200,
              temperature: 0.7,
            }),
          }
        )

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          return NextResponse.json(
            {
              message: 'AI generation failed',
              error: (errorData as any).error?.message || 'Unknown error',
            },
            { status: 502 }
          )
        }

        const data = await response.json()
        const reply = data.choices?.[0]?.message?.content

        if (!reply) {
          return NextResponse.json(
            { message: 'No reply generated' },
            { status: 502 }
          )
        }

        return NextResponse.json({
          reply: reply.trim(),
          model: data.model,
        })
      } catch {
        return NextResponse.json(
          { message: 'Failed to generate reply' },
          { status: 500 }
        )
      }
    },
    { logBody: true, logHeaders: true }
  )
)
