'use client'

import { useState, useEffect, useCallback } from 'react'
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
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
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
import { CardSkeleton, PageHeaderSkeleton } from '@/components/ui/skeleton'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PlanFeature {
  name: string
  included: boolean
}

interface PlanData {
  id: string
  name: string
  price: number
  interval: string
  description: string
  features: PlanFeature[]
  limits: Record<string, string | number>
  popular: boolean
}

interface SubscriptionData {
  id: string
  planId: string
  status: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  cancelledAt: string | null
  metadata: Record<string, any>
}

const PLANS: PlanData[] = [
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

function loadRazorpayScript(): Promise<boolean> {
  return new Promise(resolve => {
    if (window.Razorpay) {
      resolve(true)
      return
    }
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export default function PlansPage() {
  const [isLoading, setIsLoading] = useState(true)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(
    null
  )
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null)
  const [billingTab, setBillingTab] = useState('plans')

  const { currentWorkspace } = useAppSelector(state => state.workspace)

  const fetchSubscription = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/subscription', {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()

      if (data.subscription) {
        setSubscription(data.subscription)
      }
      if (data.workspace) {
        setCurrentPlanId(data.workspace.planId || 'free')
        setWorkspaceName(data.workspace.name || '')
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const handleUpgrade = async (planId: string) => {
    if (planId === 'free') {
      toast.info('You are already on the Free plan')
      return
    }

    if (planId === currentPlanId) {
      toast.info('You are already on this plan')
      return
    }

    setUpgradingPlanId(planId)

    try {
      // Load Razorpay script
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load payment processor. Please try again.')
        setUpgradingPlanId(null)
        return
      }

      // Create order on the backend
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ planId }),
      })

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json()
        toast.error(errorData.error || 'Failed to create order')
        setUpgradingPlanId(null)
        return
      }

      const orderData = await orderResponse.json()

      const plan = PLANS.find(p => p.id === planId)

      // Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'CRM SaaS',
        description: `${plan?.name || planId} Plan - Monthly Subscription`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          await handlePaymentSuccess(response, planId)
        },
        prefill: {
          name: workspaceName || currentWorkspace?.name || '',
        },
        notes: {
          planId: planId,
        },
        theme: {
          color: '#6366f1',
        },
        modal: {
          ondismiss: function () {
            setUpgradingPlanId(null)
            toast.info('Payment cancelled')
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on('payment.failed', function (response: any) {
        setUpgradingPlanId(null)
        toast.error(
          response.error?.description || 'Payment failed. Please try again.'
        )
      })
      razorpay.open()
    } catch (error) {
      console.error('Error initiating payment:', error)
      toast.error('Failed to initiate payment. Please try again.')
      setUpgradingPlanId(null)
    }
  }

  const handlePaymentSuccess = async (
    response: {
      razorpay_order_id: string
      razorpay_payment_id: string
      razorpay_signature: string
    },
    planId: string
  ) => {
    try {
      const verifyResponse = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature,
          planId,
        }),
      })

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json()
        toast.error(errorData.error || 'Payment verification failed')
        setUpgradingPlanId(null)
        return
      }

      const verifyData = await verifyResponse.json()

      if (verifyData.success) {
        toast.success('Payment successful! Your plan has been upgraded.')
        setCurrentPlanId(planId)
        if (verifyData.subscription) {
          setSubscription(verifyData.subscription)
        }
        // Refresh subscription data
        await fetchSubscription()
      } else {
        toast.error('Payment verification failed. Please contact support.')
      }
    } catch (error) {
      console.error('Error verifying payment:', error)
      toast.error(
        'Payment verification failed. Please contact support if you were charged.'
      )
    } finally {
      setUpgradingPlanId(null)
    }
  }

  const getUsagePercentage = (
    current: number,
    limit: number | string
  ): number => {
    if (typeof limit === 'string') return 0
    if (limit === 0) return 0
    return Math.min(Math.round((current / limit) * 100), 100)
  }

  const currentPlan = PLANS.find(p => p.id === currentPlanId)

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
      {/* Page Header */}
      <div className="w-full">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
          Plans & Billing
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Manage your subscription and view usage statistics
        </p>
      </div>

      {/* Current Plan Summary */}
      {subscription && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Crown className="h-5 w-5 text-yellow-500" />
                <div>
                  <CardTitle className="text-lg">Current Plan</CardTitle>
                  <CardDescription>
                    {currentPlan?.name || 'Free'} Plan
                    {subscription.status === 'active' && (
                      <Badge variant="default" className="ml-2 bg-green-600">
                        Active
                      </Badge>
                    )}
                    {subscription.status === 'past_due' && (
                      <Badge variant="destructive" className="ml-2">
                        Past Due
                      </Badge>
                    )}
                    {subscription.status === 'cancelled' && (
                      <Badge variant="secondary" className="ml-2">
                        Cancelled
                      </Badge>
                    )}
                  </CardDescription>
                </div>
              </div>
              {subscription.currentPeriodEnd && (
                <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Renews{' '}
                      {new Date(
                        subscription.currentPeriodEnd
                      ).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      <Tabs value={billingTab} onValueChange={setBillingTab} className="w-full">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="billing">Billing History</TabsTrigger>
        </TabsList>

        {/* Plans Tab */}
        <TabsContent value="plans" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {PLANS.map(plan => {
              const isCurrent = plan.id === currentPlanId
              const isDowngrade =
                PLANS.findIndex(p => p.id === plan.id) <
                PLANS.findIndex(p => p.id === currentPlanId)
              const isUpgrading = upgradingPlanId === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${
                    plan.popular ? 'border-2 border-indigo-500 shadow-lg' : ''
                  } ${isCurrent ? 'ring-2 ring-green-500' : ''}`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-indigo-500 text-white">
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  {isCurrent && (
                    <div className="absolute -top-3 right-4">
                      <Badge className="bg-green-600 text-white">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold text-gray-900 dark:text-white">
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-gray-500 dark:text-gray-400">
                          /{plan.interval}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-6 flex-1 space-y-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          {feature.included ? (
                            <Check className="h-4 w-4 flex-shrink-0 text-green-500" />
                          ) : (
                            <X className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
                          )}
                          <span
                            className={`text-sm ${
                              feature.included
                                ? 'text-gray-700 dark:text-gray-300'
                                : 'text-gray-400 dark:text-gray-600'
                            }`}
                          >
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={
                        isCurrent
                          ? 'outline'
                          : plan.popular
                            ? 'default'
                            : 'outline'
                      }
                      disabled={isCurrent || isDowngrade || isUpgrading}
                      onClick={() => handleUpgrade(plan.id)}
                    >
                      {isUpgrading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrent ? (
                        'Current Plan'
                      ) : isDowngrade ? (
                        'Downgrade'
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-4 w-4" />
                          Upgrade to {plan.name}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Usage Tab */}
        <TabsContent value="usage" className="mt-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">Leads</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Used
                    </span>
                    <span className="font-medium">
                      {currentPlan?.limits.leads === 'Unlimited'
                        ? 'Unlimited'
                        : `0 / ${currentPlan?.limits.leads || 100}`}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      0,
                      currentPlan?.limits.leads || 100
                    )}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  <CardTitle className="text-base">Team Members</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Used
                    </span>
                    <span className="font-medium">
                      {currentPlan?.limits.users === 'Unlimited'
                        ? 'Unlimited'
                        : `${currentWorkspace?.memberCount || 1} / ${
                            currentPlan?.limits.users || 2
                          }`}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      currentWorkspace?.memberCount || 1,
                      currentPlan?.limits.users || 2
                    )}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  <CardTitle className="text-base">API Calls</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      This month
                    </span>
                    <span className="font-medium">
                      0 /{' '}
                      {currentPlan?.limits.apiCalls?.toLocaleString() ||
                        '1,000'}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      0,
                      currentPlan?.limits.apiCalls || 1000
                    )}
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <CardTitle className="text-base">Storage</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">
                      Used
                    </span>
                    <span className="font-medium">
                      0 GB / {currentPlan?.limits.storage || '1 GB'}
                    </span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                <CardTitle>Billing History</CardTitle>
              </div>
              <CardDescription>
                Your recent transactions and invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscription && subscription.metadata?.razorpayPaymentId ? (
                <div className="rounded-lg border">
                  <div className="grid grid-cols-4 gap-4 border-b bg-gray-50 p-3 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    <span>Date</span>
                    <span>Plan</span>
                    <span>Amount</span>
                    <span>Status</span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 p-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">
                      {subscription.currentPeriodStart
                        ? new Date(
                            subscription.currentPeriodStart
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '-'}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      {PLANS.find(p => p.id === subscription.planId)?.name ||
                        subscription.planId}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      $
                      {PLANS.find(p => p.id === subscription.planId)?.price ||
                        0}
                    </span>
                    <Badge
                      variant={
                        subscription.status === 'active'
                          ? 'default'
                          : 'secondary'
                      }
                      className={
                        subscription.status === 'active' ? 'bg-green-600' : ''
                      }
                    >
                      Paid
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
                  <p className="text-gray-500 dark:text-gray-400">
                    No billing history yet
                  </p>
                  <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                    Your transaction history will appear here after your first
                    payment
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
