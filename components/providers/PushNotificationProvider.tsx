'use client'

import { useEffect } from 'react'
import { useAppSelector } from '@/lib/hooks'

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { currentWorkspace } = useAppSelector(state => state.workspace)
  const { user } = useAppSelector(state => state.auth)

  useEffect(() => {
    if (
      !currentWorkspace?.id ||
      !user ||
      typeof window === 'undefined' ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      return
    }

    const registerPush = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js')

        const permission = await Notification.requestPermission()
        if (permission !== 'granted') return

        const res = await fetch('/api/push/vapid-public-key')
        const { publicKey } = await res.json()
        if (!publicKey) return

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        })

        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscription: subscription.toJSON(),
            workspaceId: currentWorkspace.id,
          }),
        })
      } catch {}
    }

    registerPush()
  }, [currentWorkspace?.id, user])

  return <>{children}</>
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}
