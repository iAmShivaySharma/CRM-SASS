'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Copy, Bot, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface AutoReplyPanelProps {
  channel: 'whatsapp' | 'sms'
  workspaceId: string
}

export default function AutoReplyPanel({
  channel,
  workspaceId,
}: AutoReplyPanelProps) {
  const [incomingMessage, setIncomingMessage] = useState('')
  const [senderName, setSenderName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [tone, setTone] = useState<'friendly' | 'professional' | 'casual'>(
    'friendly'
  )
  const [reply, setReply] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [businessContext, setBusinessContext] = useState('')

  async function handleGenerate() {
    if (!incomingMessage.trim()) {
      toast.error('Please enter an incoming message.')
      return
    }

    setLoading(true)
    setReply('')

    try {
      const res = await fetch('/api/ai/auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          channel,
          incomingMessage: incomingMessage.trim(),
          senderName: senderName.trim() || undefined,
          businessName: businessName.trim() || undefined,
          tone,
          businessContext: businessContext.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.message || 'Failed to generate reply.')
        return
      }

      setReply(data.reply)
      toast.success('Reply generated.')
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!reply) {
      return
    }
    await navigator.clipboard.writeText(reply)
    toast.success('Copied to clipboard.')
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Bot className="h-5 w-5 text-primary" />
          AI Auto-Reply Assistant
        </CardTitle>
        <Badge variant="secondary" className="text-xs font-normal">
          NVIDIA Llama 3.1 · Free · No context
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="incoming-message">Incoming message</Label>
          <Textarea
            id="incoming-message"
            placeholder="Paste or type the received message here..."
            value={incomingMessage}
            onChange={e => setIncomingMessage(e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="sender-name">Sender name (optional)</Label>
            <Input
              id="sender-name"
              placeholder="e.g. Rahul"
              value={senderName}
              onChange={e => setSenderName(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="business-name">Business name (optional)</Label>
            <Input
              id="business-name"
              placeholder="e.g. Acme Corp"
              value={businessName}
              onChange={e => setBusinessName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="tone">Tone</Label>
          <Select
            value={tone}
            onValueChange={v =>
              setTone(v as 'friendly' | 'professional' | 'casual')
            }
          >
            <SelectTrigger id="tone" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <button
            type="button"
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => setShowAdvanced(prev => !prev)}
          >
            Advanced Settings
            {showAdvanced ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
          {showAdvanced && (
            <div className="space-y-1.5 border-t px-4 pb-4 pt-3">
              <Label htmlFor="business-context">
                Business Context (pre-feed your products, FAQs, pricing to
                improve AI replies)
              </Label>
              <Textarea
                id="business-context"
                placeholder={`e.g.\nWe sell organic skincare products.\nPricing: Basic kit ₹999, Premium kit ₹1999.\nReturn policy: 30-day returns accepted.\nFAQ: Products are dermatologist-tested and cruelty-free.`}
                value={businessContext}
                onChange={e => setBusinessContext(e.target.value)}
                rows={6}
              />
            </div>
          )}
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Reply'
          )}
        </Button>

        {reply && (
          <div className="space-y-2">
            <Label htmlFor="generated-reply">Generated reply</Label>
            <Textarea
              id="generated-reply"
              value={reply}
              onChange={e => setReply(e.target.value)}
              rows={4}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Reply
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
