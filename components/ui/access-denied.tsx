'use client'

import { ShieldX } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface AccessDeniedProps {
  message?: string
}

export function AccessDenied({
  message = "You don't have permission to access this page.",
}: AccessDeniedProps) {
  const router = useRouter()

  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="text-center">
        <ShieldX className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
        <p className="mb-6 text-muted-foreground">{message}</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
