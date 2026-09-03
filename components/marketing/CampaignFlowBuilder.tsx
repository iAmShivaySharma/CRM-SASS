'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Handle,
  Position,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import {
  Mail,
  MessageCircle,
  Smartphone,
  Bot,
  Plus,
  Trash2,
  Play,
  Flag,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { CampaignChannel, CampaignStep } from '@/lib/api/campaignApi'

interface MessageNodeData {
  step: CampaignStep
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  [key: string]: unknown
}

interface TriggerNodeData {
  onAddFirst?: () => void
  [key: string]: unknown
}

interface EndNodeData {
  [key: string]: unknown
}

const channelConfig: Record<
  CampaignChannel,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  email: {
    label: 'Email',
    icon: Mail,
    color: 'bg-primary/10 text-primary',
  },
  whatsapp: {
    label: 'WhatsApp',
    icon: MessageCircle,
    color: 'bg-primary/15 text-primary',
  },
  sms: {
    label: 'SMS',
    icon: Smartphone,
    color: 'bg-muted text-muted-foreground',
  },
  ai_reply: {
    label: 'AI Reply',
    icon: Bot,
    color: 'bg-destructive/10 text-destructive',
  },
}

function TriggerNodeComponent({ data }: NodeProps<Node<TriggerNodeData>>) {
  return (
    <div className="min-w-[220px] rounded-xl border-2 border-primary/40 bg-primary/10 shadow-md">
      <div className="flex flex-col items-center px-6 py-4">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <Play className="h-5 w-5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-primary">
          Campaign Start
        </span>
        <span className="mt-1 text-xs text-muted-foreground">
          All enrolled contacts
        </span>
      </div>
      {data.onAddFirst && (
        <div className="border-t border-primary/20 px-4 py-2">
          <button
            onClick={data.onAddFirst}
            className="flex w-full items-center justify-center gap-1 rounded text-xs text-primary/70 transition-colors hover:text-primary"
          >
            <Plus className="h-3 w-3" />
            Add First Step
          </button>
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-primary/40 !bg-primary"
      />
    </div>
  )
}

function MessageNodeComponent({ id, data }: NodeProps<Node<MessageNodeData>>) {
  const { step, isSelected, onSelect, onDelete, onAddBelow } = data
  const config = channelConfig[step.channel]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'min-w-[260px] max-w-[300px] cursor-pointer rounded-xl border-2 bg-card shadow-md transition-all',
        isSelected
          ? 'border-primary shadow-lg'
          : 'border-border hover:border-primary/50'
      )}
      onClick={() => onSelect(id)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!border-border !bg-muted-foreground"
      />

      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div
            className={cn(
              'flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-medium',
              config.color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </div>
          <button
            onClick={e => {
              e.stopPropagation()
              onDelete(id)
            }}
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {step.channel === 'email' && step.subject && (
          <p className="mb-1 truncate text-sm font-medium">{step.subject}</p>
        )}
        {step.body && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {step.body || 'No message body'}
          </p>
        )}
        {!step.body && !step.subject && (
          <p className="text-xs italic text-muted-foreground">
            Click to configure
          </p>
        )}

        <div className="mt-3 flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {step.delayDays}d {step.delayHours}h delay
          </Badge>
        </div>
      </div>

      <div className="border-t px-4 py-2">
        <button
          onClick={e => {
            e.stopPropagation()
            onAddBelow(id)
          }}
          className="flex w-full items-center justify-center gap-1 rounded text-xs text-muted-foreground transition-colors hover:text-primary"
        >
          <Plus className="h-3 w-3" />
          Add Step Below
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!border-border !bg-muted-foreground"
      />
    </div>
  )
}

function EndNodeComponent({ data: _data }: NodeProps<Node<EndNodeData>>) {
  return (
    <div className="flex min-w-[220px] flex-col items-center rounded-xl border-2 border-border bg-muted px-6 py-4 shadow-md">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-background">
        <Flag className="h-5 w-5 text-muted-foreground" />
      </div>
      <span className="text-sm font-semibold text-muted-foreground">
        Campaign End
      </span>
      <Handle
        type="target"
        position={Position.Top}
        className="!border-border !bg-muted-foreground"
      />
    </div>
  )
}

const nodeTypes = {
  triggerNode: TriggerNodeComponent,
  messageNode: MessageNodeComponent,
  endNode: EndNodeComponent,
}

function makeEdge(source: string, target: string): Edge {
  return {
    id: `e-${source}-${target}`,
    source,
    target,
    type: 'smoothstep',
    style: { stroke: 'hsl(var(--border))', strokeWidth: 2 },
  }
}

function stepsToNodes(
  steps: CampaignStep[],
  selectedId: string | null,
  callbacks: {
    onSelect: (id: string) => void
    onDelete: (id: string) => void
    onAddBelow: (id: string) => void
    onAddFirst: () => void
  }
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    {
      id: 'trigger',
      type: 'triggerNode',
      position: { x: 250, y: 0 },
      data: steps.length === 0 ? { onAddFirst: callbacks.onAddFirst } : {},
    },
  ]

  const edges: Edge[] = []

  const sorted = [...steps].sort((a, b) => a.order - b.order)
  let prevId = 'trigger'

  sorted.forEach((step, idx) => {
    const nodeId = `step-${idx}`
    nodes.push({
      id: nodeId,
      type: 'messageNode',
      position: { x: 250, y: idx * 200 + 150 },
      data: {
        step,
        isSelected: selectedId === nodeId,
        onSelect: callbacks.onSelect,
        onDelete: callbacks.onDelete,
        onAddBelow: callbacks.onAddBelow,
      } as MessageNodeData,
    })
    edges.push(makeEdge(prevId, nodeId))
    prevId = nodeId
  })

  const endY = sorted.length * 200 + 150
  nodes.push({
    id: 'end',
    type: 'endNode',
    position: { x: 250, y: endY },
    data: {},
  })
  edges.push(makeEdge(prevId, 'end'))

  return { nodes, edges }
}

export interface CampaignFlowBuilderProps {
  initialSteps?: CampaignStep[]
  onSave: (steps: CampaignStep[]) => void
  onCancel: () => void
  saving?: boolean
  defaultChannel?: CampaignChannel
}

export function CampaignFlowBuilder({
  initialSteps = [],
  onSave,
  onCancel,
  saving = false,
  defaultChannel,
}: CampaignFlowBuilderProps) {
  const channel = defaultChannel ?? 'email'
  const [steps, setSteps] = useState<CampaignStep[]>(initialSteps)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({})
  const prevStepCountRef = useRef(initialSteps.length)

  const onAddFirst = useCallback(() => {
    setSteps([{ order: 0, channel, body: '', delayDays: 1, delayHours: 0 }])
    if (!defaultChannel) {
      setSelectedNodeId('step-0')
    }
  }, [channel, defaultChannel])

  const onSelect = useCallback((id: string) => {
    setSelectedNodeId(prev => (prev === id ? null : id))
  }, [])

  const onDelete = useCallback((id: string) => {
    setSteps(prev => {
      const idx = parseInt(id.replace('step-', ''))
      const next = prev
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, order: i }))
      nodePositionsRef.current = {}
      return next
    })
    setSelectedNodeId(prev => (prev === id ? null : prev))
  }, [])

  const onAddBelow = useCallback(
    (id: string) => {
      const idx = parseInt(id.replace('step-', ''))
      setSteps(prev => {
        const newStep: CampaignStep = {
          order: idx + 1,
          channel,
          body: '',
          delayDays: 1,
          delayHours: 0,
        }
        const updated = [
          ...prev.slice(0, idx + 1),
          newStep,
          ...prev.slice(idx + 1),
        ].map((s, i) => ({ ...s, order: i }))
        return updated
      })
      if (!defaultChannel) {
        setSelectedNodeId(`step-${idx + 1}`)
      }
    },
    [channel, defaultChannel]
  )

  const handleNodesChange = useCallback(
    (changes: any[]) => {
      onNodesChange(changes)
      for (const change of changes) {
        if (change.type === 'position' && change.position) {
          nodePositionsRef.current[change.id] = change.position
        }
      }
    },
    [onNodesChange]
  )

  useEffect(() => {
    const { nodes: n, edges: e } = stepsToNodes(steps, selectedNodeId, {
      onSelect,
      onDelete,
      onAddBelow,
      onAddFirst,
    })
    const positionedNodes = n.map(node => {
      const saved = nodePositionsRef.current[node.id]
      if (saved) {
        return { ...node, position: saved }
      }
      return node
    })
    setNodes(positionedNodes)
    setEdges(e)
    prevStepCountRef.current = steps.length
  }, [steps, selectedNodeId, onSelect, onDelete, onAddBelow, onAddFirst])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges(eds => addEdge(params, eds))
    },
    [setEdges]
  )

  const selectedIndex =
    selectedNodeId && selectedNodeId.startsWith('step-')
      ? parseInt(selectedNodeId.replace('step-', ''))
      : null

  const selectedStep = selectedIndex !== null ? steps[selectedIndex] : null

  const updateSelectedStep = (updates: Partial<CampaignStep>) => {
    if (selectedIndex === null) {
      return
    }
    setSteps(prev =>
      prev.map((s, i) => (i === selectedIndex ? { ...s, ...updates } : s))
    )
  }

  const handleSave = () => {
    onSave(steps.map((s, i) => ({ ...s, order: i })))
  }

  return (
    <div className="flex flex-col">
      <div className="flex h-[600px] overflow-hidden rounded-lg border bg-background">
        <div className="relative flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={16} size={1} />
            <Controls />
            <MiniMap
              nodeStrokeWidth={3}
              className="!border !border-border !bg-card"
            />
          </ReactFlow>
        </div>

        {selectedStep && (
          <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">
                Step {(selectedIndex ?? 0) + 1} Settings
              </h3>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {!defaultChannel && (
                <div className="space-y-2">
                  <Label className="text-xs">Channel</Label>
                  <Select
                    value={selectedStep.channel}
                    onValueChange={val =>
                      updateSelectedStep({ channel: val as CampaignChannel })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">
                        <span className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" /> Email
                        </span>
                      </SelectItem>
                      <SelectItem value="whatsapp">
                        <span className="flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                        </span>
                      </SelectItem>
                      <SelectItem value="sms">
                        <span className="flex items-center gap-2">
                          <Smartphone className="h-3.5 w-3.5" /> SMS
                        </span>
                      </SelectItem>
                      <SelectItem value="ai_reply">
                        <span className="flex items-center gap-2">
                          <Bot className="h-3.5 w-3.5" /> AI Reply
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedStep.channel === 'email' && (
                <div className="space-y-2">
                  <Label className="text-xs">Subject</Label>
                  <Input
                    value={selectedStep.subject || ''}
                    onChange={e =>
                      updateSelectedStep({ subject: e.target.value })
                    }
                    placeholder="Email subject line"
                    className="h-8 text-xs"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-xs">Message Body</Label>
                <Textarea
                  value={selectedStep.body}
                  onChange={e => updateSelectedStep({ body: e.target.value })}
                  placeholder="Enter your message..."
                  rows={4}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs">Delay (days)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={selectedStep.delayDays}
                    onChange={e =>
                      updateSelectedStep({
                        delayDays: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Hours</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={selectedStep.delayHours}
                    onChange={e =>
                      updateSelectedStep({
                        delayHours: parseInt(e.target.value) || 0,
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {selectedStep.channel === 'ai_reply' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">AI Tone</Label>
                    <Select
                      value={selectedStep.aiTone || 'professional'}
                      onValueChange={val =>
                        updateSelectedStep({
                          aiTone: val as 'professional' | 'friendly' | 'casual',
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">
                          Professional
                        </SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">AI Context</Label>
                    <Textarea
                      value={selectedStep.aiContext || ''}
                      onChange={e =>
                        updateSelectedStep({ aiContext: e.target.value })
                      }
                      placeholder="Provide context for the AI to generate replies..."
                      rows={3}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Send Reply Via</Label>
                    <Select
                      value={selectedStep.replyViaChannel || 'email'}
                      onValueChange={val =>
                        updateSelectedStep({
                          replyViaChannel: val as 'email' | 'whatsapp' | 'sms',
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">Email</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="sms">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">
          {steps.length} step{steps.length !== 1 ? 's' : ''}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
