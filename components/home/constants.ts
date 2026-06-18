import {
  Users,
  Target,
  GitBranch,
  Building2,
  HomeIcon,
  Rocket,
  GraduationCap,
  FolderKanban,
  Clock,
  FileText,
  MessageCircle,
  Mail,
  CalendarCheck,
  QrCode,
  Shield,
  Plane,
  BarChart3,
  Webhook,
  UserSearch,
  MessageSquareText,
  TrendingUp,
  Brain,
  ShoppingBag,
  Megaphone,
  Star,
  Zap,
  Globe,
  type LucideIcon,
} from 'lucide-react'

// ─── NAVBAR ─────────────────────────────────────────────────────

export const PRODUCT_NAV_LINKS = [
  { title: 'Sales CRM', href: '#sales-crm', desc: 'Leads, contacts, pipeline management' },
  { title: 'AI Workflows', href: '#ai-engine', desc: 'Automate with drag-and-drop AI' },
  { title: 'Project Management', href: '#all-in-one', desc: 'Kanban boards, tasks, docs' },
  { title: 'HR & Attendance', href: '#all-in-one', desc: 'Leave, shifts, asset tracking' },
]

// ─── HERO ───────────────────────────────────────────────────────

export const HERO_TRUST_POINTS = [
  'Free forever plan',
  'No per-seat pricing',
  'Setup in 5 minutes',
  'Self-hostable',
]

export interface Persona {
  id: string
  icon: LucideIcon
  label: string
  headline: string
  sub: string
}

export const HERO_PERSONAS: Persona[] = [
  {
    id: 'founder',
    icon: Rocket,
    label: 'Founders',
    headline: 'Your Entire Startup in One Tab',
    sub: 'Think HubSpot + Monday.com + BambooHR combined. Your sales team tracks leads, your project team manages tasks, your HR handles attendance — all in one place. Our AI writes emails, scores leads, and automates follow-ups.',
  },
  {
    id: 'sales',
    icon: Building2,
    label: 'Sales Leaders',
    headline: 'Never Lose a Lead Again',
    sub: 'Your team never loses a lead again. Every lead is tracked, scored by AI, and automatically followed up. See exactly which deals will close this month and which need attention. No more spreadsheets, no more "I forgot to follow up."',
  },
  {
    id: 'agency',
    icon: HomeIcon,
    label: 'Agency Owners',
    headline: 'Clients. Projects. Team. One Tool.',
    sub: 'Manage your clients, projects, team attendance, and sales pipeline in one dashboard. Your team chats in-app, documents live next to projects, and AI handles the repetitive follow-up emails. Stop paying for 6 different tools.',
  },
  {
    id: 'tech',
    icon: GraduationCap,
    label: 'Tech Buyers',
    headline: 'Modern Stack. Full Control.',
    sub: 'Next.js, MongoDB, real-time via Socket.io, n8n workflow automation, multi-tenant architecture, RBAC, webhooks, REST API, and AI/LLM integration via OpenRouter. Self-hostable or cloud-hosted.',
  },
]

export const HERO_REPLACES = [
  { icon: Users, label: 'Salesforce' },
  { icon: FolderKanban, label: 'Monday.com' },
  { icon: Brain, label: 'Zapier' },
  { icon: Mail, label: 'Mailchimp' },
  { icon: MessageCircle, label: 'Slack' },
  { icon: BarChart3, label: 'BambooHR' },
]

// ─── SAVINGS CALCULATOR ─────────────────────────────────────────

export interface ToolCost {
  name: string
  min: number
  max: number
  perSeat?: boolean
  feature: string
}

export const TOOL_COSTS: ToolCost[] = [
  { name: 'CRM (Salesforce/HubSpot)', min: 50, max: 300, feature: 'Leads, Contacts, Pipeline, Analytics' },
  { name: 'Project Mgmt (Monday/Asana)', min: 30, max: 100, feature: 'Projects, Tasks, Kanban, Time Tracking' },
  { name: 'HR Software (BambooHR)', min: 50, max: 200, feature: 'Attendance, Leaves, Assets, Shifts' },
  { name: 'Team Chat (Slack/Teams)', min: 7, max: 12, perSeat: true, feature: 'Real-time Chat, Rooms, DMs' },
  { name: 'Email Marketing (Mailchimp)', min: 20, max: 300, feature: 'Email Integration, Templates' },
  { name: 'Automation (Zapier/Make)', min: 20, max: 100, feature: 'n8n Workflow Engine, AI Automations' },
]

export function getPlanForTeamSize(teamSize: number) {
  if (teamSize <= 2) return { name: 'Free', price: 0 }
  if (teamSize <= 5) return { name: 'Starter', price: 12 }
  if (teamSize <= 15) return { name: 'Pro', price: 29 }
  return { name: 'Enterprise', price: 99 }
}

// ─── STATS ──────────────────────────────────────────────────────

export const STATS = [
  { icon: Users, value: '10,000+', label: 'Teams Worldwide', desc: 'From 5-person startups to 200+ orgs' },
  { icon: Zap, value: '2.5M+', label: 'Leads Managed', desc: 'Tracked, scored, and converted' },
  { icon: TrendingUp, value: '3.2x', label: 'Faster Close Rate', desc: 'Avg. improvement vs spreadsheets' },
  { icon: Globe, value: '35+', label: 'Countries', desc: 'India, USA, UAE, UK, and more' },
]

// ─── FEATURES (SALES CRM) ──────────────────────────────────────

export const PIPELINE_STAGES = [
  { stage: 'New', leads: 48, color: 'bg-blue-500', pct: '100%' },
  { stage: 'Contacted', leads: 36, color: 'bg-cyan-500', pct: '75%' },
  { stage: 'Qualified', leads: 24, color: 'bg-indigo-500', pct: '50%' },
  { stage: 'Proposal Sent', leads: 16, color: 'bg-purple-500', pct: '33%' },
  { stage: 'Negotiation', leads: 10, color: 'bg-violet-500', pct: '21%' },
  { stage: 'Closed Won', leads: 8, color: 'bg-green-500', pct: '17%', highlight: true },
]

export const SAMPLE_LEADS = [
  { name: 'Alex Thompson', company: 'Acme Corp', value: '$24,000', source: 'LinkedIn', status: 'Qualified', priority: 'High' as const },
  { name: 'Sarah Kim', company: 'TechStart', value: '$18,500', source: 'Website', status: 'New', priority: 'Medium' as const },
  { name: 'James Rivera', company: 'ScaleUp', value: '$42,000', source: 'Referral', status: 'Proposal', priority: 'High' as const },
  { name: 'Priya Patel', company: 'GrowthLab', value: '$15,000', source: 'Google Ads', status: 'Contacted', priority: 'Low' as const },
]

export const SAMPLE_CONTACTS = [
  { name: 'Acme Corp', category: 'Client' as const, revenue: '$284K', count: 3 },
  { name: 'TechFlow', category: 'Prospect' as const, revenue: '$42K', count: 1 },
  { name: 'ScaleUp Studio', category: 'Partner' as const, revenue: '$156K', count: 2 },
  { name: 'GrowthLab', category: 'Client' as const, revenue: '$89K', count: 4 },
]

export const CRM_FEATURE_TABS = [
  {
    id: 'pipeline',
    label: 'Sales Pipeline',
    icon: GitBranch,
    title: 'Visual Pipeline That Moves Deals Forward',
    description: 'Drag leads through custom stages — from New to Qualified to Won. Set custom statuses with colors, auto-assign reps, and never let a deal slip through the cracks.',
    highlights: [
      'Custom pipeline stages with color coding',
      'Auto-assign leads to best-fit reps',
      'Priority flags: High, Medium, Low',
      'Next follow-up date tracking',
    ],
  },
  {
    id: 'leads',
    label: 'Lead Management',
    icon: Users,
    title: 'Capture Leads from Every Channel',
    description: 'Import leads from website forms, LinkedIn, Google Ads, Facebook, cold outreach, referrals, and more. Every lead gets tagged, scored, and routed to the right rep automatically.',
    highlights: [
      '10+ lead sources: Website, LinkedIn, Ads, Referral, Events',
      'Custom fields for any data you need',
      'Color-coded tags for instant visual organization',
      'Full activity timeline: calls, emails, meetings, notes',
    ],
  },
  {
    id: 'contacts',
    label: 'Contacts & Deals',
    icon: Target,
    title: 'Turn Leads into Customers, Track Every Dollar',
    description: 'Convert qualified leads into contacts with one click. Track deal revenue, categorize by Client, Prospect, Partner, or Vendor. Full relationship history at your fingertips.',
    highlights: [
      'One-click lead-to-contact conversion',
      'Revenue tracking per contact',
      'Categories: Client, Prospect, Partner, Vendor',
      'Status lifecycle: Active → Inactive → Archived',
    ],
  },
]

// ─── ALL-IN-ONE MODULES ─────────────────────────────────────────

export interface ModuleItem {
  icon: LucideIcon
  title: string
  desc: string
}

export interface ModuleCategory {
  category: string
  color: string
  items: ModuleItem[]
}

export const ALL_IN_ONE_MODULES: ModuleCategory[] = [
  {
    category: 'Project Management',
    color: 'purple',
    items: [
      { icon: FolderKanban, title: 'Kanban Boards', desc: 'Drag-and-drop task management with custom columns and workflow stages' },
      { icon: Clock, title: 'Time Tracking', desc: 'Start/stop/pause timer per task. Track hours, generate timesheets' },
      { icon: FileText, title: 'Document Collaboration', desc: 'Rich text editor for proposals, SOPs, and meeting notes. Export to PDF' },
      { icon: Users, title: 'Team Permissions', desc: 'Invite members per project with role-based view/edit access' },
    ],
  },
  {
    category: 'Team Communication',
    color: 'green',
    items: [
      { icon: MessageCircle, title: 'Real-Time Chat', desc: 'Group rooms and DMs with file sharing, reactions, and typing indicators' },
      { icon: Mail, title: 'Email Inbox', desc: 'Connect Gmail & Outlook. Send, track, and template emails inside the CRM' },
    ],
  },
  {
    category: 'HR & Operations',
    color: 'orange',
    items: [
      { icon: CalendarCheck, title: 'Attendance & Shifts', desc: 'Clock in/out with GPS. Track breaks, manage shifts across Office/Remote/Hybrid' },
      { icon: Plane, title: 'Leave Management', desc: 'Annual, Sick, Personal, Maternity leave. Approval workflows and carry-forward rules' },
      { icon: QrCode, title: 'Asset Tracking', desc: 'Inventory laptops, phones, vehicles. QR codes, maintenance logs, allocation history' },
    ],
  },
  {
    category: 'Admin & Analytics',
    color: 'blue',
    items: [
      { icon: BarChart3, title: 'Reports & Dashboards', desc: 'Revenue trends, pipeline conversion, team performance — all real-time' },
      { icon: Shield, title: 'Roles & Permissions', desc: 'Custom roles with granular access control. Multi-workspace data isolation' },
      { icon: Webhook, title: 'Webhooks & API', desc: 'Inbound webhooks from Facebook, Google Forms, HubSpot, LinkedIn, and more' },
    ],
  },
]

export const MODULE_COLORS: Record<string, { badge: string; dot: string; border: string }> = {
  purple: { badge: 'bg-purple-50 text-purple-700', dot: 'bg-purple-500', border: 'border-purple-100' },
  green: { badge: 'bg-green-50 text-green-700', dot: 'bg-green-500', border: 'border-green-100' },
  orange: { badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500', border: 'border-orange-100' },
  blue: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500', border: 'border-blue-100' },
}

// ─── AI WORKFLOWS ───────────────────────────────────────────────

export const AI_WORKFLOWS = [
  {
    id: 'enrich',
    icon: UserSearch,
    label: 'Lead Enrichment',
    description: 'Auto-fetch company data, social profiles, tech stack, and buying signals for every new lead.',
    steps: [
      'New lead captured',
      'AI fetches company data',
      'Scoring: 92/100 — Hot lead',
      'Auto-assigned to Sarah (best-fit rep)',
    ],
  },
  {
    id: 'email',
    icon: FileText,
    label: 'AI Email Drafting',
    description: 'Generate hyper-personalized outreach emails based on lead profile, industry, and deal stage.',
    steps: [
      'Trigger: Lead moved to "Qualified"',
      'AI reads lead profile & company data',
      'Drafts personalized email',
      'Sent via connected Gmail',
    ],
  },
  {
    id: 'sentiment',
    icon: MessageSquareText,
    label: 'Sentiment Analysis',
    description: 'Analyze customer replies, flag negative sentiment, and alert reps before deals go cold.',
    steps: [
      'Email reply received',
      'AI analyzes tone & intent',
      'Sentiment: Negative — deal at risk',
      'Alert sent to account owner',
    ],
  },
  {
    id: 'content',
    icon: TrendingUp,
    label: 'Content Generation',
    description: 'Auto-generate proposals, follow-up sequences, and social posts from your deal and lead data.',
    steps: [
      'Deal enters "Proposal" stage',
      'AI pulls deal context & requirements',
      'Generates proposal draft',
      'Saved as project document',
    ],
  },
]

// ─── TESTIMONIALS ───────────────────────────────────────────────

export const TESTIMONIALS = [
  {
    quote: 'We were paying $1,200/month for Salesforce + Monday + Slack + BambooHR. CRM Pro replaced all four for $290/month. The AI workflows alone saved our SDR team 15 hours per week on lead research.',
    name: 'Sarah Chen',
    role: 'VP of Sales',
    company: 'TechFlow Inc.',
    metric: '$910/mo saved',
    metricColor: 'bg-green-50 text-green-700 border-green-100',
    industry: 'SaaS',
  },
  {
    quote: 'The built-in Kanban + time tracking changed how we run client projects. Before, our PMs were switching between 3 tools. Now everything — tasks, docs, time logs, client chat — is in one place.',
    name: 'Marcus Rodriguez',
    role: 'Founder',
    company: 'ScaleUp Studio',
    metric: '40% faster delivery',
    metricColor: 'bg-blue-50 text-blue-700 border-blue-100',
    industry: 'Agency',
  },
  {
    quote: 'We went from tracking leads in Google Sheets to closing deals 3x faster. The pipeline view, AI lead scoring, and email integration made our 8-person team perform like 20.',
    name: 'Priya Sharma',
    role: 'Founder & CEO',
    company: 'GrowthLab Digital',
    metric: '3x close rate',
    metricColor: 'bg-purple-50 text-purple-700 border-purple-100',
    industry: 'Digital Marketing',
  },
  {
    quote: 'Finally an HR module that lives inside our CRM. Attendance tracking with GPS, leave management, asset inventory — we cancelled our separate HR tool within a week of switching.',
    name: 'Rajesh Gupta',
    role: 'Operations Head',
    company: 'BuildRight Construction',
    metric: 'Replaced 2 tools',
    metricColor: 'bg-orange-50 text-orange-700 border-orange-100',
    industry: 'Construction',
  },
]

// ─── INDUSTRIES ─────────────────────────────────────────────────

export const INDUSTRIES = [
  {
    id: 'agency',
    icon: Megaphone,
    label: 'Agencies',
    title: 'Digital Marketing Agencies (5-50 people)',
    pain: 'Paying $500+/mo for HubSpot + Asana + Slack + Harvest separately. Client data scattered across tools.',
    pitch: 'Manage clients, projects, and your team in one tool for $29/mo',
    savings: '$4,452/year',
    features: [
      'Pipeline per client — track every deal stage',
      'Kanban boards per project with time tracking',
      'Team chat rooms per client (replace Slack)',
      'AI writes follow-up emails from lead context',
      'Document collaboration for proposals & SOPs',
      'Attendance tracking for remote + hybrid teams',
    ],
    decisionMaker: 'Agency owner or operations manager',
  },
  {
    id: 'realestate',
    icon: HomeIcon,
    label: 'Real Estate',
    title: 'Real Estate Teams & Brokerages (3-30 agents)',
    pain: 'Leads fall through cracks. Agents forget to follow up. No unified view of the pipeline.',
    pitch: 'Never lose a lead again — AI follows up automatically',
    savings: '$3,252/year',
    features: [
      'Leads auto-scored by AI — focus on hot buyers',
      'Auto follow-up sequences for each lead',
      'Pipeline view: New → Showing → Offer → Closed',
      'Email integration — track opens and replies',
      'Mobile-ready for field agents',
      'Custom fields: Property type, budget, location',
    ],
    decisionMaker: 'Broker or team lead',
  },
  {
    id: 'startup',
    icon: Rocket,
    label: 'Startups',
    title: 'SaaS & Tech Startups (5-25 employees)',
    pain: 'Stitching together 5+ tools with no unified view. Burning cash on tool subscriptions.',
    pitch: 'One platform for your entire startup — sales, projects, HR, chat',
    savings: '$6,012/year',
    features: [
      'Sales CRM + project management in one view',
      'AI lead scoring learns from your winning patterns',
      'Kanban boards with time tracking per task',
      'Full HR: attendance, leaves, assets as you scale',
      'Webhook integrations for your tech stack',
      'REST API + self-hostable option',
    ],
    decisionMaker: 'Founder or Head of Operations',
  },
  {
    id: 'coaching',
    icon: GraduationCap,
    label: 'Coaching',
    title: 'Coaching & Consulting Businesses',
    pain: 'Using spreadsheets and WhatsApp to manage clients. Looks unprofessional.',
    pitch: 'Professional client management that makes you look enterprise-grade',
    savings: '$2,400/year',
    features: [
      'Client pipeline from inquiry to onboarding',
      'Project boards per client engagement',
      'Document editor for session notes & deliverables',
      'Email templates for onboarding sequences',
      'AI drafts personalized outreach',
      'Simple enough for non-technical teams',
    ],
    decisionMaker: 'Solo founder or small team lead',
  },
  {
    id: 'smb',
    icon: Users,
    label: 'SMBs',
    title: 'SMBs with HR Needs (20-200 employees)',
    pain: 'Separate HR software + CRM + project tools = chaos and massive spend.',
    pitch: 'Your entire business operations in one platform',
    savings: '$10,812/year',
    features: [
      'Full HR suite: clock-in with GPS, shifts, leave policies',
      'Asset management with QR codes & maintenance logs',
      'CRM pipeline for sales team',
      'Project boards for delivery team',
      'Custom roles with granular permissions',
      'Analytics across all departments',
    ],
    decisionMaker: 'HR Manager or COO',
  },
  {
    id: 'ecommerce',
    icon: ShoppingBag,
    label: 'E-commerce',
    title: 'E-commerce & D2C Brands',
    pain: 'Customer data spread across Shopify, email tools, and spreadsheets.',
    pitch: 'Track every customer interaction and automate follow-ups',
    savings: '$4,200/year',
    features: [
      'Customer pipeline from lead to repeat buyer',
      'Webhook imports from Shopify, Google Forms',
      'AI-powered email sequences for re-engagement',
      'Team coordination for order fulfillment',
      'Analytics on customer lifetime value',
      'Automation workflows triggered by customer actions',
    ],
    decisionMaker: 'Founder or Marketing Manager',
  },
]

// ─── PRICING ────────────────────────────────────────────────────

export interface PricingFeature {
  text: string
  included: boolean
}

export interface PricingPlan {
  name: string
  monthlyPrice: number
  annualPrice: number
  description: string
  limits: string
  features: PricingFeature[]
  cta: string
  highlighted: boolean
  badge?: string
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    description: 'For tiny teams just getting started.',
    limits: '2 members · 100 leads · 5 projects',
    features: [
      { text: '2 team members', included: true },
      { text: '100 leads & contacts', included: true },
      { text: 'Basic pipeline (1 pipeline)', included: true },
      { text: '5 projects, 50 tasks', included: true },
      { text: 'Team chat (30-day history)', included: true },
      { text: '500 MB storage', included: true },
      { text: 'Email integration', included: false },
      { text: 'HR & attendance', included: false },
      { text: 'AI workflows', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Starter',
    monthlyPrice: 12,
    annualPrice: 9,
    description: 'For small teams with real sales needs.',
    limits: '5 members · 1K leads · 15 projects',
    features: [
      { text: '5 team members', included: true },
      { text: '1,000 leads & contacts', included: true },
      { text: 'Full pipeline + custom statuses', included: true },
      { text: '15 projects, unlimited tasks', included: true },
      { text: 'Team chat (full history)', included: true },
      { text: 'Email integration (1 account)', included: true },
      { text: 'Basic HR (attendance + leaves)', included: true },
      { text: '5 GB storage', included: true },
      { text: 'AI workflows', included: false },
      { text: 'API access', included: false },
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Pro',
    monthlyPrice: 29,
    annualPrice: 23,
    description: 'For growing teams that need the full platform.',
    limits: '15 members · 10K leads · Unlimited projects',
    features: [
      { text: '15 team members', included: true },
      { text: '10,000 leads & contacts', included: true },
      { text: 'AI lead scoring + pipelines', included: true },
      { text: 'Unlimited projects + time tracking', included: true },
      { text: 'AI workflow engine (500 credits/mo)', included: true },
      { text: 'Email integration (3 accounts)', included: true },
      { text: 'Full HR: attendance, leaves, assets, shifts', included: true },
      { text: 'Webhook integrations', included: true },
      { text: 'Custom roles & permissions', included: true },
      { text: '25 GB storage', included: true },
    ],
    cta: 'Start 14-Day Trial',
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    monthlyPrice: 99,
    annualPrice: 79,
    description: 'For large orgs with advanced needs.',
    limits: 'Unlimited everything',
    features: [
      { text: 'Unlimited team members', included: true },
      { text: 'Unlimited leads & contacts', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'Unlimited AI credits', included: true },
      { text: 'Full API access', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'Custom roles & granular permissions', included: true },
      { text: 'White-label option (+$49/mo)', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: '100 GB storage + self-host option', included: true },
    ],
    cta: 'Contact Sales',
    highlighted: false,
  },
]

// ─── FAQ ────────────────────────────────────────────────────────

export const FAQS = [
  {
    question: 'What exactly does CRM Pro include?',
    answer: 'CRM Pro is an all-in-one platform with: Sales CRM (leads, contacts, pipeline, deal tracking), Project Management (Kanban boards, tasks, time tracking, documents), Team Communication (real-time chat, email inbox with Gmail/Outlook), HR & Operations (attendance with GPS, leave management, shift scheduling, asset inventory with QR codes), AI Workflow Engine (lead enrichment, email drafting, sentiment analysis), and Analytics & Reporting — all in a single platform.',
  },
  {
    question: 'How does CRM Pro compare to Salesforce or HubSpot?',
    answer: 'Unlike Salesforce or HubSpot, CRM Pro bundles project management, HR tools, team chat, and AI automation alongside your CRM — no add-ons or separate subscriptions. Salesforce costs $75+/user for CRM alone. With CRM Pro, you get the full suite at $29/workspace. We\'re built for agencies, startups, and SMBs who need everything in one tool without enterprise complexity.',
  },
  {
    question: 'What does "per workspace, not per seat" mean?',
    answer: 'Most CRMs charge per user — so a 10-person team on Salesforce at $75/user pays $750/month. CRM Pro charges per workspace: $29/month covers up to 15 members on the Pro plan. Your price stays the same whether you have 1 or 15 people. Growing your team shouldn\'t penalize your wallet.',
  },
  {
    question: 'Is there really a free plan?',
    answer: 'Yes. The Free plan includes 2 team members, 100 leads, 5 projects, team chat, and a basic pipeline — forever, no credit card needed. The Starter plan at $12/month adds email integration, HR basics, and more capacity. Upgrade only when you need AI workflows, advanced HR, or larger team sizes.',
  },
  {
    question: 'How does the AI Workflow Engine work?',
    answer: 'Our visual workflow builder lets you create automations using drag-and-drop nodes. You can: auto-enrich leads with company data and social profiles, generate personalized emails based on lead context, analyze customer sentiment to flag at-risk deals, auto-score leads and assign them to the right rep. Workflows run on triggers you define and execute automatically. Use your own API keys or our platform credits.',
  },
  {
    question: 'Can I import leads from my current CRM?',
    answer: 'Yes. We support CSV import for bulk data migration, plus API-based sync from Salesforce, HubSpot, and Pipedrive. Our team assists with custom migrations at no extra cost on Pro and Enterprise plans.',
  },
  {
    question: 'What integrations does CRM Pro support?',
    answer: 'Gmail and Outlook for email, inbound webhooks from Facebook, Google Forms, HubSpot, LinkedIn, Zapier, and SwipePages for lead capture. The AI workflow engine connects to OpenAI and other LLM providers. REST API and custom webhooks for anything else you need.',
  },
  {
    question: 'Is my data secure? Can I self-host?',
    answer: 'Security at every layer: AES-256 encryption at rest, TLS in transit, RBAC with granular permissions, multi-workspace data isolation, encrypted API key storage, and daily backups. Enterprise plans include SSO/SAML and an on-premise/self-hosted deployment option for full data control.',
  },
]

// ─── FOOTER ─────────────────────────────────────────────────────

export const FOOTER_LINKS = {
  Product: [
    { label: 'Sales CRM', href: '#sales-crm' },
    { label: 'AI Workflows', href: '#ai-engine' },
    { label: 'Project Management', href: '#all-in-one' },
    { label: 'HR & Attendance', href: '#all-in-one' },
    { label: 'Team Chat', href: '#all-in-one' },
    { label: 'Email Integration', href: '#all-in-one' },
    { label: 'Analytics', href: '#all-in-one' },
    { label: 'Pricing', href: '#pricing' },
  ],
  'Use Cases': [
    { label: 'Digital Marketing Agencies', href: '#industries' },
    { label: 'SaaS Startups', href: '#industries' },
    { label: 'Real Estate Teams', href: '#industries' },
    { label: 'Coaching & Consulting', href: '#industries' },
    { label: 'E-Commerce & D2C', href: '#industries' },
  ],
  Resources: [
    { label: 'FAQ', href: '#faq' },
    { label: 'Blog', href: '#' },
    { label: 'API Documentation', href: '#' },
    { label: 'Changelog', href: '#' },
    { label: 'Status Page', href: '#' },
  ],
  Company: [
    { label: 'About Us', href: '#' },
    { label: 'Careers', href: '#' },
    { label: 'Contact', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms of Service', href: '#' },
    { label: 'Security', href: '#' },
  ],
}

export const COMPARISON_LINKS = [
  'CRM Pro vs Salesforce',
  'CRM Pro vs HubSpot',
  'CRM Pro vs Pipedrive',
  'CRM Pro vs Monday.com',
  'CRM Pro vs Zoho',
]

// ─── DASHBOARD MOCK DATA ────────────────────────────────────────

export const DASHBOARD_STATS = [
  { label: 'Total Leads', value: '2,847', change: '+12.5%' },
  { label: 'Conversion', value: '24.8%', change: '+3.2%' },
  { label: 'Revenue', value: '$184K', change: '+18.4%' },
  { label: 'Active Deals', value: '142', change: '+8' },
]

export const DASHBOARD_PIPELINE = [
  { stage: 'New', count: 48, pct: 100, color: 'bg-blue-500' },
  { stage: 'Qualified', count: 32, pct: 67, color: 'bg-indigo-500' },
  { stage: 'Proposal', count: 18, pct: 38, color: 'bg-purple-500' },
  { stage: 'Negotiation', count: 12, pct: 25, color: 'bg-violet-500' },
  { stage: 'Won', count: 8, pct: 17, color: 'bg-green-500' },
]

export const DASHBOARD_ACTIVITY = [
  { action: 'Lead scored 92/100', time: '2m ago', dot: 'bg-green-500' },
  { action: 'Email opened by Sarah', time: '5m ago', dot: 'bg-blue-500' },
  { action: 'Deal moved to Won', time: '12m ago', dot: 'bg-purple-500' },
  { action: 'New lead from web', time: '18m ago', dot: 'bg-orange-500' },
]
