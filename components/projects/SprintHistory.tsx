'use client'

import {
  Calendar,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { type Sprint } from '@/lib/api/projectsApi'

interface SprintHistoryProps {
  sprints: Sprint[]
}

export function SprintHistory({ sprints }: SprintHistoryProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const completedSprints = sprints.filter(
    s => s.status === 'completed' || s.status === 'cancelled'
  )

  if (completedSprints.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">
          No completed sprints yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Sprint History
      </h3>
      {completedSprints.map(sprint => {
        const progress =
          sprint.taskCount > 0
            ? Math.round((sprint.completedTaskCount / sprint.taskCount) * 100)
            : 0
        const isExpanded = expandedId === sprint.id

        return (
          <Card key={sprint.id} className="overflow-hidden">
            <CardContent className="p-4">
              <button
                className="flex w-full items-center justify-between text-left"
                onClick={() => setExpandedId(isExpanded ? null : sprint.id)}
              >
                <div className="flex items-center gap-3">
                  {sprint.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                  <div>
                    <span className="font-medium">{sprint.name}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(sprint.startDate).toLocaleDateString()} —{' '}
                      {new Date(sprint.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="text-xs">
                    {sprint.completedTaskCount}/{sprint.taskCount} tasks
                  </Badge>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 space-y-3 border-t pt-3">
                  {sprint.goal && (
                    <div className="text-sm">
                      <span className="font-medium">Goal: </span>
                      <span className="text-muted-foreground">
                        {sprint.goal}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Progress value={progress} className="h-2 flex-1" />
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total Tasks</span>
                      <p className="font-semibold">{sprint.taskCount}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed</span>
                      <p className="font-semibold text-green-600">
                        {sprint.completedTaskCount}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {sprint.completedAt ? 'Completed' : 'Cancelled'}
                      </span>
                      <p className="font-semibold">
                        {new Date(
                          sprint.completedAt || sprint.updatedAt
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
