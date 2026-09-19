'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useConnectFacebookMutation } from '@/lib/api/whatsappApi'

declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string
        cookie: boolean
        xfbml: boolean
        version: string
      }) => void
      login: (
        callback: (response: {
          authResponse?: { accessToken: string; code?: string }
          status: string
        }) => void,
        options: { scope: string; extras?: Record<string, unknown> }
      ) => void
    }
    fbAsyncInit: () => void
  }
}

interface WhatsAppFBSignupProps {
  workspaceId: string
  onSuccess?: () => void
}

export function WhatsAppFBSignup({
  workspaceId,
  onSuccess,
}: WhatsAppFBSignupProps) {
  const [sdkReady, setSdkReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [connectFacebook] = useConnectFacebookMutation()

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID
    if (!appId) {
      return
    }

    if (window.FB) {
      setSdkReady(true)
      return
    }

    window.fbAsyncInit = () => {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: 'v21.0',
      })
      setSdkReady(true)
    }

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js'
      script.async = true
      script.defer = true
      document.body.appendChild(script)
    }
  }, [])

  const handleFBLogin = useCallback(() => {
    if (!window.FB || !sdkReady) {
      toast.error('Facebook SDK not ready. Please try again.')
      return
    }

    setLoading(true)

    window.FB.login(
      response => {
        if (!response.authResponse) {
          setLoading(false)
          toast.error('Facebook login was cancelled.')
          return
        }

        const { accessToken } = response.authResponse

        connectFacebook({ workspaceId, accessToken })
          .unwrap()
          .then(result => {
            if (result.accounts && result.accounts.length > 0) {
              toast.success(
                `Connected ${result.accounts.length} WhatsApp account(s)`
              )
            } else {
              toast.info(
                'Facebook connected but no WhatsApp Business accounts found. Use "Connect Manually" instead.'
              )
            }
            onSuccess?.()
          })
          .catch((err: { data?: { message?: string; debug?: string } }) => {
            const msg =
              err?.data?.message ||
              'Failed to connect. Check console for details.'
            toast.error(msg)
            if (err?.data?.debug) {
              console.error('WhatsApp FB Connect debug:', err.data.debug)
            }
          })
          .finally(() => {
            setLoading(false)
          })
      },
      {
        scope:
          'whatsapp_business_management,whatsapp_business_messaging,business_management',
      }
    )
  }, [sdkReady, workspaceId, connectFacebook, onSuccess])

  if (!process.env.NEXT_PUBLIC_META_APP_ID) {
    return null
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleFBLogin}
      disabled={loading || !sdkReady}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      )}
      Connect with Facebook
    </Button>
  )
}
