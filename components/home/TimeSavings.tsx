import { Clock, Brain, Target, Search, LayoutDashboard } from 'lucide-react'

const savings = [
  {
    icon: Clock,
    value: '2 hrs/day',
    label: 'Saved per employee',
    desc: 'No more switching between 6 apps',
  },
  {
    icon: Brain,
    value: '30 min/day',
    label: 'Saved per sales rep',
    desc: 'AI writes follow-up emails in seconds',
  },
  {
    icon: Target,
    value: '15 leads/week',
    label: 'Recovered',
    desc: 'That would have been forgotten',
  },
  {
    icon: LayoutDashboard,
    value: '4 hrs/week',
    label: 'On reports',
    desc: 'Unified analytics — no manual building',
  },
  {
    icon: Search,
    value: 'Instant',
    label: 'Cross-dept search',
    desc: 'One login = access to any data',
  },
]

export default function TimeSavings() {
  return (
    <section className="relative overflow-hidden bg-neutral-900 py-20 lg:py-24">
      {/* dot grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px]" />

      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-primary/60">
            Beyond cost savings
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Time your team gets back — every week
          </h2>
          <p className="mt-3 text-base text-neutral-400">
            Consolidation isn&apos;t just about money. It&apos;s about the hours your team
            wastes switching, re-entering data, and building reports manually.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {savings.map(s => (
            <div key={s.label} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-5 text-center">
              <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10">
                <s.icon className="h-5 w-5 text-primary/60" />
              </div>
              <div className="font-mono text-2xl font-bold text-white">{s.value}</div>
              <div className="mt-0.5 text-sm font-medium text-neutral-300">{s.label}</div>
              <div className="mt-1 text-[11px] text-neutral-500">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
