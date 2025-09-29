'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppSelector } from '@/lib/hooks'
import {
  Check,
  X,
  Crown,
  Users,
  Database,
  Zap,
  Shield,
  CreditCard,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    description: 'Perfect for getting started',
    features: [
      { name: 'Up to 100 leads', included: true },
      { name: '2 team members', included: true },
      { name: 'Basic analytics', included: true },
      { name: 'Email support', included: true },
      { name: 'Advanced reporting', included: false },
      { name: 'API access', included: false },
      { name: 'Custom integrations', included: false },
      { name: 'Priority support', included: false },
    ],
    limits: {
      leads: 100,
      users: 2,
      storage: '1 GB',
      apiCalls: 1000,
    },
    popular: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    description: 'Best for growing teams',
    features: [
      { name: 'Up to 1,000 leads', included: true },
      { name: '10 team members', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Email & chat support', included: true },
      { name: 'Advanced reporting', included: true },
      { name: 'API access', included: true },
      { name: 'Custom integrations', included: false },
      { name: 'Priority support', included: false },
    ],
    limits: {
      leads: 1000,
      users: 10,
      storage: '10 GB',
      apiCalls: 10000,
    },
    popular: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    description: 'For large organizations',
    features: [
      { name: 'Unlimited leads', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Advanced analytics', included: true },
      { name: 'Priority support', included: true },
      { name: 'Advanced reporting', included: true },
      { name: 'API access', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
    limits: {
      leads: 'Unlimited',
      users: 'Unlimited',
      storage: '100 GB',
      apiCalls: 100000,
    },
    popular: false,
  },
]

// Mock current usage data
const currentUsage = {
  leads: 45,
  users: 3,
  storage: 2.5, // GB
  apiCalls: 1250,
}

export default function PlansPage() {
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate API loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)

    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="w-full space-y-6">
        <PageHeaderSkeleton />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="w-full space-y-6">
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Plans & Billing
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage your subscription and view usage statistics
        </p>
      </div>
      <div>
        <p>Plans page content will be restored after fixing build issues.</p>
      </div>
    </div>
  )
}
