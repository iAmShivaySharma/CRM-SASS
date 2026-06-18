import { UserPlus, MousePointerClick, Sparkles, TrendingUp } from 'lucide-react'

const steps = [
  {
    num: '01',
    icon: UserPlus,
    title: 'Sign up in 2 minutes',
    desc: 'Create your workspace. Invite your team. No credit card, no calls with sales.',
  },
  {
    num: '02',
    icon: MousePointerClick,
    title: 'Import or capture leads',
    desc: 'CSV import from any CRM, or capture from LinkedIn, Ads, Forms, and 10+ sources via webhooks.',
  },
  {
    num: '03',
    icon: Sparkles,
    title: 'Let AI do the work',
    desc: 'AI scores every lead, drafts follow-up emails, analyzes sentiment, and assigns reps automatically.',
  },
  {
    num: '04',
    icon: TrendingUp,
    title: 'Close deals, track everything',
    desc: 'Pipeline, projects, HR, chat, email — all in one tab. Your whole business, finally unified.',
  },
]

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="relative overflow-hidden bg-neutral-50 py-24 lg:py-32">
      {/* faint grid */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-40 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
        <defs>
          <pattern id="hw-grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.6" className="text-neutral-200" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#hw-grid)" />
      </svg>

      <div className="relative z-10 mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-14 max-w-xl text-center">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-600">
            How it works
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Up and running in an afternoon
          </h2>
          <p className="mt-3 text-base text-neutral-500">
            No consultants. No 6-month implementation. No training budget.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.num} className="group relative rounded-2xl border border-neutral-200/60 bg-white p-6 transition-shadow duration-200 hover:shadow-lg hover:shadow-neutral-100/70">
              {/* connecting line */}
              {i < steps.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden h-px w-6 bg-neutral-200 lg:block" />
              )}
              <span className="mb-4 block font-mono text-[13px] font-bold text-blue-600">{s.num}</span>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-600 transition-colors group-hover:bg-blue-50 group-hover:text-blue-600">
                <s.icon className="h-5 w-5" />
              </div>
              <h3 className="text-[15px] font-semibold text-neutral-900">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
