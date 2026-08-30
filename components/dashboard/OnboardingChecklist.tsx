'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, X, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useAppSelector } from '@/lib/hooks'

interface OnboardingStep {
  id: string
  title: string
  completed: boolean
}

export function OnboardingChecklist() {
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [progress, setProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { currentWorkspace } = useAppSelector(state => state.workspace)

  useEffect(() => {
    if (!currentWorkspace?.id) return

    const wasDismissed = localStorage.getItem('onboarding_dismissed')
    if (wasDismissed === 'true') {
      setDismissed(true)
      setLoading(false)
      return
    }

    const fetchOnboarding = async () => {
      try {
        const response = await fetch(
          `/api/onboarding?workspaceId=${currentWorkspace.id}`
        )
        const data = await response.json()
        if (data.success) {
          setSteps(data.steps)
          setProgress(data.progress)
          setIsComplete(data.isComplete)
        }
      } catch {}
      setLoading(false)
    }

    fetchOnboarding()
  }, [currentWorkspace?.id])

  const handleDismiss = () => {
    localStorage.setItem('onboarding_dismissed', 'true')
    setDismissed(true)
  }

  const stepRoutes: Record<string, string> = {
    complete_profile: '/settings',
    invite_team: '/settings',
    create_lead: '/leads',
    create_project: '/projects',
    send_message: '/chat',
  }

  if (loading || dismissed || isComplete) return null

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Getting Started</CardTitle>
        <Button variant="ghost" size="sm" onClick={handleDismiss}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3">
          <Progress value={progress} className="flex-1" />
          <span className="text-sm font-medium text-muted-foreground">
            {progress}%
          </span>
        </div>
        <div className="space-y-1">
          {steps.map(step => (
            <button
              key={step.id}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted/50"
              onClick={() => {
                const route = stepRoutes[step.id]
                if (route) router.push(route)
              }}
              disabled={step.completed}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <span
                className={
                  step.completed ? 'text-muted-foreground line-through' : ''
                }
              >
                {step.title}
              </span>
              {!step.completed && (
                <ChevronRight className="ml-auto h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
