import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'

const generateSchema = z.object({
  workspaceId: z.string().min(1),
  topic: z.string().min(1).max(500),
  platform: z.enum(['facebook', 'instagram', 'linkedin', 'twitter']),
  tone: z
    .enum(['professional', 'casual', 'fun', 'inspirational'])
    .default('professional'),
  brandName: z.string().max(100).optional(),
  includeHashtags: z.boolean().default(true),
  includeEmoji: z.boolean().default(false),
  length: z.enum(['short', 'medium', 'long']).default('medium'),
})

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
    const validation = generateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { message: 'Validation failed', errors: validation.error.errors },
        { status: 400 }
      )
    }

    const apiKey = process.env.PLATFORM_OPENROUTER_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { message: 'AI service not configured' },
        { status: 503 }
      )
    }

    const {
      topic,
      platform,
      tone,
      brandName,
      includeHashtags,
      includeEmoji,
      length,
    } = validation.data

    const lengthGuide: Record<string, string> = {
      short: '1-2 sentences',
      medium: '2-4 sentences',
      long: '4-6 sentences',
    }

    const platformGuide: Record<string, string> = {
      twitter:
        'Keep it under 280 characters. Be punchy, direct, and conversational.',
      instagram:
        'Write an engaging visual-focused caption. Use line breaks for readability.',
      linkedin:
        'Write a professional, thought-leadership style post. Can be longer and more detailed.',
      facebook:
        'Write an engaging, shareable post. Balance between casual and informative.',
    }

    const brandMention = brandName ? ` for ${brandName}` : ''
    const hashtagInstruction = includeHashtags
      ? 'Include 3-5 relevant hashtags at the end.'
      : 'Do not include any hashtags.'
    const emojiInstruction = includeEmoji
      ? 'Use emojis naturally throughout the text.'
      : 'Do not use any emojis.'

    const systemPrompt = `You are a social media content creator${brandMention}.
Tone: ${tone}
Platform: ${platform}
${platformGuide[platform]}

Rules:
- Write ${lengthGuide[length]} of content
- ${hashtagInstruction}
- ${emojiInstruction}
- Do not include any preamble or explanation
- Return ONLY the post content
- Separate hashtags on a new line at the end if included`

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.NEXT_PUBLIC_APP_URL || 'https://clearcrm.app',
          'X-Title': 'ClearCRM Social Media Generator',
        },
        body: JSON.stringify({
          model: 'nvidia/llama-3.1-nemotron-70b-instruct:free',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Write a ${platform} post about: ${topic}`,
            },
          ],
          max_tokens: 500,
          temperature: 0.8,
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
    const generatedContent = data.choices?.[0]?.message?.content

    if (!generatedContent) {
      return NextResponse.json(
        { message: 'No content generated' },
        { status: 502 }
      )
    }

    const trimmed = generatedContent.trim()
    const hashtagMatch = trimmed.match(/#[\w]+/g)
    const hashtags = hashtagMatch || []

    return NextResponse.json({
      content: trimmed,
      hashtags,
      platform,
    })
  } catch {
    return NextResponse.json(
      { message: 'Failed to generate post' },
      { status: 500 }
    )
  }
}
