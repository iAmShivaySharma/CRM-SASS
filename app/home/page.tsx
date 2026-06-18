import type { Metadata } from 'next'
import { FAQS } from '@/components/home/constants'
import Navbar from '@/components/home/Navbar'
import Hero from '@/components/home/Hero'
import BentoFeatures from '@/components/home/BentoFeatures'
import WhoItsFor from '@/components/home/WhoItsFor'
import Calculator from '@/components/home/Calculator'
import TimeSavings from '@/components/home/TimeSavings'
import HowItWorks from '@/components/home/HowItWorks'
import Competitors from '@/components/home/Competitors'
import Testimonials from '@/components/home/Testimonials'
import Pricing from '@/components/home/Pricing'
import FAQ from '@/components/home/FAQ'
import CTA from '@/components/home/CTA'
import Footer from '@/components/home/Footer'

export const metadata: Metadata = {
  title: 'CRM Pro — AI-Powered CRM That Replaces 6 Tools | $29/mo',
  description:
    'Stop paying $1,200/mo for Salesforce, Monday, Slack, BambooHR, Zapier & Mailchimp. CRM Pro gives you CRM, projects, HR, chat, email & AI automation — $29/mo per workspace, not per seat.',
  keywords: [
    'CRM', 'AI CRM', 'sales CRM', 'CRM software', 'lead management',
    'sales automation', 'AI workflow automation', 'pipeline management',
    'hubspot alternative', 'salesforce alternative', 'all in one CRM',
    'CRM for agencies', 'CRM for startups', 'CRM with project management',
    'CRM with HR', 'best CRM for small business',
  ],
  openGraph: {
    title: 'CRM Pro — Replace 6 Tools with One AI-Powered Platform',
    description: 'CRM, Projects, HR, Chat, Email & AI Automation — all in one. $29/mo per workspace, not per seat. Start free.',
    type: 'website',
    locale: 'en_US',
    siteName: 'CRM Pro',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CRM Pro — Replace 6 Tools with One AI-Powered Platform',
    description: 'CRM, Projects, HR, Chat, Email & AI Automation — all in one. $29/mo per workspace, not per seat.',
  },
  robots: { index: true, follow: true },
  alternates: { canonical: '/home' },
}

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  },
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CRM Pro',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'All-in-one AI CRM replacing Salesforce, Monday.com, BambooHR, Slack, Mailchimp & Zapier for $29/mo.',
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Starter', price: '12', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '29', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Enterprise', price: '99', priceCurrency: 'USD' },
    ],
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1200', bestRating: '5' },
  },
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'CRM Pro', description: 'AI-powered all-in-one CRM platform for SMBs, agencies, and startups.' },
]

export default function HomePage() {
  return (
    <>
      {structuredData.map((sd, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(sd) }} />
      ))}

      <div className="min-h-screen bg-white text-neutral-900 antialiased">
        <Navbar />
        <Hero />
        <BentoFeatures />
        <WhoItsFor />
        <Calculator />
        <TimeSavings />
        <HowItWorks />
        <Competitors />
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTA />
        <Footer />
      </div>
    </>
  )
}
