'use client'

import React from 'react'
import { ChatInterface } from '@/components/chat'

export default function ChatPage() {
  return (
    <div className="-m-4 -mb-4 -mr-4 h-[calc(100vh-4rem)] overflow-hidden rounded-tl-2xl bg-background sm:-m-6 sm:-mb-6 sm:-mr-6 lg:-m-8 lg:-mb-8 lg:-mr-8">
      <ChatInterface className="h-full" />
    </div>
  )
}
