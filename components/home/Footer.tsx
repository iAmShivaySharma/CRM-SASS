import Link from 'next/link'
import { Zap } from 'lucide-react'
import { FOOTER_LINKS, COMPARISON_LINKS } from './constants'

export default function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50">
      <div className="mx-auto max-w-6xl px-5 py-14">
        <div className="grid gap-10 lg:grid-cols-6">
          {/* brand */}
          <div className="lg:col-span-2">
            <Link href="/home" className="mb-4 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-600 text-white"><Zap className="h-4 w-4" /></div>
              <span className="text-[17px] font-semibold text-neutral-900">CRM Pro</span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-neutral-500">
              All-in-one AI CRM for sales, projects, HR &amp; automation.
              Per workspace pricing — not per seat.
            </p>
            <div className="mt-5 flex flex-wrap gap-1.5">
              {COMPARISON_LINKS.map(c => (
                <a key={c} href="#" className="rounded-md bg-white px-2 py-1 text-[10px] font-medium text-neutral-500 border border-neutral-200/50 hover:text-neutral-700 transition-colors">{c}</a>
              ))}
            </div>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{title}</h4>
              <ul className="space-y-2">
                {links.map(l => (
                  <li key={l.label}><a href={l.href} className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-neutral-200/50 pt-6 sm:flex-row">
          <p className="text-xs text-neutral-400">&copy; {new Date().getFullYear()} CRM Pro. All rights reserved.</p>
          <div className="flex gap-5">
            {['Privacy', 'Terms', 'Security'].map(l => (
              <a key={l} href="#" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
