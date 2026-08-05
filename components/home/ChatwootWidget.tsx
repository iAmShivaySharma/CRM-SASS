'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    chatwootSDK: {
      run: (config: { websiteToken: string; baseUrl: string }) => void
    }
    $chatwoot: unknown
    chatwootSettings: Record<string, unknown>
  }
}

export default function ChatwootWidget() {
  useEffect(() => {
    if (window.$chatwoot) return

    const BASE_URL = 'https://app.chatwoot.com'

    if (document.querySelector('script[src*="chatwoot"]')) return

    window.chatwootSettings = {
      hideMessageBubble: false,
      position: 'right',
      locale: 'en',
      type: 'expanded_bubble',
      launcherTitle: 'Chat with us',
      showPopoutButton: false,
    }

    const script = document.createElement('script')
    script.src = `${BASE_URL}/packs/js/sdk.js`
    script.async = true
    script.defer = true
    script.onload = () => {
      window.chatwootSDK.run({
        websiteToken: '3BvYha8a11Ryh9Ejo6uHpiW7',
        baseUrl: BASE_URL,
      })
    }
    document.head.appendChild(script)
  }, [])

  return null
}
