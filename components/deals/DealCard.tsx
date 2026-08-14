'use client'

import { useDraggable } from '@dnd-kit/core'
import {
  IndianRupee,
  User,
  Calendar,
  Building2,
  GripVertical,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { type Deal } from '@/lib/api/dealsApi'

interface DealCardProps {
  deal: Deal
  isDragging?: boolean
  onClick?: () => void
}

const priorityColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium:
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export function DealCard({ deal, isDragging, onClick }: DealCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: deal.id,
  })

  const style = transform
    ? {
        transform: `translate(${transform.x}px, ${transform.y}px)`,
      }
    : undefined

  const contactName =
    typeof deal.contactId === 'object' ? deal.contactId?.name : null
  const contactCompany =
    typeof deal.contactId === 'object' ? deal.contactId?.company : null
  const assigneeName =
    typeof deal.assignedTo === 'object' ? deal.assignedTo?.fullName : null
  const assigneeInitials = assigneeName
    ? assigneeName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : null

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-pointer transition-all hover:shadow-md ${
        isDragging ? 'rotate-2 scale-105 opacity-90 shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start gap-2">
          <button
            className="mt-0.5 cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
            {...listeners}
            {...attributes}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{deal.title}</p>

            {(contactName || contactCompany) && (
              <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                {contactCompany ? (
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                ) : (
                  <User className="h-3 w-3 flex-shrink-0" />
                )}
                <span className="truncate">
                  {contactName}
                  {contactCompany ? ` · ${contactCompany}` : ''}
                </span>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1 text-sm font-semibold">
                <IndianRupee className="h-3.5 w-3.5" />
                <span>{deal.value.toLocaleString('en-IN')}</span>
              </div>
              <Badge
                variant="secondary"
                className={`px-1.5 py-0 text-[10px] ${priorityColors[deal.priority]}`}
              >
                {deal.priority}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between">
              {deal.expectedCloseDate && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {new Date(deal.expectedCloseDate).toLocaleDateString(
                      'en-IN',
                      {
                        day: 'numeric',
                        month: 'short',
                      }
                    )}
                  </span>
                </div>
              )}
              {assigneeInitials && (
                <Avatar className="h-5 w-5">
                  <AvatarFallback className="bg-primary/10 text-[9px] text-primary">
                    {assigneeInitials}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
