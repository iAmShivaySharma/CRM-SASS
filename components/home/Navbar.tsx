'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const links = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <header className={cn(
      'fixed inset-x-0 top-0 z-50 transition-[background,border,box-shadow] duration-300',
      scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-neutral-200/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]' : '',
    )}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/home" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white">
            <Zap className="h-4 w-4" />
          </div>
          <span className="text-[17px] font-semibold text-neutral-900">CRM Pro</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map(l => (
            <a key={l.href} href={l.href} className="px-3.5 py-2 text-[13px] font-medium text-neutral-500 transition-colors hover:text-neutral-900">{l.label}</a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button variant="ghost" size="sm" asChild><Link href="/login">Log in</Link></Button>
          <Button size="sm" asChild className="bg-blue-600 hover:bg-blue-700"><Link href="/register">Get started free</Link></Button>
        </div>

        <button className="grid h-9 w-9 place-items-center rounded-lg hover:bg-neutral-100 md:hidden" onClick={() => setOpen(!open)}>
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <nav className="border-t bg-white px-5 pb-5 pt-3 md:hidden">
          {links.map(l => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50">{l.label}</a>
          ))}
          <div className="mt-3 grid gap-2">
            <Button variant="outline" asChild><Link href="/login">Log in</Link></Button>
            <Button asChild className="bg-blue-600"><Link href="/register">Get started free</Link></Button>
          </div>
        </nav>
      )}
    </header>
  )
}
