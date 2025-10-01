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
  Reply,
  FileText,
  Image,
  Trash2
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

interface AttachedFile {
  url: string
  name: string
  size: number
  type: string
  id: string
}

export const MessageInput: React.FC<MessageInputProps> = ({ chatRoomId, replyingTo, onCancelReply }) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
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
    const hasAttachments = attachedFiles.length > 0

    // Don't send if no message and no attachments
    if (!trimmedMessage && !hasAttachments) return
    if (isSending) return

    try {
      // Clear inputs immediately for better UX
      setMessage('')
      const filesToSend = [...attachedFiles]
      setAttachedFiles([])
      handleTypingStop()

      // If there are file attachments, send them
      if (hasAttachments) {
        for (const file of filesToSend) {
          const messageType = file.type.startsWith('image/') ? 'image' : 'file'
          const fileContent = trimmedMessage || `Shared ${messageType === 'image' ? 'an image' : 'a file'}: ${file.name}`
          const tempId = `temp-file-${Date.now()}-${Math.random()}`

          // Send via WebSocket for real-time updates
          sendMessage({
            chatRoomId,
            content: fileContent,
            type: messageType,
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
            tempId,
            replyTo: replyingTo?.id,
          })

          // Send via API for persistence
          await createMessage({
            chatRoomId,
            content: fileContent,
            type: messageType,
            fileUrl: file.url,
            fileName: file.name,
            fileSize: file.size,
            replyTo: replyingTo?.id,
          }).unwrap()
        }
      } else {
        // Send text-only message
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
      }

      // Clear reply state
      onCancelReply?.()

      // Focus back to input
      textareaRef.current?.focus()
    } catch (error) {
      console.error('Failed to send message:', error)
      // Restore message and attachments on error
      setMessage(trimmedMessage)
      setAttachedFiles(filesToSend)
    }
  }

  // Handle file upload - Upload file and add to attachments (don't auto-send)
  const handleFileUpload = async (file: File) => {
    if (!workspace.currentWorkspace?.id) {
      console.error('No workspace selected')
      return
    }

    setIsUploading(true)

    try {
      console.log('Starting file upload process...')
      setUploadProgress('Uploading file...')

      // Upload file to MinIO to get URL
      const uploadResult = await uploadFile({
        file,
        workspaceId: workspace.currentWorkspace.id,
        chatRoomId,
      }).unwrap()

      console.log('File upload result:', uploadResult)

      if (uploadResult.success && uploadResult.file.url) {
        setUploadProgress('File attached!')

        // Add file to attachments (don't auto-send)
        const attachedFile: AttachedFile = {
          url: uploadResult.file.url,
          name: uploadResult.file.name,
          size: uploadResult.file.size,
          type: uploadResult.file.type,
          id: `file-${Date.now()}-${Math.random()}`,
        }

        setAttachedFiles(prev => [...prev, attachedFile])
        console.log('File attached successfully')
      } else {
        throw new Error('File upload failed - no URL returned')
      }
    } catch (error) {
      console.error('File upload failed:', error)

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      console.error('Detailed error:', errorMessage)

      // You could add a toast notification here for better UX
      alert(`File upload failed: ${errorMessage}`)
    } finally {
      setIsUploading(false)
      setUploadProgress('')
    }
  }

  // Remove attached file
  const removeAttachedFile = (fileId: string) => {
    setAttachedFiles(prev => prev.filter(file => file.id !== fileId))
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

      {/* File Attachments Preview */}
      {attachedFiles.length > 0 && (
        <div className="px-4 pt-3 pb-2 border-b border-border">
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Attached Files ({attachedFiles.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 max-w-xs"
                >
                  <div className="flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <Image className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 flex-shrink-0 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => removeAttachedFile(file.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
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
            placeholder={attachedFiles.length > 0 ? "Add a message (optional)..." : "Type a message..."}
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
          disabled={(!message.trim() && attachedFiles.length === 0) || isSending || isUploading}
          className="h-9 w-9 p-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      {/* Character counter and hints */}
      <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          {isUploading ? (
            <div className="flex items-center gap-2 text-blue-500">
              <div className="animate-spin rounded-full h-3 w-3 border border-blue-500 border-t-transparent"></div>
              <span>{uploadProgress || 'Uploading file...'}</span>
            </div>
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