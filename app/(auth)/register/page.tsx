import { Suspense } from 'react'
import { ModernRegisterForm } from '@/components/auth/ModernRegisterForm'

function RegisterFormWrapper() {
  return <ModernRegisterForm />
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <RegisterFormWrapper />
    </Suspense>
  )
}
