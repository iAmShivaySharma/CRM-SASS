import { Suspense } from 'react'
import { ModernRegisterForm } from '@/components/auth/ModernRegisterForm'

function RegisterFormWrapper() {
  return <ModernRegisterForm />
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-4 w-full max-w-md">
          <div className="space-y-2 text-center">
            <div className="h-8 w-40 bg-muted rounded animate-pulse mx-auto" />
            <div className="h-4 w-56 bg-muted rounded animate-pulse mx-auto" />
          </div>
          <div className="space-y-4 p-6 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                <div className="h-10 w-full bg-muted rounded animate-pulse" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-10 w-full bg-muted rounded animate-pulse" />
            </div>
            <div className="h-10 w-full bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <RegisterFormWrapper />
    </Suspense>
  )
}
