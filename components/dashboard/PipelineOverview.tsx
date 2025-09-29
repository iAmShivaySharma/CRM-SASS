'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppSelector } from '@/lib/hooks'
import { useGetPipelineAnalyticsQuery } from '@/lib/api/analyticsApi'

const statusColors = [
  'bg-blue-500',
  'bg-yellow-500',
  'bg-orange-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
]

export function PipelineOverview() {
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const {
    data: pipelineData,
    isLoading,
    error,
  } = useGetPipelineAnalyticsQuery(
    { workspaceId: currentWorkspace?.id || '' },
    { skip: !currentWorkspace?.id }
  )

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="mb-2 flex items-center justify-between">
                  <div className="h-4 w-20 rounded bg-gray-200"></div>
                  <div className="h-4 w-16 rounded bg-gray-200"></div>
                </div>
                <div className="h-2 rounded bg-gray-200"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !pipelineData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">No Data</span>
              <span className="text-sm text-muted-foreground">0 leads</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-gray-300"
                style={{ width: '0%' }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const pipeline = pipelineData.data

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Pipeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pipeline.map((stage, index) => (
            <div key={stage.statusName}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{stage.statusName}</span>
                <span className="text-sm text-muted-foreground">
                  {stage.count} lead{stage.count !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${statusColors[index % statusColors.length]}`}
                  style={{ width: `${Math.max(stage.percentage, 2)}%` }}
                ></div>
              </div>
            </div>
          ))}
          {pipeline.length === 0 && (
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">No active leads</span>
                <span className="text-sm text-muted-foreground">0 leads</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-gray-300"
                  style={{ width: '0%' }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
