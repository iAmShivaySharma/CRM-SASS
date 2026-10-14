'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppSelector } from '@/lib/hooks'
import { usePathname } from 'next/navigation'
import { X, ArrowRight, ArrowLeft, Rocket } from 'lucide-react'

const TOUR_KEY = 'crm_tour_done'

const STEPS = [
  { target: '[data-tour="workspace-switcher"]', title: 'Workspaces', desc: 'Switch between workspaces. Each has its own data and team.' },
  { target: '[data-tour="sidebar-dashboard"]', title: 'Dashboard', desc: 'Stats, revenue, pipeline overview, and recent activity.' },
  { target: '[data-tour="sidebar-leads"]', title: 'Leads', desc: 'Create, import, score, and track leads through your pipeline.' },
  { target: '[data-tour="sidebar-contacts"]', title: 'Contacts', desc: 'Manage contacts converted from leads with full history.' },
  { target: '[data-tour="sidebar-deals"]', title: 'Deals', desc: 'Visual pipeline board. Drag deals between stages.' },
  { target: '[data-tour="sidebar-projects"]', title: 'Projects', desc: 'Kanban boards, sprints, tasks, and documents.' },
  { target: '[data-tour="sidebar-chat"]', title: 'Chat', desc: 'Team messaging with channels and file sharing.' },
  { target: '[data-tour="sidebar-whatsapp"]', title: 'WhatsApp', desc: 'Templates, broadcasts, bot flows via Meta API.' },
  { target: '[data-tour="sidebar-campaigns"]', title: 'Campaigns', desc: 'Multi-channel email, SMS, and WhatsApp sequences.' },
  { target: '[data-tour="sidebar-employees"]', title: 'HR', desc: 'Attendance, leaves, shifts, and asset management.' },
  { target: '[data-tour="sidebar-webhooks"]', title: 'Integrations', desc: 'Facebook, Google Ads, LinkedIn lead forms and webhooks.' },
  { target: '[data-tour="sidebar-settings"]', title: 'Settings', desc: 'Workspace config, roles, permissions, and profile.' },
]

export function SiteTour() {
  const [prompt, setPrompt] = useState(false)
  const [step, setStep] = useState(-1)
  const [rect, setRect] = useState({ top: 0, left: 0, w: 0, h: 0 })
  const [tip, setTip] = useState({ top: 0, left: 0 })
  const [visible, setVisible] = useState(false)
  const { currentWorkspace } = useAppSelector(s => s.workspace)
  const { isAuthenticated } = useAppSelector(s => s.auth)
  const path = usePathname()

  useEffect(() => {
    if (!isAuthenticated || !currentWorkspace?.id || path !== '/dashboard') return
    if (localStorage.getItem(TOUR_KEY) === 'true') return
    const t = setTimeout(() => setPrompt(true), 2000)
    return () => clearTimeout(t)
  }, [isAuthenticated, currentWorkspace?.id, path])

  const place = useCallback((i: number) => {
    const s = STEPS[i]
    if (!s) return
    const el = document.querySelector(s.target)
    if (!el) {
      if (i < STEPS.length - 1) setStep(i + 1)
      return
    }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top - 4, left: r.left - 4, w: r.width + 8, h: r.height + 8 })
      let t = r.top
      let l = r.right + 16
      if (l + 300 > window.innerWidth) l = r.left - 316
      t = Math.max(12, Math.min(t, window.innerHeight - 200))
      setTip({ top: t, left: Math.max(12, l) })
      setVisible(true)
    })
  }, [])

  useEffect(() => {
    if (step < 0) return
    place(step)
  }, [step, place])

  useEffect(() => {
    if (step < 0) return
    const fn = () => place(step)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [step, place])

  useEffect(() => {
    if (step < 0) return
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') done()
      if (e.key === 'ArrowRight' && step < STEPS.length - 1) setStep(p => p + 1)
      if (e.key === 'ArrowLeft' && step > 0) setStep(p => p - 1)
    }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  })

  const done = useCallback(() => {
    setVisible(false)
    setTimeout(() => {
      localStorage.setItem(TOUR_KEY, 'true')
      setStep(-1)
    }, 150)
  }, [])

  const start = () => { setPrompt(false); setStep(0) }
  const skip = () => { localStorage.setItem(TOUR_KEY, 'true'); setPrompt(false) }

  const cur = STEPS[step]
  const pct = STEPS.length > 0 ? ((step + 1) / STEPS.length) * 100 : 0

  if (step >= 0) return (
    <>
      <svg className="pointer-events-none fixed inset-0 z-[9998] h-full w-full">
        <defs>
          <mask id="tm">
            <rect width="100%" height="100%" fill="white" />
            <rect
              x={rect.left} y={rect.top} width={rect.w} height={rect.h}
              rx="10" fill="black"
              style={{ transition: 'all .3s cubic-bezier(.4,0,.2,1)' }}
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,.5)" mask="url(#tm)" />
      </svg>

      <div className="fixed inset-0 z-[9998]" onClick={done} />

      <div
        className="pointer-events-none fixed z-[9999] rounded-[10px] transition-all duration-300"
        style={{ top: rect.top, left: rect.left, width: rect.w, height: rect.h, outline: '1px solid hsl(var(--primary) / 0.25)' }}
      />

      <div
        className="fixed z-[10000] w-[300px]"
        style={{
          top: tip.top,
          left: tip.left,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(6px)',
          transition: 'opacity .2s ease, transform .2s ease',
        }}
      >
        <div className="rounded-lg border border-border/60 bg-popover p-4 shadow-lg">
          <div className="flex items-start justify-between">
            <p className="text-sm font-medium text-popover-foreground">{cur?.title}</p>
            <button onClick={done} className="-mr-1 -mt-1 rounded p-1 text-muted-foreground/60 transition-colors hover:text-popover-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{cur?.desc}</p>

          <div className="mt-4 flex items-center gap-1">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                style={{ backgroundColor: i <= step ? 'hsl(var(--primary) / 0.7)' : 'hsl(var(--muted))' }}
              />
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={done}
              className="text-[12px] text-muted-foreground/70 transition-colors hover:text-popover-foreground"
            >
              Skip
            </button>
            <div className="flex items-center gap-1.5">
              {step > 0 && (
                <button
                  onClick={() => setStep(p => p - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-popover-foreground"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={() => step < STEPS.length - 1 ? setStep(p => p + 1) : done()}
                className="flex h-7 items-center gap-1 rounded-md bg-primary/90 px-3 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary"
              >
                {step === STEPS.length - 1 ? 'Done' : 'Next'}
                {step < STEPS.length - 1 && <ArrowRight className="h-3 w-3" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )

  if (prompt) return (
    <div
      className="fixed bottom-5 right-5 z-[100]"
      style={{ animation: 'tourIn .4s cubic-bezier(.16,1,.3,1)' }}
    >
      <style>{`@keyframes tourIn{from{opacity:0;transform:translateY(12px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
      <div className="w-[300px] rounded-xl border border-border bg-popover shadow-xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Rocket className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-popover-foreground">Welcome to your CRM</p>
            <p className="text-[11px] text-muted-foreground">Take a quick tour of the platform</p>
          </div>
        </div>
        <div className="flex gap-2 px-4 py-3">
          <button
            onClick={start}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-[12px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Start tour
            <ArrowRight className="h-3 w-3" />
          </button>
          <button
            onClick={skip}
            className="rounded-lg border border-border px-4 py-2 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-popover-foreground"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  )

  return null
}

export function resetTour() {
  localStorage.removeItem(TOUR_KEY)
}
