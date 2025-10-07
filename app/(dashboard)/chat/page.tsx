'use client'

import React from 'react'
import { ChatInterface } from '@/components/chat'

export default function ChatPage() {
  return (
    <div className="-m-4 h-[calc(100vh-8rem)] sm:-m-6 lg:-m-8">
      <ChatInterface className="h-full" />
    </div>
  )
}
