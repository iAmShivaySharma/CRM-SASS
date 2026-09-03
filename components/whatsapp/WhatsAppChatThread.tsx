'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useGetMessagesQuery,
  useSendMessageMutation,
} from '@/lib/api/whatsappApi'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Loader2, Send, MessageCircle, Check, CheckCheck } from 'lucide-react'
import { WhatsAppTemplateSelector } from './WhatsAppTemplateSelector'
import { toast } from 'sonner'

interface Props {
  workspaceId: string
  accountId: string
  phone: string
  accountPhone: string
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') {
    return <CheckCheck className="h-3 w-3 text-primary" />
  }
  if (status === 'delivered') {
    return <CheckCheck className="h-3 w-3 text-muted-foreground" />
  }
  if (status === 'sent') {
    return <Check className="h-3 w-3 text-muted-foreground" />
  }
  if (status === 'failed') {
    return <span className="text-xs text-destructive">!</span>
  }
  return null
}

export function WhatsAppChatThread({
  workspaceId,
  accountId,
  phone,
  accountPhone,
}: Props) {
  const [message, setMessage] = useState('')
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useGetMessagesQuery(
    { workspaceId, phone },
    { skip: !workspaceId || !phone, pollingInterval: 8000 }
  )
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation()

  const messages = data?.messages ?? []

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const text = message.trim()
    if (!text) {
      return
    }
    try {
      await sendMessage({
        workspaceId,
        accountId,
        to: phone,
        message: text,
      }).unwrap()
      setMessage('')
    } catch {
      toast.error('Failed to send message')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div>
          <p className="text-sm font-medium">{phone}</p>
          <p className="text-xs text-muted-foreground">From: {accountPhone}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setTemplateSheetOpen(true)}
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Send Template
        </Button>
      </div>

      <ScrollArea className="flex-1 px-4 py-3">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No messages yet.
          </p>
        ) : (
          <div className="space-y-2">
            {messages.map(msg => {
              const isOut = msg.direction === 'outbound'
              return (
                <div
                  key={msg._id}
                  className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-xl px-3 py-2 ${isOut ? 'bg-primary/10' : 'bg-muted'}`}
                  >
                    {msg.templateName && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        Template: {msg.templateName}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                    <div
                      className={`mt-1 flex items-center gap-1 ${isOut ? 'justify-end' : 'justify-start'}`}
                    >
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.createdAt)}
                      </span>
                      {isOut && <StatusIcon status={msg.status} />}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      <div className="border-t bg-card px-4 py-3">
        <div className="flex items-end gap-2">
          <Textarea
            placeholder="Type a message... (Enter to send)"
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            className="flex-1 resize-none"
          />
          <div className="flex flex-col gap-2">
            <Button
              size="icon"
              onClick={handleSend}
              disabled={isSending || !message.trim()}
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => setTemplateSheetOpen(true)}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={templateSheetOpen} onOpenChange={setTemplateSheetOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[480px]">
          <SheetHeader>
            <SheetTitle>Send Template</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <WhatsAppTemplateSelector
              workspaceId={workspaceId}
              accountId={accountId}
              phone={phone}
              onSend={() => setTemplateSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
