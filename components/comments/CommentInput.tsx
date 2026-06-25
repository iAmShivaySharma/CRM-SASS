'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface CommentInputProps {
  onSubmit: (content: string) => Promise<void>
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  onCancel?: () => void
}

export function CommentInput({
  onSubmit,
  initialValue = '',
  placeholder = 'Write a comment...',
  submitLabel = 'Comment',
  onCancel,
}: CommentInputProps) {
  const [content, setContent] = useState(initialValue)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) return

    setIsSubmitting(true)
    try {
      await onSubmit(trimmed)
      setContent('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel()
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="min-h-[80px] resize-none"
        disabled={isSubmitting}
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Ctrl+Enter to submit
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!content.trim() || isSubmitting}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
