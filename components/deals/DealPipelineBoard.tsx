'use client'

import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  Plus,
  Search,
  Settings2,
  TrendingUp,
  IndianRupee,
  Target,
  Trophy,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { useAppSelector } from '@/lib/hooks'
import {
  useGetPipelinesQuery,
  useGetPipelineQuery,
  useGetDealsQuery,
  useCreateDealMutation,
  useMoveDealMutation,
  useGetDealAnalyticsQuery,
  type Deal,
} from '@/lib/api/dealsApi'
import { StageColumn } from './StageColumn'
import { DealCard } from './DealCard'
import { DealForm } from './DealForm'
import { DealDetailsSheet } from './DealDetailsSheet'

export function DealPipelineBoard() {
  const currentWorkspace = useAppSelector(
    (state: any) => state.workspace?.currentWorkspace
  )
  const workspaceId = currentWorkspace?.id || currentWorkspace?._id || ''

  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createInStageId, setCreateInStageId] = useState<string>('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [activeDragDeal, setActiveDragDeal] = useState<Deal | null>(null)
  const [showAnalytics, setShowAnalytics] = useState(false)

  const { data: pipelines, isLoading: pipelinesLoading } = useGetPipelinesQuery(
    workspaceId,
    { skip: !workspaceId }
  )

  const activePipelineId =
    selectedPipelineId ||
    pipelines?.find(p => p.isDefault)?.id ||
    pipelines?.[0]?.id ||
    ''

  const { data: pipelineData, isLoading: pipelineLoading } =
    useGetPipelineQuery(
      { id: activePipelineId, workspaceId },
      { skip: !activePipelineId || !workspaceId }
    )

  const { data: dealsData, isLoading: dealsLoading } = useGetDealsQuery(
    {
      workspaceId,
      pipelineId: activePipelineId,
      status: 'open',
      limit: 200,
    },
    { skip: !activePipelineId || !workspaceId }
  )

  const { data: analytics } = useGetDealAnalyticsQuery(
    { workspaceId, pipelineId: activePipelineId },
    { skip: !activePipelineId || !workspaceId }
  )

  const [moveDeal] = useMoveDealMutation()

  const pipeline = pipelineData?.pipeline
  const deals = dealsData?.deals || []

  const dealsByStage = useMemo(() => {
    const map: Record<string, Deal[]> = {}
    if (pipeline?.stages) {
      pipeline.stages.forEach(stage => {
        map[stage.id] = []
      })
    }
    deals.forEach(deal => {
      const stageId =
        typeof deal.stageId === 'object' ? deal.stageId.id : deal.stageId
      if (map[stageId]) {
        map[stageId].push(deal)
      }
    })
    return map
  }, [deals, pipeline?.stages])

  const filteredDealsByStage = useMemo(() => {
    if (!searchTerm) return dealsByStage
    const term = searchTerm.toLowerCase()
    const filtered: Record<string, Deal[]> = {}
    Object.entries(dealsByStage).forEach(([stageId, stageDeals]) => {
      filtered[stageId] = stageDeals.filter(
        deal =>
          deal.title.toLowerCase().includes(term) ||
          (typeof deal.contactId === 'object' &&
            deal.contactId?.name?.toLowerCase().includes(term)) ||
          (typeof deal.assignedTo === 'object' &&
            deal.assignedTo?.fullName?.toLowerCase().includes(term))
      )
    })
    return filtered
  }, [dealsByStage, searchTerm])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const deal = deals.find(d => d.id === event.active.id)
    if (deal) setActiveDragDeal(deal)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDragDeal(null)
    const { active, over } = event
    if (!over || !active) return

    const dealId = active.id as string
    const targetStageId = over.id as string

    const deal = deals.find(d => d.id === dealId)
    if (!deal) return

    const currentStageId =
      typeof deal.stageId === 'object' ? deal.stageId.id : deal.stageId
    if (currentStageId === targetStageId) return

    try {
      await moveDeal({
        id: dealId,
        stageId: targetStageId,
        workspaceId,
      }).unwrap()
      toast.success('Deal moved successfully')
    } catch {
      toast.error('Failed to move deal')
    }
  }

  const handleCreateInStage = (stageId: string) => {
    setCreateInStageId(stageId)
    setIsCreateOpen(true)
  }

  const isLoading = pipelinesLoading || pipelineLoading || dealsLoading

  if (!workspaceId) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-muted-foreground">Please select a workspace first</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Deals</h1>
          <p className="text-sm text-muted-foreground">
            Manage your sales pipeline and track deals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="mr-1 h-4 w-4" />
            {showAnalytics ? 'Hide' : 'Show'} Stats
          </Button>
          <Button size="sm" onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            New Deal
          </Button>
        </div>
      </div>

      {/* Analytics Bar */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-2 gap-3 border-b p-4 md:grid-cols-5">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Open Deals</p>
                  <p className="text-lg font-bold">
                    {analytics.overview.openDeals}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Pipeline Value
                  </p>
                  <p className="text-lg font-bold">
                    ₹{(analytics.overview.openValue / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Weighted</p>
                  <p className="text-lg font-bold">
                    ₹{(analytics.overview.weightedPipeline / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                  <p className="text-lg font-bold">
                    {analytics.overview.winRate}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Won Value</p>
                  <p className="text-lg font-bold">
                    ₹{(analytics.overview.wonValue / 1000).toFixed(0)}K
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 border-b p-4">
        {pipelines && pipelines.length > 1 && (
          <Select
            value={activePipelineId}
            onValueChange={setSelectedPipelineId}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Pipeline Board */}
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !pipeline ? (
        <div className="flex h-64 flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">No pipeline found</p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />
            Create your first pipeline
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex h-full min-h-[500px] gap-4">
              {pipeline.stages
                .filter(s => !s.isLostStage)
                .map(stage => (
                  <StageColumn
                    key={stage.id}
                    stage={stage}
                    deals={filteredDealsByStage[stage.id] || []}
                    onAddDeal={() => handleCreateInStage(stage.id)}
                    onDealClick={setSelectedDeal}
                  />
                ))}
            </div>

            <DragOverlay>
              {activeDragDeal ? (
                <DealCard deal={activeDragDeal} isDragging />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Create Deal Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Deal</DialogTitle>
          </DialogHeader>
          <DealForm
            workspaceId={workspaceId}
            pipelineId={activePipelineId}
            defaultStageId={createInStageId}
            stages={pipeline?.stages || []}
            onSuccess={() => {
              setIsCreateOpen(false)
              setCreateInStageId('')
            }}
            onCancel={() => {
              setIsCreateOpen(false)
              setCreateInStageId('')
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Deal Details Sheet */}
      {selectedDeal && (
        <DealDetailsSheet
          deal={selectedDeal}
          workspaceId={workspaceId}
          stages={pipeline?.stages || []}
          open={!!selectedDeal}
          onClose={() => setSelectedDeal(null)}
        />
      )}
    </div>
  )
}
