import { Suspense } from 'react'
import { ModernLoginForm } from '@/components/auth/ModernLoginForm'

function LoginFormWrapper() {
  return <ModernLoginForm />
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginFormWrapper />
    </Suspense>
  )
}
