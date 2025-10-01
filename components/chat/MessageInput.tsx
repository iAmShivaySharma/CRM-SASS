'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/lib/store'
import { useCreateMessageMutation, useUploadFileMutation, useGetUploadConfigQuery, Message } from '@/lib/api/chatApi'
import { useSocket } from '@/lib/context/SocketContext'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Send,
  Paperclip,
  Smile,
  AtSign,
  Hash,
  Bold,
  Italic,
  Code,
  X,
  Reply
} from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface MessageInputProps {
  chatRoomId: string
  replyingTo?: Message | null
  onCancelReply?: () => void
}

export const MessageInput: React.FC<MessageInputProps> = ({ chatRoomId, replyingTo, onCancelReply }) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const workspace = useSelector((state: RootState) => state.workspace)

  const [createMessage, { isLoading: isSending }] = useCreateMessageMutation()
  const [uploadFile] = useUploadFileMutation()
  const { data: uploadConfig } = useGetUploadConfigQuery()
  const { sendMessage, startTyping, stopTyping } = useSocket()

  // Handle typing indicators
  const handleTypingStart = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true)
      startTyping(chatRoomId)
    }

    // Clear existing timeout and set new one
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      stopTyping(chatRoomId)
    }, 1000)
  }, [isTyping, chatRoomId, startTyping, stopTyping])

  const handleTypingStop = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    if (isTyping) {
      setIsTyping(false)
      stopTyping(chatRoomId)
    }
  }, [isTyping, chatRoomId, stopTyping])

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setMessage(value)

    if (value.trim()) {
      handleTypingStart()
    } else {
      handleTypingStop()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSendMessage = async () => {
    const trimmedMessage = message.trim()
    if (!trimmedMessage || isSending) return

    try {
      // Clear input immediately for better UX
      setMessage('')
      handleTypingStop()

      // Send via API and WebSocket
      const tempId = `temp-${Date.now()}`

      // Send via WebSocket for real-time updates
      sendMessage({
        chatRoomId,
        content: trimmedMessage,
        type: 'text',
        tempId,
        replyTo: replyingTo?.id,
      })

      // Send via API for persistence
      await createMessage({
        chatRoomId,
        content: trimmedMessage,
        type: 'text',
        replyTo: replyingTo?.id,
      }).unwrap()

      // Clear reply state
      onCancelReply?.()

      // Focus back to input
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Restore message on error
      setMessage(trimmedMessage)
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!workspace.currentWorkspace?.id) {
      console.error('No workspace selected')
      return
    }

    setIsUploading(true)

    try {
      // Upload file to MinIO
      const uploadResult = await uploadFile({
        file,
        workspaceId: workspace.currentWorkspace.id,
        chatRoomId,
      }).unwrap()

      if (uploadResult.success) {
        // Send file message via WebSocket
        sendMessage({
          chatRoomId,
          content: `Shared a file: ${uploadResult.file.name}`,
          type: uploadResult.file.type.startsWith('image/') ? 'image' : 'file',
          fileUrl: uploadResult.file.url,
          fileName: uploadResult.file.name,
          fileSize: uploadResult.file.size,
        })

        // Also persist via API
        await createMessage({
          chatRoomId,
          content: `Shared a file: ${uploadResult.file.name}`,
          type: uploadResult.file.type.startsWith('image/') ? 'image' : 'file',
          fileUrl: uploadResult.file.url,
          fileName: uploadResult.file.name,
          fileSize: uploadResult.file.size,
        }).unwrap()
      }
    } catch (error) {
      console.error('File upload failed:', error)
      // You could show a toast notification here
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validate file size and type
      const maxSize = uploadConfig?.config.maxFileSize || 10 * 1024 * 1024 // 10MB default
      const allowedTypes = uploadConfig?.config.allowedTypes || []

      if (file.size > maxSize) {
        alert(`File size too large. Maximum allowed: ${(maxSize / 1024 / 1024).toFixed(2)}MB`)
        return
      }

      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        alert('File type not allowed')
        return
      }

      handleFileUpload(file)
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const insertAtCursor = (text: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newMessage = message.slice(0, start) + text + message.slice(end)

    setMessage(newMessage)

    // Set cursor position after inserted text
    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + text.length
      textarea.focus()
    }, 0)
  }

  const handleFormatting = (type: 'bold' | 'italic' | 'code') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = message.slice(start, end)

    let formattedText = ''
    switch (type) {
      case 'bold':
        formattedText = `**${selectedText || 'bold text'}**`
        break
      case 'italic':
        formattedText = `*${selectedText || 'italic text'}*`
        break
      case 'code':
        formattedText = selectedText.includes('\n')
          ? `\`\`\`\n${selectedText || 'code'}\n\`\`\``
          : `\`${selectedText || 'code'}\``
        break
    }

    const newMessage = message.slice(0, start) + formattedText + message.slice(end)
    setMessage(newMessage)

    // Set cursor position
    setTimeout(() => {
      if (selectedText) {
        textarea.selectionStart = start
        textarea.selectionEnd = start + formattedText.length
      } else {
        const cursorPos = start + formattedText.length - (type === 'code' && !selectedText.includes('\n') ? 1 : selectedText ? 0 : formattedText.length / 2)
        textarea.selectionStart = textarea.selectionEnd = cursorPos
      }
      textarea.focus()
    }, 0)
  }

  // Auto-resize textarea
  const autoResize = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  React.useEffect(() => {
    autoResize()
  }, [message])

  return (
    <div className="bg-background">
      {/* Reply Preview */}
      {replyingTo && (
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <Reply className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-1">
                  Replying to {replyingTo.senderName}
                </p>
                <p className="text-sm text-foreground truncate">
                  {replyingTo.content}
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 flex-shrink-0"
              onClick={onCancelReply}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-4">
        <div className="flex items-end gap-2">
        {/* File attachment button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-9 w-9 p-0"
                disabled={isSending || isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Attach file</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={uploadConfig?.config.allowedTypes.join(',') || 'image/*,application/pdf,.doc,.docx,.txt'}
        />

        {/* Main input area */}
        <div className="flex-1 relative">
          {/* Formatting toolbar */}
          <div className="flex items-center gap-1 pb-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFormatting('bold')}
                  >
                    <Bold className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Bold</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFormatting('italic')}
                  >
                    <Italic className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Italic</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => handleFormatting('code')}
                  >
                    <Code className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Code</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => insertAtCursor('@')}
                  >
                    <AtSign className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mention someone</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => insertAtCursor('#')}
                  >
                    <Hash className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Reference channel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Text input */}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleTypingStop}
            placeholder="Type a message..."
            className={cn(
              "min-h-[40px] max-h-[120px] resize-none pr-12",
              "focus:ring-2 focus:ring-primary/20"
            )}
            disabled={isSending}
            rows={1}
          />

          {/* Emoji picker */}
          <div className="absolute right-2 bottom-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  disabled={isSending}
                >
                  <Smile className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4">
                  <h4 className="text-sm font-medium mb-3">Quick Emojis</h4>
                  <div className="grid grid-cols-8 gap-2">
                    {['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯', '😢', '😡', '🤯', '🎯', '✨', '🚀'].map((emoji) => (
                      <Button
                        key={emoji}
                        variant="ghost"
                        className="h-8 w-8 p-0 text-lg"
                        onClick={() => insertAtCursor(emoji)}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Send button */}
        <Button
          size="sm"
          onClick={handleSendMessage}
          disabled={!message.trim() || isSending || isUploading}
          className="h-9 w-9 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Character counter and hints */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {isUploading ? (
            <span className="text-blue-500">Uploading file...</span>
          ) : (
            <span>Press Enter to send, Shift+Enter for new line</span>
          )}
        </div>
        <span>{message.length}/10000</span>
      </div>
      </div>
    </div>
  )
}