'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function CallbackPage() {
  const params = useSearchParams()

  useEffect(() => {
    const code = params.get('code')
    const token = params.get('access_token') || params.get('token')
    const platform = params.get('platform') || params.get('state')
    if (window.opener) {
      window.opener.postMessage(
        { type: 'oauth_callback', code, token, platform },
        window.location.origin
      )
      window.close()
    }
  }, [params])

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-muted-foreground">
        Connecting... This window will close automatically.
      </p>
    </div>
  )
}
