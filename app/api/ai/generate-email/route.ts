import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'

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

    const { type, context, tone, recipientName, recipientEmail, senderName } =
      await request.json()

    if (!type) {
      return NextResponse.json(
        { message: 'Email type is required' },
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

    const typePrompts: Record<string, string> = {
      'follow-up':
        'Write a professional follow-up email. Be warm but not pushy. Reference any previous interaction if context is provided.',
      introduction:
        'Write a professional introduction email. Be concise and clearly state your value proposition.',
      'meeting-request':
        'Write an email requesting a meeting. Suggest specific times and make it easy to say yes.',
      'thank-you':
        'Write a thank you email. Be genuine and specific about what you are thankful for.',
      proposal:
        'Write an email accompanying a business proposal. Summarize key points and include a clear call to action.',
      'cold-outreach':
        'Write a cold outreach email. Keep it short (under 150 words), personalized, and with a clear value prop.',
    }

    const systemPrompt = `You are a professional email writer for a CRM platform. Write emails that are:
- Professional but conversational
- Concise (under 200 words unless proposal type)
- Include a clear subject line
- Include a clear call to action
- ${tone === 'formal' ? 'Use formal business language' : tone === 'casual' ? 'Use friendly, casual tone' : 'Use balanced professional tone'}

Respond in JSON format: { "subject": "...", "body": "..." }
Do not include any markdown formatting or code blocks in the response. Only return valid JSON.`

    const userPrompt = `${typePrompts[type] || 'Write a professional business email.'}

${recipientName ? `Recipient: ${recipientName}` : ''}
${recipientEmail ? `Recipient email: ${recipientEmail}` : ''}
${senderName ? `Sender: ${senderName}` : `Sender: ${auth.user.fullName || 'Unknown'}`}
${context ? `Context/Notes: ${context}` : ''}

Generate the email now.`

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || '',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          message: 'AI generation failed',
          error: errorData.error?.message || 'Unknown error',
        },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    if (!content) {
      return NextResponse.json(
        { message: 'No content generated' },
        { status: 502 }
      )
    }

    let parsed
    try {
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { subject: 'Generated Email', body: content }
    }

    return NextResponse.json({
      success: true,
      subject: parsed.subject || 'Generated Email',
      body: parsed.body || content,
      model: data.model,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to generate email' },
      { status: 500 }
    )
  }
}
