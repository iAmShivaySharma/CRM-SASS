'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  users: Array<{ userId: string; userName: string }>
  className?: string
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  className,
}) => {
  if (users.length === 0) return null

  const getTypingText = () => {
    if (users.length === 1) {
      return `${users[0].userName} is typing...`
    } else if (users.length === 2) {
      return `${users[0].userName} and ${users[1].userName} are typing...`
    } else {
      return `${users[0].userName} and ${users.length - 1} others are typing...`
    }
  }

  return (
    <div className={cn("flex items-center gap-3 px-4 py-2", className)}>
      {/* Avatar placeholder */}
      <div className="h-8 w-8" />

      {/* Typing content */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {getTypingText()}
        </span>

        {/* Animated dots */}
        <div className="flex items-center gap-1">
          <div className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.1s]" />
          <div className="h-1 w-1 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.2s]" />
        </div>
      </div>
    </div>
  )
}