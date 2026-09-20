'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useGetMessagesQuery,
  useSendMessageMutation,
} from '@/lib/api/whatsappApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Loader2,
  Send,
  MessageCircle,
  Check,
  CheckCheck,
  AlertCircle,
  Clock,
  Phone,
  Bot,
  User,
  Hand,
} from 'lucide-react'
import { WhatsAppTemplateSelector } from './WhatsAppTemplateSelector'
import { ClickToCall } from '@/components/calls/ClickToCall'
import { toast } from 'sonner'

interface Props {
  workspaceId: string
  accountId: string
  phone: string
  accountPhone: string
}

function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (d.toDateString() === today.toDateString()) {
    return 'Today'
  }
  if (d.toDateString() === yesterday.toDateString()) {
    return 'Yesterday'
  }
  return d.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'read') {
    return <CheckCheck className="h-3.5 w-3.5 text-primary" />
  }
  if (status === 'delivered') {
    return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground" />
  }
  if (status === 'sent') {
    return <Check className="h-3.5 w-3.5 text-muted-foreground" />
  }
  if (status === 'failed') {
    return <AlertCircle className="h-3.5 w-3.5 text-destructive" />
  }
  if (status === 'pending') {
    return <Clock className="h-3 w-3 text-muted-foreground" />
  }
  return null
}

function SenderBadge({ msg }: { msg: any }) {
  if (msg.direction === 'inbound') {
    return null
  }
  if (msg.templateName) {
    return (
      <span className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Bot className="h-3 w-3" /> Auto · Template
      </span>
    )
  }
  if (msg.metadata?.sentBy === 'bot' || msg.metadata?.sentBy === 'ai') {
    return (
      <span className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Bot className="h-3 w-3" /> AI Bot
      </span>
    )
  }
  if (
    msg.metadata?.sentBy === 'campaign' ||
    msg.metadata?.sentBy === 'sequence'
  ) {
    return (
      <span className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Bot className="h-3 w-3" /> Campaign
      </span>
    )
  }
  return (
    <span className="mb-1 flex items-center gap-1 text-[10px] text-muted-foreground">
      <User className="h-3 w-3" /> Agent
    </span>
  )
}

function shouldShowDate(current: string, previous?: string): boolean {
  if (!previous) {
    return true
  }
  return new Date(current).toDateString() !== new Date(previous).toDateString()
}

export function WhatsAppChatThread({
  workspaceId,
  accountId,
  phone,
  accountPhone,
}: Props) {
  const [message, setMessage] = useState('')
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { data, isLoading } = useGetMessagesQuery(
    { workspaceId, phone },
    { skip: !workspaceId || !phone, pollingInterval: 8000 }
  )
  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation()

  const messages = data?.messages ?? []

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
            <Phone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold">{formatPhone(phone)}</p>
            <p className="text-[11px] text-muted-foreground">
              via {formatPhone(accountPhone)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <ClickToCall phone={phone} workspaceId={workspaceId} />
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => {
              fetch(`/api/whatsapp/conversations/${phone}/handoff`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'take_over' }),
              })
                .then(() => toast.success('You took over this conversation'))
                .catch(() => toast.error('Handoff failed'))
            }}
          >
            <Hand className="h-3 w-3" />
            Intervene
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setTemplateSheetOpen(true)}
          >
            <MessageCircle className="h-3 w-3" />
            Template
          </Button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto bg-muted/20">
        <div className="mx-auto max-w-2xl px-4 py-3">
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <MessageCircle className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No messages yet. Send a template to start.
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {messages.map((msg, idx) => {
                const isOut = msg.direction === 'outbound'
                const prevMsg = idx > 0 ? messages[idx - 1] : undefined
                const showDate = shouldShowDate(
                  msg.createdAt,
                  prevMsg?.createdAt
                )

                return (
                  <div key={msg._id}>
                    {showDate && (
                      <div className="flex justify-center py-3">
                        <span className="rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-muted-foreground">
                          {formatDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex ${isOut ? 'justify-end' : 'justify-start'} mb-1`}
                    >
                      {!isOut && (
                        <div className="mr-1.5 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <div
                        className={`relative max-w-[65%] rounded-2xl px-3 py-2 shadow-sm ${
                          isOut
                            ? 'rounded-br-sm bg-primary/10'
                            : 'rounded-bl-sm border bg-card'
                        } ${msg.status === 'failed' ? 'border border-destructive/30' : ''}`}
                      >
                        <SenderBadge msg={msg} />
                        {msg.templateName && (
                          <div className="mb-1.5 flex items-center gap-1.5 rounded bg-muted/60 px-2 py-0.5">
                            <MessageCircle className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-medium text-muted-foreground">
                              {msg.templateName}
                            </span>
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed">
                          {msg.content}
                        </p>
                        {msg.status === 'failed' && msg.errorMessage && (
                          <p className="mt-1 text-[10px] text-destructive">
                            {msg.errorMessage}
                          </p>
                        )}
                        <div
                          className={`mt-0.5 flex items-center gap-1 ${isOut ? 'justify-end' : 'justify-start'}`}
                        >
                          <span className="text-[10px] text-muted-foreground">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isOut && <StatusIcon status={msg.status} />}
                        </div>
                      </div>
                      {isOut && (
                        <div className="ml-1.5 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                          {msg.templateName ||
                          (msg as any).metadata?.sentBy === 'bot' ||
                          (msg as any).metadata?.sentBy === 'ai' ? (
                            <Bot className="h-3 w-3 text-primary" />
                          ) : (
                            <User className="h-3 w-3 text-primary" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t bg-card px-4 py-2">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-9 flex-1 text-sm"
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={isSending || !message.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
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
