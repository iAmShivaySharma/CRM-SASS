import Link from 'next/link'
import { ArrowRight, Play, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

const replaced = [
  { name: 'Salesforce', cost: '$50-300' },
  { name: 'Monday.com', cost: '$30-100' },
  { name: 'BambooHR', cost: '$50-200' },
  { name: 'Slack', cost: '$7-12/user' },
  { name: 'Mailchimp', cost: '$20-300' },
  { name: 'Zapier', cost: '$20-100' },
]

export default function Hero() {
  return (
    <section className="relative isolate overflow-hidden pb-10 pt-28 lg:pb-14 lg:pt-36">
      {/* bg */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_44%_at_50%_0%,hsl(220_80%_96%),transparent)]" />

      <div className="mx-auto max-w-6xl px-5 text-center">
        {/* social proof pill */}
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-1.5 text-[13px] text-muted-foreground shadow-sm">
          <div className="flex -space-x-1">
            {[
              'bg-primary',
              'bg-emerald-500',
              'bg-violet-500',
              'bg-amber-500',
            ].map((c, i) => (
              <div
                key={i}
                className={`h-5 w-5 rounded-full border-2 border-background ${c}`}
              />
            ))}
          </div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span>
            Trusted by <strong className="text-foreground">10,000+</strong>{' '}
            teams
          </span>
        </div>

        {/* headline */}
        <h1 className="mx-auto max-w-[720px] text-[2.5rem] font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-[3.5rem]">
          Stop Paying{' '}
          <span className="relative inline-block">
            <span className="relative z-10 text-red-600">$1,200/mo</span>
            <span className="absolute inset-x-0 bottom-0 top-[55%] -z-0 rounded bg-red-50" />
          </span>{' '}
          for 6 Tools.
          <br className="hidden sm:block" />
          <span className="text-primary">Get One for $29.</span>
        </h1>

        {/* sub — uses the strategy's exact value prop */}
        <p className="mx-auto mt-6 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
          One platform. One login. One bill. CRM, projects, HR, chat, email
          &amp; AI automation — everything your business needs to sell, manage,
          and grow.{' '}
          <strong className="font-semibold text-foreground/80">
            Per workspace, not per seat.
          </strong>
        </p>

        {/* ctas */}
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button
            asChild
            size="lg"
            className="h-12 rounded-lg bg-primary px-7 text-[15px] font-semibold shadow-lg shadow-primary/20 hover:bg-primary/90"
          >
            <Link href="/register">
              Start free — no credit card
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-12 rounded-lg border-border px-7 text-[15px] font-semibold hover:bg-muted"
          >
            <a href="#calculator">
              <Play className="mr-2 h-4 w-4 fill-muted-foreground text-muted-foreground" />
              Calculate your savings
            </a>
          </Button>
        </div>

        {/* replaced tools — visual cost teardown */}
        <div className="mx-auto mt-16 max-w-2xl">
          <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/70">
            What your team is paying today
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {replaced.map(t => (
              <div
                key={t.name}
                className="rounded-xl border border-border bg-background p-3 text-center transition-shadow hover:shadow-md"
              >
                <span className="block text-[12px] font-medium text-muted-foreground line-through decoration-red-300/70">
                  {t.name}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] font-semibold text-red-500 line-through decoration-red-300/70">
                  {t.cost}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-center gap-2">
            <div className="h-px flex-1 bg-muted" />
            <span className="rounded-full bg-emerald-50 px-4 py-1 text-[13px] font-bold text-emerald-700">
              All replaced → $29/mo
            </span>
            <div className="h-px flex-1 bg-muted" />
          </div>
        </div>
      </div>
    </section>
  )
}
