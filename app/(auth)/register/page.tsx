import { Suspense } from 'react'
import { ModernRegisterForm } from '@/components/auth/ModernRegisterForm'

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-full max-w-md space-y-4">
            <div className="space-y-2 text-center">
              <div className="mx-auto h-8 w-40 animate-pulse rounded bg-muted" />
              <div className="mx-auto h-4 w-56 animate-pulse rounded bg-muted" />
            </div>
            <div className="space-y-4 rounded-lg border p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                  <div className="h-10 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
                <div className="h-10 w-full animate-pulse rounded bg-muted" />
              </div>
              <div className="h-10 w-full animate-pulse rounded bg-muted" />
            </div>
          </div>
        </div>
      }
    >
      <ModernRegisterForm />
    </Suspense>
  )
}
