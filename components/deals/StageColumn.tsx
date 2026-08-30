'use client'

import { useDroppable } from '@dnd-kit/core'
import { Plus, IndianRupee } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { type PipelineStage, type Deal } from '@/lib/api/dealsApi'
import { DealCard } from './DealCard'

interface StageColumnProps {
  stage: PipelineStage
  deals: Deal[]
  onAddDeal: () => void
  onDealClick: (deal: Deal) => void
}

export function StageColumn({
  stage,
  deals,
  onAddDeal,
  onDealClick,
}: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  })

  const totalValue = deals.reduce((sum, d) => sum + d.value, 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[300px] min-w-[300px] flex-col rounded-lg border bg-muted/30 transition-colors ${
        isOver ? 'border-primary bg-primary/5' : ''
      }`}
    >
      {/* Stage Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <h3 className="text-sm font-semibold">{stage.name}</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {deals.length}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onAddDeal}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Stage Value */}
      {totalValue > 0 && (
        <div className="flex items-center gap-1 border-b px-3 py-1.5 text-xs text-muted-foreground">
          <IndianRupee className="h-3 w-3" />
          <span>{totalValue.toLocaleString('en-IN')}</span>
          <span className="ml-auto">{stage.probability}%</span>
        </div>
      )}

      {/* Deal Cards */}
      <ScrollArea className="flex-1 p-2">
        <div className="flex flex-col gap-2">
          {deals.map(deal => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={() => onDealClick(deal)}
            />
          ))}
          {deals.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="mb-2 text-xs text-muted-foreground">
                No deals in this stage
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onAddDeal}
              >
                <Plus className="mr-1 h-3 w-3" />
                Add deal
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
