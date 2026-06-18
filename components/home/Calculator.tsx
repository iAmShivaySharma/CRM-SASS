'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'

const tools = [
  { name: 'CRM', alt: 'Salesforce / HubSpot', cost: 175 },
  { name: 'Projects', alt: 'Monday / Asana', cost: 65 },
  { name: 'HR', alt: 'BambooHR', cost: 125 },
  { name: 'Chat', alt: 'Slack', perSeat: 10 },
  { name: 'Email', alt: 'Mailchimp', cost: 160 },
  { name: 'Automation', alt: 'Zapier', cost: 60 },
]

const presets = [
  { label: 'Agency (10)', size: 10 },
  { label: 'Real Estate (5)', size: 5 },
  { label: 'Startup (15)', size: 15 },
  { label: 'SMB (50)', size: 50 },
]

function planFor(n: number) {
  if (n <= 2) return { name: 'Free', price: 0 }
  if (n <= 5) return { name: 'Starter', price: 12 }
  if (n <= 15) return { name: 'Pro', price: 29 }
  return { name: 'Enterprise', price: 99 }
}

export default function Calculator() {
  const [size, setSize] = useState(10)

  const oldCost = tools.reduce((s, t) => s + (t.perSeat ? t.perSeat * size : (t.cost ?? 0)), 0)
  const plan = planFor(size)
  const saved = Math.round((oldCost - plan.price) * 12)

  return (
    <section id="calculator" className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <div className="mx-auto mb-12 max-w-xl text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-600">
          Savings calculator
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          How much are you overpaying?
        </h2>
        <p className="mt-3 text-base text-neutral-500">
          Pick your business type or drag the slider. See the real cost difference.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-neutral-200/60 bg-white shadow-lg shadow-neutral-100/60">
        <div className="grid lg:grid-cols-2">
          {/* left */}
          <div className="border-b border-neutral-100 p-7 lg:border-b-0 lg:border-r">
            {/* presets */}
            <div className="mb-6 flex flex-wrap gap-2">
              {presets.map(p => (
                <button
                  key={p.label}
                  onClick={() => setSize(p.size)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                    size === p.size
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-neutral-200 text-neutral-500 hover:bg-neutral-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* slider */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-500">Team size</span>
              <span className="font-mono text-lg font-semibold text-neutral-900">{size}</span>
            </div>
            <Slider value={[size]} onValueChange={v => setSize(v[0])} min={1} max={50} step={1} className="mt-3" />
            <div className="mt-1 flex justify-between text-[11px] text-neutral-400">
              <span>1</span><span>25</span><span>50</span>
            </div>

            {/* tool breakdown */}
            <div className="mt-7 space-y-2">
              {tools.map(t => {
                const c = t.perSeat ? t.perSeat * size : (t.cost ?? 0)
                return (
                  <div key={t.name} className="flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-2.5">
                    <div>
                      <span className="text-sm font-medium text-neutral-700">{t.name}</span>
                      <span className="ml-2 text-xs text-neutral-400">({t.alt})</span>
                    </div>
                    <span className="font-mono text-sm font-semibold text-red-500 line-through decoration-red-300">${c}</span>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl bg-red-50 px-5 py-3">
              <span className="text-sm font-semibold text-red-700">Total today</span>
              <span className="font-mono text-xl font-bold text-red-600">${oldCost}/mo</span>
            </div>
          </div>

          {/* right */}
          <div className="flex flex-col justify-between bg-gradient-to-br from-blue-50/40 to-white p-7">
            <div>
              <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-600">
                With CRM Pro
              </p>
              <h3 className="text-2xl font-bold text-neutral-900">
                All of the above — included.
              </h3>

              <div className="mt-6 space-y-2.5">
                {tools.map(t => (
                  <div key={t.name} className="flex items-center gap-2.5">
                    <div className="grid h-5 w-5 place-items-center rounded-full bg-emerald-100">
                      <Check className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-neutral-600">{t.name} — <span className="font-medium text-emerald-600">included</span></span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-xl bg-emerald-50 px-5 py-3">
                <div>
                  <span className="text-sm font-semibold text-emerald-700">CRM Pro</span>
                  <span className="ml-1.5 text-xs text-emerald-600">({plan.name})</span>
                </div>
                <span className="font-mono text-xl font-bold text-emerald-700">
                  {plan.price === 0 ? 'Free' : `$${plan.price}/mo`}
                </span>
              </div>
            </div>

            {/* savings banner */}
            <div className="mt-8 rounded-xl bg-blue-600 p-5 text-center text-white">
              <div className="text-sm font-medium text-blue-200">You save</div>
              <div className="font-mono text-3xl font-bold">${saved.toLocaleString()}/yr</div>
              <Button asChild size="lg" className="mt-4 h-11 w-full rounded-lg bg-white font-semibold text-blue-600 hover:bg-blue-50">
                <Link href="/register">
                  Claim your savings <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
