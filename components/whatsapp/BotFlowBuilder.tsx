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
  Play,
  MessageCircle,
  Clock,
  Hash,
  LayoutList,
  Bot,
  UserCheck,
  Timer,
  Plus,
  Trash2,
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
import type { BotFlowStepPayload } from '@/lib/api/whatsappApi'

type BotStepType = BotFlowStepPayload['type']

interface BotNodeData {
  step: BotFlowStepPayload
  isSelected: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onAddBelow: (id: string) => void
  [key: string]: unknown
}

interface TriggerNodeData {
  triggerKeywords?: string[]
  onAddFirst?: () => void
  [key: string]: unknown
}

const stepConfig: Record<
  BotStepType,
  { label: string; icon: React.FC<{ className?: string }>; color: string }
> = {
  send_message: {
    label: 'Send Message',
    icon: MessageCircle,
    color: 'bg-primary/10 text-primary',
  },
  wait_for_reply: {
    label: 'Wait for Reply',
    icon: Clock,
    color: 'bg-primary/15 text-primary',
  },
  keyword_match: {
    label: 'Keyword Match',
    icon: Hash,
    color: 'bg-muted text-muted-foreground',
  },
  quick_reply: {
    label: 'Quick Reply',
    icon: LayoutList,
    color: 'bg-primary/10 text-primary',
  },
  list_message: {
    label: 'List Message',
    icon: LayoutList,
    color: 'bg-primary/15 text-primary',
  },
  ai_reply: {
    label: 'AI Reply',
    icon: Bot,
    color: 'bg-destructive/10 text-destructive',
  },
  assign_human: {
    label: 'Assign Human',
    icon: UserCheck,
    color: 'bg-primary/10 text-primary',
  },
  delay: {
    label: 'Delay',
    icon: Timer,
    color: 'bg-muted text-muted-foreground',
  },
  condition: {
    label: 'Condition',
    icon: Hash,
    color: 'bg-primary/15 text-primary',
  },
}

function TriggerNodeComponent({ data }: NodeProps<Node<TriggerNodeData>>) {
  return (
    <div className="min-w-[220px] rounded-xl border-2 border-primary/40 bg-primary/10 shadow-md">
      <div className="flex flex-col items-center px-6 py-4">
        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
          <Play className="h-5 w-5 text-primary" />
        </div>
        <span className="text-sm font-semibold text-primary">Bot Trigger</span>
        {data.triggerKeywords && data.triggerKeywords.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {data.triggerKeywords.slice(0, 3).map((kw, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {kw}
              </Badge>
            ))}
            {data.triggerKeywords.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{data.triggerKeywords.length - 3}
              </Badge>
            )}
          </div>
        )}
        {(!data.triggerKeywords || data.triggerKeywords.length === 0) && (
          <span className="mt-1 text-xs text-muted-foreground">
            Any incoming message
          </span>
        )}
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

function BotStepNodeComponent({ id, data }: NodeProps<Node<BotNodeData>>) {
  const { step, isSelected, onSelect, onDelete, onAddBelow } = data
  const config = stepConfig[step.type]
  const Icon = config.icon

  const previewText = (() => {
    const d = step.data as Record<string, unknown>
    if (step.type === 'send_message' && d.message) {
      return String(d.message)
    }
    if (step.type === 'keyword_match' && Array.isArray(d.keywords)) {
      return `Keywords: ${(d.keywords as string[]).join(', ')}`
    }
    if (step.type === 'quick_reply' && d.message) {
      return String(d.message)
    }
    if (step.type === 'ai_reply') {
      return `Tone: ${d.aiTone || 'professional'}`
    }
    if (step.type === 'delay' && d.delaySeconds) {
      const secs = Number(d.delaySeconds)
      if (secs >= 3600) {
        return `Wait ${Math.floor(secs / 3600)}h`
      }
      if (secs >= 60) {
        return `Wait ${Math.floor(secs / 60)}m`
      }
      return `Wait ${secs}s`
    }
    if (step.type === 'assign_human') {
      return 'Hand off to agent'
    }
    if (step.type === 'wait_for_reply') {
      return 'Waiting for user response...'
    }
    return null
  })()

  const outputCount =
    step.type === 'keyword_match'
      ? Math.max(
          ((step.data as Record<string, unknown>).keywords as string[])
            ?.length || 1,
          1
        )
      : step.type === 'quick_reply'
        ? Math.max(
            (
              (step.data as Record<string, unknown>).buttons as Array<{
                id: string
                title: string
              }>
            )?.length || 1,
            1
          )
        : 1

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

        {previewText ? (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {previewText}
          </p>
        ) : (
          <p className="text-xs italic text-muted-foreground">
            Click to configure
          </p>
        )}

        {step.type === 'quick_reply' &&
          Array.isArray((step.data as Record<string, unknown>).buttons) && (
            <div className="mt-2 flex flex-wrap gap-1">
              {(
                (step.data as Record<string, unknown>).buttons as Array<{
                  id: string
                  title: string
                }>
              ).map((btn, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {btn.title || `Button ${i + 1}`}
                </Badge>
              ))}
            </div>
          )}
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

      {outputCount <= 1 ? (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!border-border !bg-muted-foreground"
        />
      ) : (
        Array.from({ length: outputCount }).map((_, i) => (
          <Handle
            key={`source-${i}`}
            type="source"
            position={Position.Bottom}
            id={`source-${i}`}
            className="!border-border !bg-muted-foreground"
            style={{
              left: `${((i + 1) / (outputCount + 1)) * 100}%`,
            }}
          />
        ))
      )}
    </div>
  )
}

const nodeTypes = {
  triggerNode: TriggerNodeComponent,
  botStepNode: BotStepNodeComponent,
}

function makeEdge(
  source: string,
  target: string,
  sourceHandle?: string,
  label?: string
): Edge {
  return {
    id: `e-${source}-${target}${sourceHandle ? `-${sourceHandle}` : ''}`,
    source,
    target,
    sourceHandle: sourceHandle || undefined,
    type: 'smoothstep',
    style: { stroke: 'hsl(var(--border))', strokeWidth: 2 },
    label,
  }
}

function stepsToFlow(
  steps: BotFlowStepPayload[],
  triggerKeywords: string[],
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
      data:
        steps.length === 0
          ? {
              triggerKeywords,
              onAddFirst: callbacks.onAddFirst,
            }
          : { triggerKeywords },
    },
  ]

  const edges: Edge[] = []

  steps.forEach((step, idx) => {
    const nodeId = `step-${idx}`
    nodes.push({
      id: nodeId,
      type: 'botStepNode',
      position: step.position || { x: 250, y: idx * 200 + 150 },
      data: {
        step,
        isSelected: selectedId === nodeId,
        onSelect: callbacks.onSelect,
        onDelete: callbacks.onDelete,
        onAddBelow: callbacks.onAddBelow,
      } as BotNodeData,
    })
  })

  steps.forEach((step, idx) => {
    const nodeId = `step-${idx}`
    if (step.connections.length > 0) {
      step.connections.forEach((conn, connIdx) => {
        const targetIdx = steps.findIndex(s => s.id === conn.targetStepId)
        if (targetIdx !== -1) {
          const hasMultiOutput =
            step.type === 'keyword_match' || step.type === 'quick_reply'
          edges.push(
            makeEdge(
              nodeId,
              `step-${targetIdx}`,
              hasMultiOutput ? `source-${connIdx}` : undefined,
              conn.label
            )
          )
        }
      })
    }
  })

  if (steps.length > 0 && steps[0].connections.length === 0) {
    edges.push(makeEdge('trigger', 'step-0'))
  } else if (steps.length > 0) {
    const firstConnected = new Set<string>()
    steps.forEach(s => {
      s.connections.forEach(c => firstConnected.add(c.targetStepId))
    })
    steps.forEach((s, idx) => {
      if (!firstConnected.has(s.id) && idx === 0) {
        edges.push(makeEdge('trigger', `step-${idx}`))
      }
    })
    if (edges.length === 0) {
      edges.push(makeEdge('trigger', 'step-0'))
    }
  }

  return { nodes, edges }
}

function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export interface BotFlowBuilderProps {
  initialSteps?: BotFlowStepPayload[]
  initialTriggerKeywords?: string[]
  onSave: (steps: BotFlowStepPayload[], triggerKeywords: string[]) => void
  onCancel: () => void
  saving?: boolean
}

export function BotFlowBuilder({
  initialSteps = [],
  initialTriggerKeywords = [],
  onSave,
  onCancel,
  saving = false,
}: BotFlowBuilderProps) {
  const [steps, setSteps] = useState<BotFlowStepPayload[]>(initialSteps)
  const [triggerKeywords, setTriggerKeywords] = useState<string[]>(
    initialTriggerKeywords
  )
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [addStepMenuOpen, setAddStepMenuOpen] = useState<string | null>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const nodePositionsRef = useRef<Record<string, { x: number; y: number }>>({})

  const onAddFirst = useCallback(() => {
    setAddStepMenuOpen('first')
  }, [])

  const addStep = useCallback((type: BotStepType, afterId?: string) => {
    const newStep: BotFlowStepPayload = {
      id: generateStepId(),
      type,
      data: type === 'ai_reply' ? { aiTone: 'professional' } : {},
      position: { x: 250, y: 0 },
      connections: [],
    }

    setSteps(prev => {
      if (!afterId || afterId === 'first') {
        const yPos = prev.length === 0 ? 150 : 150
        newStep.position = { x: 250, y: yPos }
        return [newStep, ...prev].map((s, i) => ({
          ...s,
          position: {
            x: s.position.x,
            y: i * 200 + 150,
          },
        }))
      }
      const idx = parseInt(afterId.replace('step-', ''))
      const updated = [...prev]
      updated.splice(idx + 1, 0, newStep)
      return updated.map((s, i) => ({
        ...s,
        position: { x: s.position.x, y: i * 200 + 150 },
      }))
    })
    setAddStepMenuOpen(null)
    setSelectedNodeId(
      afterId === 'first'
        ? 'step-0'
        : `step-${parseInt((afterId || 'step-0').replace('step-', '')) + 1}`
    )
  }, [])

  const onSelect = useCallback((id: string) => {
    setSelectedNodeId(prev => (prev === id ? null : id))
  }, [])

  const onDelete = useCallback((id: string) => {
    setSteps(prev => {
      const idx = parseInt(id.replace('step-', ''))
      const deletedStepId = prev[idx]?.id
      return prev
        .filter((_, i) => i !== idx)
        .map(s => ({
          ...s,
          connections: s.connections.filter(
            c => c.targetStepId !== deletedStepId
          ),
        }))
    })
    setSelectedNodeId(prev => (prev === id ? null : prev))
    nodePositionsRef.current = {}
  }, [])

  const onAddBelow = useCallback((id: string) => {
    setAddStepMenuOpen(id)
  }, [])

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
    const { nodes: n, edges: e } = stepsToFlow(
      steps,
      triggerKeywords,
      selectedNodeId,
      {
        onSelect,
        onDelete,
        onAddBelow,
        onAddFirst,
      }
    )
    const positionedNodes = n.map(node => {
      const saved = nodePositionsRef.current[node.id]
      if (saved) {
        return { ...node, position: saved }
      }
      return node
    })
    setNodes(positionedNodes)
    setEdges(e)
  }, [
    steps,
    triggerKeywords,
    selectedNodeId,
    onSelect,
    onDelete,
    onAddBelow,
    onAddFirst,
  ])

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

  const updateSelectedStep = (updates: Partial<BotFlowStepPayload>) => {
    if (selectedIndex === null) {
      return
    }
    setSteps(prev =>
      prev.map((s, i) => (i === selectedIndex ? { ...s, ...updates } : s))
    )
  }

  const updateStepData = (dataUpdates: Record<string, unknown>) => {
    if (selectedIndex === null) {
      return
    }
    setSteps(prev =>
      prev.map((s, i) =>
        i === selectedIndex
          ? {
              ...s,
              data: { ...(s.data as Record<string, unknown>), ...dataUpdates },
            }
          : s
      )
    )
  }

  const handleSave = () => {
    const finalSteps = steps.map((s, idx) => {
      const savedPos = nodePositionsRef.current[`step-${idx}`]
      return {
        ...s,
        position: savedPos || s.position,
      }
    })
    onSave(finalSteps, triggerKeywords)
  }

  const stepData = selectedStep
    ? (selectedStep.data as Record<string, unknown>)
    : null

  const stepTypeOptions: Array<{ type: BotStepType; label: string }> = [
    { type: 'send_message', label: 'Send Message' },
    { type: 'wait_for_reply', label: 'Wait for Reply' },
    { type: 'keyword_match', label: 'Keyword Match' },
    { type: 'quick_reply', label: 'Quick Reply' },
    { type: 'ai_reply', label: 'AI Reply' },
    { type: 'assign_human', label: 'Assign Human' },
    { type: 'delay', label: 'Delay' },
  ]

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

          {addStepMenuOpen !== null && (
            <div className="absolute left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Add Step</span>
                <button
                  onClick={() => setAddStepMenuOpen(null)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {stepTypeOptions.map(opt => {
                  const cfg = stepConfig[opt.type]
                  const StepIcon = cfg.icon
                  return (
                    <button
                      key={opt.type}
                      onClick={() => addStep(opt.type, addStepMenuOpen!)}
                      className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors hover:bg-muted"
                    >
                      <StepIcon className="h-4 w-4 text-muted-foreground" />
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {selectedStep && stepData && (
          <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">
                {stepConfig[selectedStep.type].label} Settings
              </h3>
              <button
                onClick={() => setSelectedNodeId(null)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label className="text-xs">Step Type</Label>
                <Select
                  value={selectedStep.type}
                  onValueChange={val =>
                    updateSelectedStep({ type: val as BotStepType })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {stepTypeOptions.map(opt => (
                      <SelectItem key={opt.type} value={opt.type}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {(selectedStep.type === 'send_message' ||
                selectedStep.type === 'quick_reply') && (
                <div className="space-y-2">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={(stepData.message as string) || ''}
                    onChange={e => updateStepData({ message: e.target.value })}
                    placeholder="Enter message text..."
                    rows={4}
                    className="text-xs"
                  />
                </div>
              )}

              {selectedStep.type === 'keyword_match' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Keywords</Label>
                    <Textarea
                      value={
                        Array.isArray(stepData.keywords)
                          ? (stepData.keywords as string[]).join('\n')
                          : ''
                      }
                      onChange={e =>
                        updateStepData({
                          keywords: e.target.value
                            .split('\n')
                            .map(k => k.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="One keyword per line"
                      rows={4}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Match Type</Label>
                    <Select
                      value={(stepData.matchType as string) || 'contains'}
                      onValueChange={val => updateStepData({ matchType: val })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="exact">Exact Match</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="regex">Regex</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedStep.type === 'quick_reply' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Buttons</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs"
                      onClick={() => {
                        const buttons = (
                          (stepData.buttons as Array<{
                            id: string
                            title: string
                          }>) || []
                        ).slice()
                        if (buttons.length >= 3) {
                          return
                        }
                        buttons.push({
                          id: `btn_${Date.now()}`,
                          title: '',
                        })
                        updateStepData({ buttons })
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                  {Array.isArray(stepData.buttons) &&
                    (
                      stepData.buttons as Array<{
                        id: string
                        title: string
                      }>
                    ).map((btn, idx) => (
                      <div key={btn.id} className="flex items-center gap-2">
                        <Input
                          value={btn.title}
                          onChange={e => {
                            const buttons = [
                              ...(stepData.buttons as Array<{
                                id: string
                                title: string
                              }>),
                            ]
                            buttons[idx] = {
                              ...buttons[idx],
                              title: e.target.value,
                            }
                            updateStepData({ buttons })
                          }}
                          placeholder={`Button ${idx + 1}`}
                          className="h-7 text-xs"
                        />
                        <button
                          onClick={() => {
                            const buttons = (
                              stepData.buttons as Array<{
                                id: string
                                title: string
                              }>
                            ).filter((_, i) => i !== idx)
                            updateStepData({ buttons })
                          }}
                          className="rounded p-1 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {selectedStep.type === 'ai_reply' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">AI Tone</Label>
                    <Select
                      value={(stepData.aiTone as string) || 'professional'}
                      onValueChange={val => updateStepData({ aiTone: val })}
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
                      value={(stepData.aiContext as string) || ''}
                      onChange={e =>
                        updateStepData({ aiContext: e.target.value })
                      }
                      placeholder="Provide context for AI responses..."
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </>
              )}

              {selectedStep.type === 'delay' && (
                <div className="space-y-2">
                  <Label className="text-xs">Delay Duration</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      value={(() => {
                        const secs = Number(stepData.delaySeconds) || 60
                        const unit =
                          (stepData._delayUnit as string) ||
                          (secs >= 3600
                            ? 'hours'
                            : secs >= 60
                              ? 'minutes'
                              : 'seconds')
                        if (unit === 'hours') {
                          return Math.floor(secs / 3600)
                        }
                        if (unit === 'minutes') {
                          return Math.floor(secs / 60)
                        }
                        return secs
                      })()}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1
                        const unit =
                          (stepData._delayUnit as string) || 'minutes'
                        let secs = val
                        if (unit === 'minutes') {
                          secs = val * 60
                        }
                        if (unit === 'hours') {
                          secs = val * 3600
                        }
                        updateStepData({
                          delaySeconds: secs,
                          _delayUnit: unit,
                        })
                      }}
                      className="h-8 flex-1 text-xs"
                    />
                    <Select
                      value={
                        (stepData._delayUnit as string) ||
                        (Number(stepData.delaySeconds) >= 3600
                          ? 'hours'
                          : Number(stepData.delaySeconds) >= 60
                            ? 'minutes'
                            : 'seconds')
                      }
                      onValueChange={val => {
                        const currentSecs = Number(stepData.delaySeconds) || 60
                        const oldUnit =
                          (stepData._delayUnit as string) || 'minutes'
                        let baseVal = currentSecs
                        if (oldUnit === 'minutes') {
                          baseVal = Math.floor(currentSecs / 60)
                        }
                        if (oldUnit === 'hours') {
                          baseVal = Math.floor(currentSecs / 3600)
                        }
                        if (oldUnit === 'seconds') {
                          baseVal = currentSecs
                        }
                        let newSecs = baseVal
                        if (val === 'minutes') {
                          newSecs = baseVal * 60
                        }
                        if (val === 'hours') {
                          newSecs = baseVal * 3600
                        }
                        updateStepData({
                          delaySeconds: newSecs,
                          _delayUnit: val,
                        })
                      }}
                    >
                      <SelectTrigger className="h-8 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="seconds">Seconds</SelectItem>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {selectedStep.type === 'wait_for_reply' && (
                <div className="space-y-2">
                  <Label className="text-xs">Timeout (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={Number(stepData.delaySeconds) || 0}
                    onChange={e =>
                      updateStepData({
                        delaySeconds: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0 = no timeout"
                    className="h-8 text-xs"
                  />
                  <p className="text-xs text-muted-foreground">
                    0 means wait indefinitely
                  </p>
                </div>
              )}

              {selectedStep.type === 'condition' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Field</Label>
                    <Input
                      value={
                        (
                          stepData.condition as {
                            field: string
                            operator: string
                            value: string
                          }
                        )?.field || ''
                      }
                      onChange={e =>
                        updateStepData({
                          condition: {
                            ...((stepData.condition as Record<
                              string,
                              string
                            >) || {}),
                            field: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g. lastMessage"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Operator</Label>
                    <Select
                      value={
                        (
                          stepData.condition as {
                            field: string
                            operator: string
                            value: string
                          }
                        )?.operator || 'equals'
                      }
                      onValueChange={val =>
                        updateStepData({
                          condition: {
                            ...((stepData.condition as Record<
                              string,
                              string
                            >) || {}),
                            operator: val,
                          },
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="starts_with">Starts With</SelectItem>
                        <SelectItem value="not_equals">Not Equals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Value</Label>
                    <Input
                      value={
                        (
                          stepData.condition as {
                            field: string
                            operator: string
                            value: string
                          }
                        )?.value || ''
                      }
                      onChange={e =>
                        updateStepData({
                          condition: {
                            ...((stepData.condition as Record<
                              string,
                              string
                            >) || {}),
                            value: e.target.value,
                          },
                        })
                      }
                      placeholder="Value to compare"
                      className="h-8 text-xs"
                    />
                  </div>
                </>
              )}

              {selectedStep.type === 'assign_human' && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    This step will hand the conversation off to a human agent.
                    The bot will stop responding until the agent closes the
                    conversation.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!selectedStep && selectedNodeId === null && (
          <div className="flex w-80 shrink-0 flex-col overflow-hidden border-l bg-card">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h3 className="text-sm font-semibold">Trigger Settings</h3>
            </div>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              <div className="space-y-2">
                <Label className="text-xs">Trigger Keywords</Label>
                <Textarea
                  value={triggerKeywords.join('\n')}
                  onChange={e =>
                    setTriggerKeywords(
                      e.target.value
                        .split('\n')
                        .map(k => k.trim())
                        .filter(Boolean)
                    )
                  }
                  placeholder="One keyword per line&#10;Leave empty for all messages"
                  rows={5}
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Bot activates when any of these keywords are detected. Leave
                  empty to respond to all messages.
                </p>
              </div>
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
