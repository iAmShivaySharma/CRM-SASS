import { NextResponse } from 'next/server'

export async function GET() {
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

  if (!vapidPublicKey) {
    return NextResponse.json(
      { message: 'Push notifications not configured' },
      { status: 503 }
    )
  }

  return NextResponse.json({ publicKey: vapidPublicKey })
}
