'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Play,
  DollarSign,
  Clock,
  Users,
  Key,
  Zap,
  Info,
  Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkflowCardProps {
  workflow: {
    id: string
    name: string
    description: string
    category: string
    tags: string[]
    estimatedCost: number
    avgExecutionTime: number
    usageCount: number
    requiresApiKey: boolean
    inputSchema: Record<string, any>
  }
  onExecute: () => void
}

export function WorkflowCard({ workflow, onExecute }: WorkflowCardProps) {
  const {
    name,
    description,
    category,
    tags,
    estimatedCost,
    avgExecutionTime,
    usageCount,
    requiresApiKey
  } = workflow

  const getCategoryColor = (category: string) => {
    const colors = {
      'Content Creation': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'Data Processing': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'Marketing': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'Social Media': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'Sales': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'Finance': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
  }

  const getPopularityColor = () => {
    if (usageCount > 2000) return 'text-green-600'
    if (usageCount > 1000) return 'text-blue-600'
    return 'text-gray-600'
  }

  const formatExecutionTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`
  }

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 border-muted hover:border-primary/20">
      {/* Popular Badge */}
      {usageCount > 1500 && (
        <div className="absolute top-3 right-3 z-10">
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
            <Star className="mr-1 h-3 w-3" />
            Popular
          </Badge>
        </div>
      )}

      {/* API Key Required Indicator */}
      {requiresApiKey && (
        <div className="absolute top-3 left-3 z-10">
          <Badge variant="outline" className="bg-background/90 backdrop-blur-sm">
            <Key className="mr-1 h-3 w-3" />
            API
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="space-y-2">
          <Badge
            variant="secondary"
            className={cn("w-fit text-xs", getCategoryColor(category))}
          >
            {category}
          </Badge>
          <CardTitle className="text-lg font-semibold leading-tight group-hover:text-primary transition-colors">
            {name}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pb-4">
        {/* Tags */}
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
              {tag}
            </Badge>
          ))}
          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs px-2 py-0">
              +{tags.length - 3}
            </Badge>
          )}
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-3 text-sm">
          <div className="flex items-center space-x-1">
            <DollarSign className="h-3 w-3 text-green-600" />
            <span className="text-xs text-muted-foreground">
              ${estimatedCost.toFixed(3)}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3 text-blue-600" />
            <span className="text-xs text-muted-foreground">
              {formatExecutionTime(avgExecutionTime)}
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Users className={cn("h-3 w-3", getPopularityColor())} />
            <span className="text-xs text-muted-foreground">
              {usageCount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-muted/30 rounded-lg p-3 space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">With your API key:</span>
            <span className="font-medium text-green-600">Free</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-muted-foreground">With platform key:</span>
            <span className="font-medium">${estimatedCost.toFixed(3)}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <div className="flex w-full space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => {
              // Show workflow details/info modal
            }}
          >
            <Info className="mr-2 h-4 w-4" />
            Details
          </Button>

          <Button
            size="sm"
            className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
            onClick={onExecute}
          >
            <Zap className="mr-2 h-4 w-4" />
            Execute
          </Button>
        </div>
      </CardFooter>

      {/* Hover Effect Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </Card>
  )
}