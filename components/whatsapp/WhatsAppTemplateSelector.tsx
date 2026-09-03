'use client'

import { useState } from 'react'
import {
  useGetTemplatesQuery,
  useSendTemplateMutation,
} from '@/lib/api/whatsappApi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  workspaceId: string
  accountId: string
  phone: string
  onSend: () => void
}

function extractVariables(text: string): string[] {
  const matches = text.match(/\{\{(\d+)\}\}/g) || []
  const unique = Array.from(new Set(matches))
  return unique.sort()
}

export function WhatsAppTemplateSelector({
  workspaceId,
  accountId,
  phone,
  onSend,
}: Props) {
  const { data, isLoading } = useGetTemplatesQuery(
    { workspaceId },
    { skip: !workspaceId }
  )
  const [sendTemplate, { isLoading: isSending }] = useSendTemplateMutation()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [variables, setVariables] = useState<Record<string, string>>({})

  const approved = (data?.templates ?? []).filter(t => t.status === 'APPROVED')
  const selected = approved.find(t => t._id === selectedId)

  const bodyComponent = selected
    ? (selected.components as { type: string; text?: string }[]).find(
        c => c.type === 'BODY'
      )
    : null
  const bodyText = bodyComponent?.text ?? ''
  const varKeys = extractVariables(bodyText)

  function handleSelect(id: string) {
    setSelectedId(id)
    setVariables({})
  }

  async function handleSend() {
    if (!selected) {
      return
    }
    const variableValues = varKeys.map(k => variables[k] ?? '')
    const components =
      varKeys.length > 0
        ? [
            {
              type: 'body',
              parameters: variableValues.map(v => ({ type: 'text', text: v })),
            },
          ]
        : undefined
    try {
      await sendTemplate({
        workspaceId,
        accountId,
        to: phone,
        templateName: selected.name,
        language: selected.language,
        components,
      }).unwrap()
      toast.success('Template sent')
      onSend()
    } catch {
      toast.error('Failed to send template')
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (approved.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No approved templates available.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <ScrollArea className="h-64 rounded-md border">
        <div className="space-y-2 p-2">
          {approved.map(t => {
            const body = (
              t.components as { type: string; text?: string }[]
            ).find(c => c.type === 'BODY')
            return (
              <button
                key={t._id}
                onClick={() => handleSelect(t._id)}
                className={`w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted ${selectedId === t._id ? 'border-primary bg-primary/10' : 'bg-card'}`}
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-sm font-medium">{t.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {t.category}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t.language}
                  </Badge>
                </div>
                {body?.text && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {body.text}
                  </p>
                )}
              </button>
            )
          })}
        </div>
      </ScrollArea>

      {selected && varKeys.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium">Template Variables</p>
          {varKeys.map(k => (
            <div key={k}>
              <Label className="mb-1 text-xs text-muted-foreground">{k}</Label>
              <Input
                placeholder={`Value for ${k}`}
                value={variables[k] ?? ''}
                onChange={e =>
                  setVariables(prev => ({ ...prev, [k]: e.target.value }))
                }
              />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <Button onClick={handleSend} disabled={isSending} className="w-full">
          {isSending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          Send Template
        </Button>
      )}
    </div>
  )
}
