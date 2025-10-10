'use client'

import React, { useState } from 'react'
import { X, Clock, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'

export interface PendingInput {
  _id: string
  execution: {
    _id: string
    workflowName: string
    status: string
    startedAt: string
  }
  step: number
  inputSchema: Record<string, any>
  timeoutAt: string
  timeRemaining: number
  timeRemainingMinutes: number
  isExpired: boolean
  metadata: {
    workflowName: string
    stepDescription?: string
    priority: 'low' | 'medium' | 'high'
    requiresImmediate: boolean
  }
  webhookUrl: string
  createdAt: string
  inputUrl: string
}

interface PendingInputsModalProps {
  pendingInputs: PendingInput[]
  isOpen: boolean
  onClose: () => void
  onInputSelected: (input: PendingInput) => void
  isLoading?: boolean
}

export function PendingInputsModal({
  pendingInputs,
  isOpen,
  onClose,
  onInputSelected,
  isLoading = false
}: PendingInputsModalProps) {
  const [selectedInput, setSelectedInput] = useState<string | null>(null)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getUrgencyIndicator = (input: PendingInput) => {
    if (input.isExpired) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />
    }
    if (input.timeRemainingMinutes < 15) {
      return <Clock className="h-4 w-4 text-orange-600" />
    }
    if (input.metadata.requiresImmediate) {
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />
    }
    return <CheckCircle className="h-4 w-4 text-green-600" />
  }

  const formatTimeRemaining = (minutes: number) => {
    if (minutes <= 0) return 'Expired'
    if (minutes < 60) return `${minutes}m`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}h ${mins}m`
  }

  const handleInputClick = (input: PendingInput) => {
    setSelectedInput(input._id)
    onInputSelected(input)
  }

  const expiredInputs = pendingInputs.filter(input => input.isExpired)
  const urgentInputs = pendingInputs.filter(input => !input.isExpired && input.timeRemainingMinutes < 15)
  const normalInputs = pendingInputs.filter(input => !input.isExpired && input.timeRemainingMinutes >= 15)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-primary" />
            <span>Pending Workflow Inputs</span>
          </DialogTitle>
          <DialogDescription>
            {pendingInputs.length > 0
              ? `You have ${pendingInputs.length} workflow${pendingInputs.length > 1 ? 's' : ''} waiting for input`
              : 'No pending inputs at the moment'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pendingInputs.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <p className="text-muted-foreground">All workflows are running smoothly!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6">
              {/* Expired Inputs */}
              {expiredInputs.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="text-lg font-semibold text-red-800">Expired ({expiredInputs.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {expiredInputs.map((input) => (
                      <InputCard
                        key={input._id}
                        input={input}
                        onSelect={() => handleInputClick(input)}
                        isSelected={selectedInput === input._id}
                        getPriorityColor={getPriorityColor}
                        getUrgencyIndicator={getUrgencyIndicator}
                        formatTimeRemaining={formatTimeRemaining}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Urgent Inputs */}
              {urgentInputs.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Clock className="h-5 w-5 text-orange-600" />
                    <h3 className="text-lg font-semibold text-orange-800">Urgent ({urgentInputs.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {urgentInputs.map((input) => (
                      <InputCard
                        key={input._id}
                        input={input}
                        onSelect={() => handleInputClick(input)}
                        isSelected={selectedInput === input._id}
                        getPriorityColor={getPriorityColor}
                        getUrgencyIndicator={getUrgencyIndicator}
                        formatTimeRemaining={formatTimeRemaining}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Normal Inputs */}
              {normalInputs.length > 0 && (
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="text-lg font-semibold text-green-800">Active ({normalInputs.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {normalInputs.map((input) => (
                      <InputCard
                        key={input._id}
                        input={input}
                        onSelect={() => handleInputClick(input)}
                        isSelected={selectedInput === input._id}
                        getPriorityColor={getPriorityColor}
                        getUrgencyIndicator={getUrgencyIndicator}
                        formatTimeRemaining={formatTimeRemaining}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface InputCardProps {
  input: PendingInput
  onSelect: () => void
  isSelected: boolean
  getPriorityColor: (priority: string) => string
  getUrgencyIndicator: (input: PendingInput) => JSX.Element
  formatTimeRemaining: (minutes: number) => string
}

function InputCard({
  input,
  onSelect,
  isSelected,
  getPriorityColor,
  getUrgencyIndicator,
  formatTimeRemaining
}: InputCardProps) {
  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'border-primary bg-primary/5' : 'border-border'
      } ${input.isExpired ? 'border-red-200 bg-red-50' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {getUrgencyIndicator(input)}
            <h4 className="font-medium text-sm">{input.execution.workflowName}</h4>
            <Badge className={`text-xs ${getPriorityColor(input.metadata.priority)}`}>
              {input.metadata.priority}
            </Badge>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Step {input.step}: {input.metadata.stepDescription || 'User input required'}
          </p>

          <div className="flex items-center space-x-4 text-xs text-muted-foreground">
            <span>Started: {new Date(input.execution.startedAt).toLocaleString()}</span>
            <span>•</span>
            <span className={input.timeRemainingMinutes < 15 ? 'text-orange-600 font-medium' : ''}>
              {formatTimeRemaining(input.timeRemainingMinutes)} remaining
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" asChild>
            <a
              href={`/engines/executions/${input.execution._id}/input`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1"
              onClick={(e) => e.stopPropagation()}
            >
              <span>Provide Input</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {input.isExpired && (
        <Alert className="mt-3 border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 text-sm">
            This input request has expired. The workflow has been cancelled.
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}