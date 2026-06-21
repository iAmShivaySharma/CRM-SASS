'use client'

import { Megaphone, Home, Rocket, GraduationCap, Users, ShoppingBag, ArrowRight } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const industries = [
  {
    id: 'agency',
    icon: Megaphone,
    label: 'Agencies',
    title: 'Digital Marketing Agencies',
    size: '5-50 people',
    pain: 'Paying $500+/mo for HubSpot + Asana + Slack + Harvest. Client data scattered across 6 tools.',
    pitch: 'Manage clients, projects, and your team in one tool for $29/mo',
    savings: '$4,452',
    features: [
      'Pipeline per client — track every deal stage',
      'Kanban boards per project with time tracking',
      'Team chat rooms per client (replace Slack)',
      'AI writes follow-up emails from lead context',
      'Document editor for proposals & SOPs',
      'Attendance tracking for remote + hybrid teams',
    ],
    decision: 'Agency owner or operations manager',
  },
  {
    id: 'realestate',
    icon: Home,
    label: 'Real Estate',
    title: 'Real Estate Teams & Brokerages',
    size: '3-30 agents',
    pain: 'Leads fall through cracks. Agents forget to follow up. No unified pipeline view.',
    pitch: 'Never lose a lead again — AI follows up automatically',
    savings: '$3,252',
    features: [
      'Leads auto-scored by AI — focus on hot buyers',
      'Auto follow-up sequences for each lead',
      'Pipeline: New → Showing → Offer → Closed',
      'Email integration — track opens and replies',
      'Custom fields: Property type, budget, location',
      'Mobile-ready for field agents',
    ],
    decision: 'Broker or team lead',
  },
  {
    id: 'startup',
    icon: Rocket,
    label: 'Startups',
    title: 'SaaS & Tech Startups',
    size: '5-25 people',
    pain: 'Stitching together 5+ tools with no unified view. Burning cash on subscriptions.',
    pitch: 'One platform for your entire startup — sales, projects, HR, chat',
    savings: '$6,012',
    features: [
      'Sales CRM + project management in one view',
      'AI lead scoring learns from your patterns',
      'Kanban boards with time tracking per task',
      'Full HR: attendance, leaves, assets as you scale',
      'Webhook integrations for your tech stack',
      'REST API + self-hostable option',
    ],
    decision: 'Founder or Head of Operations',
  },
  {
    id: 'coaching',
    icon: GraduationCap,
    label: 'Coaching',
    title: 'Coaching & Consulting',
    size: '1-10 people',
    pain: 'Using spreadsheets and WhatsApp to manage clients. Looks unprofessional.',
    pitch: 'Professional client management that makes you look enterprise-grade',
    savings: '$2,400',
    features: [
      'Client pipeline from inquiry to onboarding',
      'Project boards per client engagement',
      'Document editor for session notes',
      'Email templates for onboarding sequences',
      'AI drafts personalized outreach',
      'Simple enough for non-technical teams',
    ],
    decision: 'Solo founder or small team lead',
  },
  {
    id: 'smb',
    icon: Users,
    label: 'SMBs',
    title: 'SMBs with HR Needs',
    size: '20-200 employees',
    pain: 'Separate HR + CRM + project tools = chaos and $1,000+/mo spend.',
    pitch: 'Your entire business operations in one platform',
    savings: '$10,812',
    features: [
      'Full HR: clock-in with GPS, shifts, leave policies',
      'Asset management with QR codes & maintenance',
      'CRM pipeline for sales team',
      'Project boards for delivery team',
      'Custom roles with granular permissions',
      'Analytics across all departments',
    ],
    decision: 'HR Manager or COO',
  },
]

export default function WhoItsFor() {
  return (
    <section id="who" className="mx-auto max-w-6xl px-5 py-24 lg:py-32">
      <div className="mx-auto mb-12 max-w-xl text-center">
        <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-primary">
          Built for your business
        </p>
        <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          See exactly how CRM Pro solves <em>your</em> problem
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Different businesses, same frustration — too many tools, too much cost.
          Here&apos;s what changes when you switch.
        </p>
      </div>

      <Tabs defaultValue="agency">
        <TabsList className="mx-auto flex h-auto w-full max-w-2xl flex-wrap justify-center gap-1.5 bg-transparent p-0">
          {industries.map(ind => (
            <TabsTrigger
              key={ind.id}
              value={ind.id}
              className="flex items-center gap-1.5 rounded-full border border-transparent px-4 py-2 text-[13px] font-medium text-muted-foreground data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary"
            >
              <ind.icon className="h-3.5 w-3.5" />
              {ind.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {industries.map(ind => (
          <TabsContent key={ind.id} value={ind.id} className="mt-8">
            <div className="overflow-hidden rounded-2xl border border-border bg-background">
              <div className="grid lg:grid-cols-5">
                {/* left — context */}
                <div className="border-b border-border p-6 lg:col-span-2 lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-2 mb-1">
                    <ind.icon className="h-4 w-4 text-primary" />
                    <h3 className="text-lg font-bold text-foreground">{ind.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground/70 mb-5">{ind.size}</p>

                  <div className="mb-3 rounded-lg bg-red-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-red-600 mb-1">The pain</p>
                    <p className="text-sm text-red-700">{ind.pain}</p>
                  </div>

                  <div className="mb-3 rounded-lg bg-primary/10 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary mb-1">Your pitch</p>
                    <p className="text-sm font-medium text-primary">&ldquo;{ind.pitch}&rdquo;</p>
                  </div>

                  <div className="rounded-lg bg-emerald-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">Annual savings</p>
                    <p className="font-mono text-2xl font-bold text-emerald-700">{ind.savings}/yr</p>
                  </div>

                  <p className="mt-3 text-[11px] text-muted-foreground/70">
                    <strong>Decision maker:</strong> {ind.decision}
                  </p>
                </div>

                {/* right — features */}
                <div className="p-6 lg:col-span-3">
                  <p className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    What you get
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {ind.features.map(f => (
                      <div key={f} className="flex items-start gap-2.5 rounded-lg bg-muted p-3">
                        <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                        <span className="text-[13px] text-muted-foreground">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  )
}
