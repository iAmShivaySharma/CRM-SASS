'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'

const plans = [
  {
    name: 'Free',
    mo: 0, yr: 0,
    desc: '2 members · 100 leads',
    rows: [
      [true, 'Basic pipeline'],
      [true, '5 projects · 50 tasks'],
      [true, 'Team chat (30 d)'],
      [false, 'Email integration'],
      [false, 'HR & attendance'],
      [false, 'AI workflows'],
    ],
    cta: 'Start free',
    pop: false,
  },
  {
    name: 'Starter',
    mo: 12, yr: 9,
    desc: '5 members · 1K leads',
    rows: [
      [true, 'Full pipeline + statuses'],
      [true, '15 projects · ∞ tasks'],
      [true, 'Team chat (full)'],
      [true, 'Email (1 account)'],
      [true, 'Basic HR'],
      [false, 'AI workflows'],
    ],
    cta: 'Start trial',
    pop: false,
  },
  {
    name: 'Pro',
    mo: 29, yr: 23,
    desc: '15 members · 10K leads',
    rows: [
      [true, 'AI scoring + pipelines'],
      [true, '∞ projects + time tracking'],
      [true, 'Chat + doc collaboration'],
      [true, 'Email (3 accounts)'],
      [true, 'Full HR suite'],
      [true, 'AI engine (500 credits)'],
    ],
    cta: 'Start trial',
    pop: true,
  },
  {
    name: 'Enterprise',
    mo: 99, yr: 79,
    desc: 'Unlimited everything',
    rows: [
      [true, 'Everything in Pro'],
      [true, '∞ AI credits'],
      [true, 'SSO / SAML'],
      [true, 'API access'],
      [true, 'White-label (+$49)'],
      [true, 'Dedicated manager'],
    ],
    cta: 'Contact sales',
    pop: false,
  },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(true)

  return (
    <section id="pricing" className="relative overflow-hidden bg-neutral-50 py-24 lg:py-32">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-4 max-w-xl text-center">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-600">
            Pricing
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Per workspace, not per seat
          </h2>
          <p className="mt-3 text-base text-neutral-500">
            Your price stays the same whether you have 1 or 15 members.
            Growing your team shouldn&apos;t grow your bill.
          </p>
        </div>

        {/* toggle */}
        <div className="mb-12 flex items-center justify-center gap-3">
          <span className={`text-sm font-medium ${!annual ? 'text-neutral-900' : 'text-neutral-400'}`}>Monthly</span>
          <Switch checked={annual} onCheckedChange={setAnnual} />
          <span className={`text-sm font-medium ${annual ? 'text-neutral-900' : 'text-neutral-400'}`}>Annual</span>
          {annual && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">Save 20%</span>}
        </div>

        {/* cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(p => {
            const price = annual ? p.yr : p.mo
            return (
              <div key={p.name} className={`relative flex flex-col rounded-2xl border bg-white p-6 transition-shadow duration-200 ${
                p.pop ? 'border-blue-200 shadow-xl shadow-blue-100/40 ring-1 ring-blue-100' : 'border-neutral-200/60 hover:shadow-lg hover:shadow-neutral-100/60'
              }`}>
                {p.pop && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-semibold text-white">
                    Most popular
                  </span>
                )}
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">{p.name}</h3>
                  <p className="text-xs text-neutral-400">{p.desc}</p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-mono text-3xl font-bold text-neutral-900">{price === 0 ? 'Free' : `$${price}`}</span>
                    {price > 0 && <span className="text-sm text-neutral-400">/mo</span>}
                  </div>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5">
                  {p.rows.map(([ok, text]) => (
                    <li key={text as string} className="flex items-start gap-2">
                      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" /> : <X className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" />}
                      <span className={`text-[13px] ${ok ? 'text-neutral-600' : 'text-neutral-400'}`}>{text as string}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild className={`mt-6 w-full rounded-lg ${p.pop ? 'bg-blue-600 hover:bg-blue-700' : ''}`} variant={p.pop ? 'default' : 'outline'}>
                  <Link href="/register">{p.cta}</Link>
                </Button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
