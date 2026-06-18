import {
  Users, GitBranch, Mail, FolderKanban, Clock,
  MessageCircle, CalendarCheck, Plane, QrCode,
  Shield, BarChart3, Webhook, BrainCircuit, FileText,
} from 'lucide-react'

/*
 * Bento grid — asymmetric cards like Apple / Linear.
 * 2 large + 4 medium + 4 small = 10 features shown visually.
 */
export default function BentoFeatures() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      {/* heading */}
      <div className="mx-auto mb-14 max-w-xl text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-blue-600">
          Everything in one place
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
          Six tools. One login. One bill.
        </h2>
        <p className="mt-3 text-base text-neutral-500">
          CRM, project management, HR, chat, email, and AI automation —
          consolidated so your team can stop switching tabs.
        </p>
      </div>

      {/* bento grid */}
      <div className="grid auto-rows-[180px] grid-cols-4 gap-4 lg:auto-rows-[200px]">
        {/* ── LARGE: Sales Pipeline ── */}
        <div className="col-span-4 flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/60 bg-gradient-to-br from-blue-50 to-white p-6 sm:col-span-2 lg:row-span-2">
          <div>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
              <GitBranch className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">Sales Pipeline</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Drag leads through custom stages. AI-scored, auto-assigned, color-coded.
              10+ sources: LinkedIn, Ads, Referrals, Website, Events.
            </p>
          </div>
          {/* mini pipeline visual */}
          <div className="mt-4 space-y-1.5">
            {[
              { n: 'New', w: '100%', c: 'bg-blue-400' },
              { n: 'Qualified', w: '62%', c: 'bg-indigo-400' },
              { n: 'Proposal', w: '34%', c: 'bg-violet-400' },
              { n: 'Won', w: '18%', c: 'bg-emerald-400' },
            ].map(p => (
              <div key={p.n} className="flex items-center gap-2">
                <span className="w-14 text-[11px] font-medium text-neutral-400">{p.n}</span>
                <div className="h-2 flex-1 rounded-full bg-white/60">
                  <div className={`h-2 rounded-full ${p.c}`} style={{ width: p.w }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LARGE: AI Workflows ── */}
        <div className="col-span-4 flex flex-col justify-between overflow-hidden rounded-2xl border border-neutral-200/60 bg-gradient-to-br from-violet-50 to-white p-6 sm:col-span-2 lg:row-span-2">
          <div>
            <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">AI Workflow Engine</h3>
            <p className="mt-1 text-sm text-neutral-500">
              Drag-and-drop visual builder. Enrich leads, draft emails, analyze sentiment,
              score deals — all running on autopilot.
            </p>
          </div>
          {/* mini workflow visual */}
          <div className="mt-4 flex items-center gap-2">
            {['New Lead', 'AI Enrich', 'Score 92', 'Auto Email'].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className="rounded-lg border border-violet-200/60 bg-white px-3 py-1.5 text-[11px] font-medium text-violet-700 shadow-sm">
                  {s}
                </div>
                {i < 3 && <div className="h-px w-4 bg-violet-200" />}
              </div>
            ))}
          </div>
        </div>

        {/* ── MEDIUM cards ── */}
        <Card icon={FolderKanban} title="Projects & Tasks" desc="Kanban boards, time tracking, subtasks, due dates, and file attachments per project." color="orange" />
        <Card icon={MessageCircle} title="Team Chat" desc="Real-time rooms and DMs. File sharing, reactions, typing indicators — replace Slack." color="green" />
        <Card icon={Mail} title="Email Inbox" desc="Connect Gmail & Outlook. Send, track, template, and schedule — without leaving the CRM." color="sky" />
        <Card icon={CalendarCheck} title="Attendance & Shifts" desc="Clock in/out with GPS. Manage Office, Remote, Hybrid, and Field work types." color="amber" />

        {/* ── SMALL strip ── */}
        <SmallCard icon={Plane} label="Leave Management" />
        <SmallCard icon={QrCode} label="Asset Tracking" />
        <SmallCard icon={Shield} label="Roles & Permissions" />
        <SmallCard icon={Webhook} label="Webhooks & API" />
      </div>
    </section>
  )
}

/* ── Reusable card components ── */

const colorMap: Record<string, { bg: string; icon: string; border: string }> = {
  orange: { bg: 'bg-orange-50', icon: 'text-orange-600 bg-orange-100', border: 'border-orange-100' },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600 bg-emerald-100', border: 'border-emerald-100' },
  sky:    { bg: 'bg-sky-50', icon: 'text-sky-600 bg-sky-100', border: 'border-sky-100' },
  amber:  { bg: 'bg-amber-50', icon: 'text-amber-600 bg-amber-100', border: 'border-amber-100' },
}

function Card({ icon: Icon, title, desc, color }: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  desc: string
  color: string
}) {
  const c = colorMap[color]
  return (
    <div className={`col-span-2 sm:col-span-1 flex flex-col rounded-2xl border border-neutral-200/60 ${c.bg} p-5`}>
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.icon}`}>
        <Icon className="h-4 w-4" />
      </div>
      <h4 className="text-sm font-semibold text-neutral-900">{title}</h4>
      <p className="mt-1 text-[12px] leading-relaxed text-neutral-500">{desc}</p>
    </div>
  )
}

function SmallCard({ icon: Icon, label }: {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-2xl border border-neutral-200/60 bg-neutral-50/50 px-5">
      <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-neutral-500 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm font-medium text-neutral-700">{label}</span>
    </div>
  )
}
