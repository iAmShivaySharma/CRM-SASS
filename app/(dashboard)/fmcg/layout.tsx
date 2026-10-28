import { redirect } from 'next/navigation'
import { isModuleDisabled } from '@/lib/config/modules'

export default function FmcgLayout({ children }: { children: React.ReactNode }) {
  if (isModuleDisabled('fmcg')) {
    redirect('/dashboard')
  }
  return <div className="h-full">{children}</div>
}
