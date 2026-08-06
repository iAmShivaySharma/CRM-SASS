import { NextResponse } from 'next/server'
import { connectToMongoDB } from '@/lib/mongodb/connection'
import { Plan } from '@/lib/mongodb/client'

const PLANS = [
  {
    _id: 'free',
    name: 'Free',
    description: '3 members · 500 leads',
    price: 0,
    interval: 'month',
    features: [
      'Up to 500 leads',
      '3 team members',
      'Basic pipeline',
      '5 projects · 50 tasks',
      'Team chat (30 days)',
    ],
    limits: { leads: 500, members: 3, storage: 1000, apiCalls: 1000 },
    sortOrder: 0,
    isActive: true,
  },
  {
    _id: 'starter',
    name: 'Starter',
    description: '10 members · 5K leads',
    price: 12,
    interval: 'month',
    features: [
      'Up to 5,000 leads',
      '10 team members',
      'Full pipeline + statuses',
      '15 projects · unlimited tasks',
      'Team chat (full history)',
      'Email (1 account)',
      'Basic HR',
    ],
    limits: { leads: 5000, members: 10, storage: 10000, apiCalls: 5000 },
    sortOrder: 1,
    isActive: true,
  },
  {
    _id: 'pro',
    name: 'Pro',
    description: '25 members · 50K leads',
    price: 29,
    interval: 'month',
    features: [
      'Up to 50,000 leads',
      '25 team members',
      'AI scoring + pipelines',
      'Unlimited projects + time tracking',
      'Chat + doc collaboration',
      'Email (3 accounts)',
      'Full HR suite',
      'AI engine (500 credits)',
    ],
    limits: { leads: 50000, members: 25, storage: 50000, apiCalls: 50000 },
    sortOrder: 2,
    isActive: true,
  },
  {
    _id: 'enterprise',
    name: 'Enterprise',
    description: 'Unlimited everything',
    price: 99,
    interval: 'month',
    features: [
      'Unlimited leads',
      'Unlimited team members',
      'Everything in Pro',
      'Unlimited AI credits',
      'SSO / SAML',
      'API access',
      'White-label (+$49)',
      'Dedicated account manager',
    ],
    limits: { leads: -1, members: -1, storage: 200000, apiCalls: 100000 },
    sortOrder: 3,
    isActive: true,
  },
]

export async function POST() {
  try {
    await connectToMongoDB()

    for (const plan of PLANS) {
      await Plan.findByIdAndUpdate(plan._id, plan, { upsert: true, new: true })
    }

    const allPlans = await Plan.find({ isActive: true }).sort({ sortOrder: 1 })

    return NextResponse.json({
      message: `${allPlans.length} plans seeded successfully`,
      plans: allPlans,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed plans' },
      { status: 500 }
    )
  }
}
