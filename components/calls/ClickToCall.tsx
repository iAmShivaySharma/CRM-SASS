'use client'

import { useState } from 'react'
import { Phone, PhoneOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useInitiateCallMutation } from '@/lib/api/callsApi'
import { toast } from 'sonner'

interface ClickToCallProps {
  phone: string
  workspaceId: string
}

export function ClickToCall({ phone, workspaceId }: ClickToCallProps) {
  const [initiateCall, { isLoading }] = useInitiateCallMutation()
  const [calling, setCalling] = useState(false)

  const handleCall = async () => {
    if (calling) {
      setCalling(false)
      toast.info('Call ended')
      return
    }

    try {
      const result = await initiateCall({
        workspaceId,
        to: phone,
      }).unwrap()

      if (result.success) {
        setCalling(true)
        toast.success(`Calling ${phone}...`)
      } else {
        toast.error(result.message || 'Failed to initiate call')
      }
    } catch {
      toast.error('Failed to initiate call')
    }
  }

  if (calling) {
    return (
      <Button variant="destructive" size="sm" onClick={handleCall}>
        <PhoneOff className="mr-1 h-4 w-4" />
        Hang Up
      </Button>
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCall}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
      ) : (
        <Phone className="mr-1 h-4 w-4" />
      )}
      Call
    </Button>
  )
}
