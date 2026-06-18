import { Star } from 'lucide-react'

const items = [
  {
    quote: 'We were paying $1,200/month across Salesforce, Monday, Slack, and BambooHR. CRM Pro replaced all four. The AI workflows alone save our SDR team 15 hours a week.',
    name: 'Sarah C.',
    title: 'VP Sales · TechFlow',
    tag: '$910/mo saved',
  },
  {
    quote: 'The built-in Kanban + time tracking changed how we run client projects. Our PMs used to juggle three tools. Now tasks, docs, chat, and time logs live in one place.',
    name: 'Marcus R.',
    title: 'Founder · ScaleUp Studio',
    tag: '40% faster delivery',
  },
  {
    quote: 'We went from tracking leads in Google Sheets to closing 3× faster. Pipeline visibility, AI scoring, and Gmail integration made our 8-person team perform like 20.',
    name: 'Priya S.',
    title: 'CEO · GrowthLab Digital',
    tag: '3× close rate',
  },
  {
    quote: 'Finally an HR module inside our CRM. Attendance with GPS, leave management, asset inventory — we cancelled our separate HR tool within a week.',
    name: 'Rajesh G.',
    title: 'Ops Head · BuildRight',
    tag: 'Replaced 2 tools',
  },
]

export default function Testimonials() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <div className="mx-auto mb-14 max-w-xl text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-600">
          Loved by teams
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Don&apos;t take our word for it
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {items.map(t => (
          <div key={t.name} className="flex flex-col justify-between rounded-2xl border border-neutral-200/60 bg-white p-6 transition-shadow duration-200 hover:shadow-lg hover:shadow-neutral-100/60">
            {/* stars */}
            <div>
              <div className="mb-3 flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-[14px] leading-relaxed text-neutral-600">&ldquo;{t.quote}&rdquo;</p>
            </div>
            {/* author */}
            <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
              <div className="flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {t.name[0]}
                </div>
                <div>
                  <div className="text-sm font-semibold text-neutral-900">{t.name}</div>
                  <div className="text-xs text-neutral-400">{t.title}</div>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">{t.tag}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
