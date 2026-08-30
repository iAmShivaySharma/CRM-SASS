import { type NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/mongodb/auth'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Meeting } from '@/lib/mongodb/models/Meeting'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectToMongoDB()

    const auth = await verifyAuthToken(request)
    if (!auth) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      )
    }

    const { id } = await params

    const meeting = await Meeting.findById(id)
      .populate('organizer', 'fullName')
      .populate('participants.userId', 'fullName')

    if (!meeting) {
      return NextResponse.json(
        { message: 'Meeting not found' },
        { status: 404 }
      )
    }

    if (!meeting.notes && !meeting.description) {
      return NextResponse.json(
        { message: 'No meeting notes to summarize' },
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

    const participantNames = meeting.participants
      .map((p: any) => p.userId?.fullName || 'Unknown')
      .join(', ')

    const durationMins = meeting.duration
      ? Math.round(meeting.duration / 60)
      : null

    const prompt = `Summarize this meeting and extract action items.

Meeting: ${meeting.title}
${meeting.description ? `Description: ${meeting.description}` : ''}
Organizer: ${(meeting.organizer as any)?.fullName || 'Unknown'}
Participants: ${participantNames}
${durationMins ? `Duration: ${durationMins} minutes` : ''}

Notes:
${meeting.notes || meeting.description || ''}

Respond in JSON: { "summary": "...", "actionItems": ["...", "..."], "keyDecisions": ["...", "..."] }`

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-001',
          messages: [
            {
              role: 'system',
              content:
                'You are a meeting assistant. Generate concise, actionable meeting summaries. Respond only in valid JSON.',
            },
            { role: 'user', content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      }
    )

    if (!response.ok) {
      return NextResponse.json(
        { message: 'AI generation failed' },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content

    let parsed
    try {
      const cleaned = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      parsed = JSON.parse(cleaned)
    } catch {
      parsed = { summary: content, actionItems: [], keyDecisions: [] }
    }

    meeting.aiSummary = parsed.summary
    meeting.actionItems = parsed.actionItems || []
    await meeting.save()

    return NextResponse.json({
      success: true,
      summary: parsed.summary,
      actionItems: parsed.actionItems,
      keyDecisions: parsed.keyDecisions,
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
