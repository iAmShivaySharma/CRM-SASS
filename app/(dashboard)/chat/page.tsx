'use client'

import React from 'react'
import { ChatInterface } from '@/components/chat'
import { usePermissions, Permission } from '@/hooks/usePermissions'
import { AccessDenied } from '@/components/ui/access-denied'

export default function ChatPage() {
  const { hasPermission, isLoading: permissionsLoading } = usePermissions()

  if (!permissionsLoading && !hasPermission(Permission.CHAT_VIEW)) {
    return <AccessDenied />
  }

  return (
    <div className="-m-4 -mb-4 -mr-4 h-[calc(100vh-4rem)] overflow-hidden rounded-tl-2xl bg-background sm:-m-6 sm:-mb-6 sm:-mr-6 lg:-m-8 lg:-mb-8 lg:-mr-8">
      <ChatInterface className="h-full" />
    </div>
  )
}
