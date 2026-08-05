'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  GitBranch,
  Mail,
  MessageCircle,
  FolderKanban,
  BrainCircuit,
  Check,
  Bell,
  Search,
  Plus,
  Star,
  TrendingUp,
  UserPlus,
  Send,
  Clock,
  BarChart3,
  Settings,
  LayoutDashboard,
  Briefcase,
  Sparkles,
  DollarSign,
  Target,
  Calendar,
  CheckCircle2,
  Tag,
  Webhook,
  FileText,
  Contact,
  Circle,
  ChevronLeft,
  Globe,
  Laptop,
} from 'lucide-react'

const features = [
  {
    id: 'crm',
    label: 'Sales CRM',
    icon: GitBranch,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    activeBg: 'bg-blue-500',
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderKanban,
    color: 'text-violet-500',
    bg: 'bg-violet-500/10',
    activeBg: 'bg-violet-500',
  },
  {
    id: 'hr',
    label: 'HR Suite',
    icon: Users,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    activeBg: 'bg-emerald-500',
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    color: 'text-orange-500',
    bg: 'bg-orange-500/10',
    activeBg: 'bg-orange-500',
  },
  {
    id: 'chat',
    label: 'Team Chat',
    icon: MessageCircle,
    color: 'text-pink-500',
    bg: 'bg-pink-500/10',
    activeBg: 'bg-pink-500',
  },
  {
    id: 'ai',
    label: 'AI Engine',
    icon: BrainCircuit,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    activeBg: 'bg-amber-500',
  },
]

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Dashboard', id: 'dashboard' },
  { icon: TrendingUp, label: 'Sales', id: 'sales-section', section: true },
  { icon: Users, label: 'Leads', id: 'leads', parent: 'sales' },
  { icon: Contact, label: 'Contacts', id: 'contacts', parent: 'sales' },
  { icon: Circle, label: 'Lead Statuses', id: 'statuses', parent: 'sales' },
  { icon: Tag, label: 'Tags', id: 'tags', parent: 'sales' },
  { icon: Webhook, label: 'Webhooks', id: 'webhooks', parent: 'sales' },
  { icon: UserPlus, label: 'HR', id: 'hr-section', section: true },
  { icon: Clock, label: 'Attendance', id: 'attendance', parent: 'hr' },
  { icon: Users, label: 'Employees', id: 'employees', parent: 'hr' },
  { icon: Calendar, label: 'Leaves', id: 'leaves', parent: 'hr' },
  { icon: Laptop, label: 'Assets', id: 'assets', parent: 'hr' },
  { icon: Settings, label: 'Engines', id: 'engines' },
  { icon: MessageCircle, label: 'Chat', id: 'chat' },
  { icon: Mail, label: 'Email', id: 'email' },
  {
    icon: FolderKanban,
    label: 'Projects',
    id: 'projects-section',
    section: true,
  },
  { icon: FolderKanban, label: 'Projects', id: 'projects', parent: 'projects' },
  { icon: CheckCircle2, label: 'Tasks', id: 'tasks', parent: 'projects' },
  { icon: FileText, label: 'Documents', id: 'docs', parent: 'projects' },
]

export default function AnimatedDemo() {
  const [activeFeature, setActiveFeature] = useState(0)
  const [progress, setProgress] = useState(0)
  const [animStep, setAnimStep] = useState(0)
  const [typedText, setTypedText] = useState('')

  const cycleFeature = useCallback(() => {
    setActiveFeature(prev => (prev + 1) % features.length)
    setProgress(0)
    setAnimStep(0)
    setTypedText('')
  }, [])

  useEffect(() => {
    const duration = 5000
    const interval = 50
    const timer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          cycleFeature()
          return 0
        }
        return prev + 100 / (duration / interval)
      })
    }, interval)
    return () => clearInterval(timer)
  }, [cycleFeature])

  useEffect(() => {
    setAnimStep(0)
    const timers = [
      setTimeout(() => setAnimStep(1), 300),
      setTimeout(() => setAnimStep(2), 700),
      setTimeout(() => setAnimStep(3), 1100),
      setTimeout(() => setAnimStep(4), 1500),
      setTimeout(() => setAnimStep(5), 2000),
    ]
    return () => timers.forEach(clearTimeout)
  }, [activeFeature])

  useEffect(() => {
    if (features[activeFeature].id !== 'ai') return
    const text =
      'Generating image... Applying brand colors... Adding caption... Optimizing for Instagram... Post ready! Scheduling for 10:30 AM...'
    let i = 0
    const interval = setInterval(() => {
      setTypedText(text.slice(0, i + 1))
      i++
      if (i >= text.length) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [activeFeature])

  const current = features[activeFeature]

  const getActiveSidebarId = () => {
    switch (current.id) {
      case 'crm':
        return 'leads'
      case 'projects':
        return 'projects'
      case 'hr':
        return 'attendance'
      case 'email':
        return 'email'
      case 'chat':
        return 'chat'
      case 'ai':
        return 'engines'
      default:
        return 'dashboard'
    }
  }

  const statsForFeature = () => {
    switch (current.id) {
      case 'crm':
        return [
          {
            label: 'Total Leads',
            value: '2,847',
            change: '+12.5% this month',
            icon: Users,
            up: true,
          },
          {
            label: 'Conversion Rate',
            value: '24.8%',
            change: '+3.2% vs last',
            icon: Target,
            up: true,
          },
          {
            label: 'Pipeline Value',
            value: '$184K',
            change: '+18.4% growth',
            icon: DollarSign,
            up: true,
          },
          {
            label: 'Active Deals',
            value: '142',
            change: '8 closing this week',
            icon: TrendingUp,
            up: true,
          },
        ]
      case 'projects':
        return [
          {
            label: 'Active Projects',
            value: '12',
            change: '3 due this sprint',
            icon: FolderKanban,
            up: true,
          },
          {
            label: 'Tasks Completed',
            value: '89',
            change: 'this week',
            icon: CheckCircle2,
            up: true,
          },
          {
            label: 'In Progress',
            value: '34',
            change: '6 in review',
            icon: Clock,
            up: false,
          },
          {
            label: 'Team Velocity',
            value: '92%',
            change: '+5% vs last sprint',
            icon: TrendingUp,
            up: true,
          },
        ]
      case 'hr':
        return [
          {
            label: 'Total Employees',
            value: '48',
            change: '3 new this month',
            icon: Users,
            up: true,
          },
          {
            label: 'Present Today',
            value: '44',
            change: '92% attendance',
            icon: CheckCircle2,
            up: true,
          },
          {
            label: 'On Leave',
            value: '4',
            change: '2 planned, 2 sick',
            icon: Calendar,
            up: false,
          },
          {
            label: 'Assets Allocated',
            value: '86',
            change: '3 pending return',
            icon: Laptop,
            up: false,
          },
        ]
      case 'email':
        return [
          {
            label: 'Inbox',
            value: '23',
            change: '5 unread emails',
            icon: Mail,
            up: false,
          },
          {
            label: 'Sent Today',
            value: '18',
            change: '4 via AI writer',
            icon: Send,
            up: true,
          },
          {
            label: 'Open Rate',
            value: '68%',
            change: '+12% with AI subjects',
            icon: BarChart3,
            up: true,
          },
          {
            label: 'Linked Leads',
            value: '42',
            change: 'auto-matched',
            icon: Contact,
            up: true,
          },
        ]
      case 'chat':
        return [
          {
            label: 'Chat Rooms',
            value: '8',
            change: '3 active now',
            icon: MessageCircle,
            up: true,
          },
          {
            label: 'Messages Today',
            value: '142',
            change: 'across all rooms',
            icon: Send,
            up: true,
          },
          {
            label: 'Files Shared',
            value: '24',
            change: 'this week',
            icon: FileText,
            up: true,
          },
          {
            label: 'Team Online',
            value: '12',
            change: 'of 16 members',
            icon: Users,
            up: true,
          },
        ]
      case 'ai':
        return [
          {
            label: 'Workflows',
            value: '24',
            change: '6 categories available',
            icon: BrainCircuit,
            up: true,
          },
          {
            label: 'Executions',
            value: '1,847',
            change: '312 this week',
            icon: Sparkles,
            up: true,
          },
          {
            label: 'Avg Cost',
            value: '$0.02',
            change: 'per execution',
            icon: DollarSign,
            up: true,
          },
          {
            label: 'Time Saved',
            value: '128h',
            change: 'this month',
            icon: Clock,
            up: true,
          },
        ]
      default:
        return []
    }
  }

  const renderMainContent = () => {
    switch (current.id) {
      case 'crm':
        return (
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">
                Pipeline — Custom Stages
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[9px] text-muted-foreground">
                  10+ lead sources
                </span>
                <Globe className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
            {[
              {
                stage: 'New Leads',
                count: 24,
                deals: '$120K',
                w: '100%',
                c: 'bg-blue-500',
                sources: 'LinkedIn, Ads, Webhooks',
              },
              {
                stage: 'Qualified',
                count: 18,
                deals: '$96K',
                w: '72%',
                c: 'bg-indigo-500',
                sources: 'AI scored 80+',
              },
              {
                stage: 'Proposal Sent',
                count: 8,
                deals: '$64K',
                w: '38%',
                c: 'bg-violet-500',
                sources: 'AI follow-up active',
              },
              {
                stage: 'Won',
                count: 5,
                deals: '$48K',
                w: '20%',
                c: 'bg-emerald-500',
                sources: 'Auto-converted to contacts',
              },
            ].map((p, i) => (
              <div
                key={p.stage}
                className={`transition-all duration-500 ${animStep > i ? 'translate-x-0 opacity-100' : 'translate-x-6 opacity-0'}`}
              >
                <div className="mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${p.c}`} />
                    <span className="text-[10px] font-medium text-foreground">
                      {p.stage}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      ({p.sources})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-muted-foreground">
                      {p.count} leads
                    </span>
                    <span className="font-mono text-[9px] font-semibold text-foreground">
                      {p.deals}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${p.c} transition-all duration-1000`}
                    style={{ width: animStep > i ? p.w : '0%' }}
                  />
                </div>
              </div>
            ))}
            <div
              className={`mt-3 grid grid-cols-2 gap-2 transition-all duration-500 ${animStep >= 5 ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="rounded-lg border border-border bg-background p-2">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> AI
                  Lead Score
                </div>
                <div className="mt-0.5 text-[10px] font-semibold text-foreground">
                  Sarah Chen — 92/100
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background p-2">
                <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                  <Tag className="h-3 w-3" /> Tags & Statuses
                </div>
                <div className="mt-0.5 flex gap-1">
                  <span className="rounded bg-blue-100 px-1 text-[8px] font-medium text-blue-700">
                    Hot
                  </span>
                  <span className="rounded bg-violet-100 px-1 text-[8px] font-medium text-violet-700">
                    Enterprise
                  </span>
                </div>
              </div>
            </div>
          </div>
        )

      case 'projects':
        return (
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">
                Kanban Board — Drag & Drop
              </span>
              <span className="text-[9px] text-muted-foreground">
                Sprint 3 · 12 days left
              </span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {[
                {
                  col: 'Todo',
                  color: 'bg-muted-foreground',
                  tasks: [
                    { t: 'User onboarding flow', p: 'high', a: 'JP' },
                    { t: 'API documentation', p: 'medium', a: 'AR' },
                  ],
                },
                {
                  col: 'In Progress',
                  color: 'bg-blue-500',
                  tasks: [
                    { t: 'Design system v2', p: 'high', a: 'SC' },
                    { t: 'Auth refactor', p: 'medium', a: 'AR' },
                  ],
                },
                {
                  col: 'Review',
                  color: 'bg-amber-500',
                  tasks: [{ t: 'Email templates', p: 'low', a: 'EW' }],
                },
                {
                  col: 'Done',
                  color: 'bg-emerald-500',
                  tasks: [
                    { t: 'Landing page', p: 'high', a: 'SC' },
                    { t: 'CI/CD pipeline', p: 'medium', a: 'AR' },
                    { t: 'Chat integration', p: 'high', a: 'JP' },
                  ],
                },
              ].map((col, ci) => (
                <div
                  key={col.col}
                  className={`transition-all duration-500 ${animStep > ci ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                >
                  <div className="mb-1.5 flex items-center gap-1">
                    <div className={`h-1.5 w-1.5 rounded-full ${col.color}`} />
                    <span className="text-[8px] font-semibold text-muted-foreground">
                      {col.col}
                    </span>
                    <span className="text-[7px] text-muted-foreground">
                      ({col.tasks.length})
                    </span>
                  </div>
                  <div className="space-y-1">
                    {col.tasks.map(task => (
                      <div
                        key={task.t}
                        className="rounded border border-border bg-background p-1.5"
                      >
                        <div className="text-[8px] font-medium text-foreground">
                          {task.t}
                        </div>
                        <div className="mt-1 flex items-center justify-between">
                          <span
                            className={`rounded px-1 text-[7px] font-medium ${
                              task.p === 'high'
                                ? 'bg-red-100 text-red-700'
                                : task.p === 'medium'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {task.p}
                          </span>
                          <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted text-[7px] font-bold text-muted-foreground">
                            {task.a}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`mt-2 flex items-center justify-between rounded-lg border border-border bg-muted/30 p-2 transition-all duration-500 ${animStep >= 5 ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span className="text-[9px] text-foreground">
                  Document collaboration + Time tracking built-in
                </span>
              </div>
            </div>
          </div>
        )

      case 'hr':
        return (
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[11px] font-semibold text-foreground">
                Attendance — Live Tracking
              </span>
              <span className="text-[9px] text-muted-foreground">
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </div>
            {[
              {
                name: 'Sarah Chen',
                role: 'Sales Lead',
                status: 'Present',
                type: 'Office',
                time: '9:02 AM',
                hours: '6h 32m',
              },
              {
                name: 'Alex Rivera',
                role: 'Engineer',
                status: 'Remote',
                type: 'WFH',
                time: '8:45 AM',
                hours: '7h 10m',
              },
              {
                name: 'James Park',
                role: 'Designer',
                status: 'Present',
                type: 'Office',
                time: '9:15 AM',
                hours: '5h 48m',
              },
              {
                name: 'Emma Wilson',
                role: 'Marketing',
                status: 'On Leave',
                type: 'Sick',
                time: '-',
                hours: '-',
              },
            ].map((emp, i) => (
              <div
                key={emp.name}
                className={`flex items-center justify-between rounded-lg border border-border bg-background p-2 transition-all duration-500 ${animStep > i ? 'translate-x-0 opacity-100' : '-translate-x-4 opacity-0'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-[8px] font-bold text-emerald-600">
                    {emp.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')}
                  </div>
                  <div>
                    <div className="text-[10px] font-medium text-foreground">
                      {emp.name}
                    </div>
                    <div className="text-[8px] text-muted-foreground">
                      {emp.role}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[7px] font-semibold ${
                      emp.status === 'Present'
                        ? 'bg-emerald-100 text-emerald-700'
                        : emp.status === 'Remote'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {emp.type}
                  </span>
                  <span className="w-10 text-right font-mono text-[8px] text-muted-foreground">
                    {emp.hours}
                  </span>
                </div>
              </div>
            ))}
            <div
              className={`mt-2 grid grid-cols-3 gap-1.5 transition-all duration-500 ${animStep >= 5 ? 'opacity-100' : 'opacity-0'}`}
            >
              {[
                { label: 'Leave Mgmt', desc: 'Policies & balance' },
                { label: 'Asset Tracking', desc: 'Laptops, phones' },
                { label: 'Shift Mgmt', desc: 'Schedules & rosters' },
              ].map(m => (
                <div
                  key={m.label}
                  className="rounded-lg border border-border bg-background p-1.5 text-center"
                >
                  <div className="text-[9px] font-semibold text-foreground">
                    {m.label}
                  </div>
                  <div className="text-[7px] text-muted-foreground">
                    {m.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )

      case 'email':
        return (
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-foreground">
                  Inbox
                </span>
                <span className="rounded bg-muted px-1.5 text-[8px] text-muted-foreground">
                  Gmail + Outlook
                </span>
              </div>
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-bold text-primary-foreground">
                5 new
              </span>
            </div>
            {[
              {
                from: 'Sarah Chen',
                subject: 'Re: Partnership proposal — final terms agreed',
                time: '10:30 AM',
                unread: true,
                linked: 'Lead: Stripe',
              },
              {
                from: 'Stripe Team',
                subject: 'Contract signed! Welcome aboard',
                time: '9:15 AM',
                unread: true,
                linked: 'Contact: Stripe',
              },
              {
                from: 'Alex Rivera',
                subject: 'Sprint retro notes and next actions',
                time: 'Yesterday',
                unread: false,
                linked: null,
              },
              {
                from: 'LinkedIn Ads',
                subject: 'New lead: David from Shopify',
                time: 'Yesterday',
                unread: false,
                linked: 'Lead: Auto-created',
              },
            ].map((email, i) => (
              <div
                key={email.subject}
                className={`flex items-center gap-2 rounded-lg border p-2 transition-all duration-500 ${
                  animStep > i
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-3 opacity-0'
                } ${email.unread ? 'border-primary/20 bg-primary/5' : 'border-border bg-background'}`}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500/10 text-[8px] font-bold text-orange-600">
                  {email.from
                    .split(' ')
                    .map(n => n[0])
                    .join('')}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[9px] ${email.unread ? 'font-bold text-foreground' : 'text-muted-foreground'}`}
                    >
                      {email.from}
                    </span>
                    <span className="text-[8px] text-muted-foreground">
                      {email.time}
                    </span>
                  </div>
                  <div
                    className={`truncate text-[9px] ${email.unread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}
                  >
                    {email.subject}
                  </div>
                  {email.linked && (
                    <div className="mt-0.5 flex items-center gap-1">
                      <Contact className="h-2.5 w-2.5 text-emerald-500" />
                      <span className="text-[7px] font-medium text-emerald-600">
                        {email.linked}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
            <div
              className={`mt-2 flex items-center gap-2 rounded-lg border border-amber-200/60 bg-amber-50/30 p-2 transition-all duration-500 ${animStep >= 5 ? 'opacity-100' : 'opacity-0'}`}
            >
              <Sparkles className="h-3 w-3 text-amber-600" />
              <span className="text-[9px] text-amber-700">
                AI Email Writer: Draft follow-ups from lead context in seconds
              </span>
            </div>
          </div>
        )

      case 'chat':
        return (
          <div className="flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-semibold text-foreground">
                    # sales-team
                  </span>
                </div>
                <div className="flex -space-x-1">
                  {['SC', 'AR', 'JP'].map(a => (
                    <div
                      key={a}
                      className="flex h-4 w-4 items-center justify-center rounded-full border border-background bg-muted text-[6px] font-bold text-muted-foreground"
                    >
                      {a}
                    </div>
                  ))}
                </div>
              </div>
              <span className="text-[9px] text-muted-foreground">
                Real-time · Socket.io
              </span>
            </div>
            <div className="space-y-2.5">
              {[
                {
                  from: 'Sarah',
                  text: 'Just closed the Stripe deal! $48K ARR — moved to Won in pipeline',
                  time: '2m ago',
                },
                {
                  from: 'Alex',
                  text: 'API v2 deployed. All webhook integrations passing tests',
                  time: '5m ago',
                },
                {
                  from: 'James',
                  text: 'New lead auto-created from LinkedIn campaign webhook',
                  time: '12m ago',
                },
              ].map((msg, i) => (
                <div
                  key={msg.text}
                  className={`flex items-start gap-2 transition-all duration-500 ${animStep > i ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
                >
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-pink-500/10 text-[8px] font-bold text-pink-600">
                    {msg.from[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-semibold text-foreground">
                        {msg.from}
                      </span>
                      <span className="text-[8px] text-muted-foreground">
                        {msg.time}
                      </span>
                    </div>
                    <div className="mt-0.5 rounded-lg rounded-tl-none bg-muted px-2 py-1.5 text-[9px] text-foreground">
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div
              className={`mt-3 flex items-center gap-1.5 rounded-lg border border-border bg-background p-1.5 transition-all duration-500 ${animStep >= 4 ? 'opacity-100' : 'opacity-0'}`}
            >
              <Plus className="h-3 w-3 text-muted-foreground" />
              <div className="flex-1 text-[9px] text-muted-foreground">
                Type a message...
              </div>
              <Send className="h-3 w-3 text-primary" />
            </div>
            <div
              className={`mt-2 flex items-center gap-4 text-[8px] text-muted-foreground transition-all duration-500 ${animStep >= 5 ? 'opacity-100' : 'opacity-0'}`}
            >
              <span>Direct messages</span>
              <span>File sharing</span>
              <span>Reactions</span>
              <span>Threads</span>
            </div>
          </div>
        )

      case 'ai':
        return (
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-foreground">
                  Workflow Catalog
                </span>
                <span className="rounded bg-muted px-1.5 text-[8px] text-muted-foreground">
                  Powered by n8n
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Search className="h-3 w-3 text-muted-foreground" />
                <span className="text-[8px] text-muted-foreground">
                  Browse & run
                </span>
              </div>
            </div>
            <div
              className={`mb-2 flex flex-wrap gap-1 transition-all duration-300 ${animStep >= 1 ? 'opacity-100' : 'opacity-0'}`}
            >
              {[
                'All',
                'Content Creation',
                'Marketing',
                'Sales',
                'Social Media',
                'Data Processing',
              ].map((cat, i) => (
                <span
                  key={cat}
                  className={`rounded-full px-2 py-0.5 text-[8px] font-medium ${i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                >
                  {cat}
                </span>
              ))}
            </div>
            {[
              {
                name: 'Generate Social Media Post',
                cat: 'Content Creation',
                cost: '$0.03',
                time: '~15s',
                runs: '2.4K',
                catColor: 'bg-purple-100 text-purple-700',
              },
              {
                name: 'AI Lead Scoring & Enrichment',
                cat: 'Sales',
                cost: '$0.02',
                time: '~8s',
                runs: '1.8K',
                catColor: 'bg-orange-100 text-orange-700',
              },
              {
                name: 'Blog Article from Keyword',
                cat: 'Content Creation',
                cost: '$0.05',
                time: '~30s',
                runs: '956',
                catColor: 'bg-purple-100 text-purple-700',
              },
              {
                name: 'Competitor Price Tracker',
                cat: 'Data Processing',
                cost: '$0.01',
                time: '~12s',
                runs: '1.2K',
                catColor: 'bg-blue-100 text-blue-700',
              },
            ].map((wf, i) => (
              <div
                key={wf.name}
                className={`flex items-center justify-between rounded-lg border border-border bg-background p-2 transition-all duration-500 ${animStep > i + 1 ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-foreground">
                      {wf.name}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span
                      className={`rounded px-1 text-[7px] font-medium ${wf.catColor}`}
                    >
                      {wf.cat}
                    </span>
                    <span className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
                      <DollarSign className="h-2 w-2" />
                      {wf.cost}
                    </span>
                    <span className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
                      <Clock className="h-2 w-2" />
                      {wf.time}
                    </span>
                    <span className="flex items-center gap-0.5 text-[7px] text-muted-foreground">
                      <Users className="h-2 w-2" />
                      {wf.runs}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="rounded bg-primary px-2 py-0.5 text-[8px] font-medium text-primary-foreground">
                    Run
                  </div>
                </div>
              </div>
            ))}
            <div
              className={`mt-1 rounded-lg border border-amber-200/60 bg-amber-50/30 p-2 transition-all duration-500 ${animStep >= 5 ? 'opacity-100' : 'opacity-0'}`}
            >
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-amber-600" />
                <span className="text-[8px] font-medium text-amber-700">
                  Running: Generate Social Media Post
                </span>
                <span className="ml-auto animate-pulse text-[8px] text-amber-600">
                  Processing...
                </span>
              </div>
              <div className="mt-1 font-mono text-[7px] text-amber-800">
                {typedText}
                <span className="animate-pulse">|</span>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const activeSidebarId = getActiveSidebarId()

  return (
    <section id="demo" className="relative overflow-hidden py-14 lg:py-20">
      <div className="mx-auto max-w-6xl px-5">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-primary">
            See it in action
          </p>
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            One platform. One login. One bill.
          </h2>
          <p className="mt-3 text-base text-muted-foreground">
            CRM, projects, HR, chat, email &amp; AI automation — everything your
            business needs to sell, manage, and grow.{' '}
            <strong className="font-semibold text-foreground/80">
              Per workspace, not per seat.
            </strong>
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center">
          <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background p-1 shadow-sm">
            {features.map((feature, i) => {
              const Icon = feature.icon
              const isActive = activeFeature === i
              return (
                <button
                  key={feature.id}
                  onClick={() => {
                    setActiveFeature(i)
                    setProgress(0)
                    setAnimStep(0)
                  }}
                  className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-300 ${
                    isActive
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {isActive && (
                    <div className="absolute inset-0 rounded-lg bg-muted" />
                  )}
                  <Icon
                    className={`relative z-10 h-4 w-4 ${isActive ? feature.color : ''}`}
                  />
                  <span className="relative z-10 hidden whitespace-nowrap sm:inline">
                    {feature.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="relative mx-auto max-w-5xl">
          <div className="absolute -inset-x-4 -bottom-4 h-20 rounded-[50%] bg-primary/5 blur-3xl" />

          <div className="relative overflow-hidden rounded-xl border border-border bg-background shadow-2xl shadow-muted/40">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-4 py-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF5F57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFBD2E]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28CA41]" />
              <div className="ml-3 flex-1 rounded-md bg-background px-3 py-1 text-[10px] text-muted-foreground">
                app.crmpro.com/
                {current.id === 'crm'
                  ? 'leads'
                  : current.id === 'hr'
                    ? 'attendance'
                    : current.id === 'ai'
                      ? 'engines'
                      : current.id}
              </div>
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Bell className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="h-5 w-5 rounded-full bg-primary/20" />
            </div>

            <div className="grid grid-cols-12">
              <div className="col-span-2 hidden border-r border-border bg-primary p-2 lg:block">
                <div className="mb-3 flex items-center gap-2 px-1">
                  <div className="rounded-md bg-primary-foreground/20 p-1">
                    <Briefcase className="h-3 w-3 text-primary-foreground" />
                  </div>
                  <span className="text-[9px] font-bold text-primary-foreground">
                    CRM Pro
                  </span>
                </div>
                <div className="space-y-0.5">
                  {sidebarItems
                    .filter(item => !item.parent)
                    .map(item => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 transition-all duration-300 ${
                          item.section
                            ? 'mt-2 text-[7px] font-semibold uppercase tracking-wider text-primary-foreground/50'
                            : item.id === activeSidebarId
                              ? 'bg-primary-foreground/20 text-primary-foreground'
                              : 'text-primary-foreground/60'
                        }`}
                      >
                        <item.icon className="h-2.5 w-2.5" />
                        <span className="text-[8px]">{item.label}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="col-span-12 p-4 lg:col-span-10">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      {current.label}
                    </h3>
                    <p className="text-[10px] text-muted-foreground">
                      {current.id === 'crm' &&
                        'Leads, contacts, pipeline, custom statuses, tags & webhooks'}
                      {current.id === 'projects' &&
                        'Kanban boards, tasks, sprints, documents & time tracking'}
                      {current.id === 'hr' &&
                        'Attendance, leaves, assets, shifts & employee management'}
                      {current.id === 'email' &&
                        'Gmail + Outlook integration with AI email writer'}
                      {current.id === 'chat' &&
                        'Real-time team chat with rooms, DMs & file sharing'}
                      {current.id === 'ai' &&
                        'Browse & run AI workflows — content, lead scoring, marketing & more'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1">
                      <Search className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[9px] text-muted-foreground">
                        Search...
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-1 rounded-md px-2 py-1 text-[9px] font-medium text-primary-foreground ${current.activeBg}`}
                    >
                      <Plus className="h-3 w-3" />
                      <span>New</span>
                    </div>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {statsForFeature().map((stat, i) => (
                    <div
                      key={stat.label}
                      className={`rounded-lg border border-border bg-background p-2.5 transition-all duration-500 ${
                        animStep > i
                          ? 'scale-100 opacity-100'
                          : 'scale-95 opacity-0'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[8px] font-medium uppercase tracking-wider text-muted-foreground">
                          {stat.label}
                        </span>
                        <stat.icon className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="font-mono text-base font-bold text-foreground">
                        {stat.value}
                      </div>
                      <div
                        className={`text-[8px] font-medium ${stat.up ? 'text-emerald-600' : 'text-amber-600'}`}
                      >
                        {stat.change}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  {renderMainContent()}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
