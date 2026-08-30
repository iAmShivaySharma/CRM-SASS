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

interface PlanData {
  id: string
  name: string
  price: number
  interval: string
  description: string
  features: string[]
  limits: Record<string, string | number>
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

const POPULAR_PLAN_ID = 'pro'

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
  const [plans, setPlans] = useState<any[]>([])
  const [currentPlanId, setCurrentPlanId] = useState<string>('free')
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [upgradingPlanId, setUpgradingPlanId] = useState<string | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [billingTab, setBillingTab] = useState('plans')
  const [usage, setUsage] = useState<{
    leads: { used: number; limit: number }
    members: { used: number; limit: number }
  } | null>(null)

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
      if (data.availablePlans?.length > 0) {
        setPlans(data.availablePlans)
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/usage', {
        credentials: 'include',
      })
      if (response.ok) {
        setUsage(await response.json())
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchSubscription()
    fetchUsage()
  }, [fetchSubscription, fetchUsage])

  const handleCancel = async () => {
    if (
      !confirm(
        'Are you sure you want to cancel your subscription? Your plan will remain active until the end of the billing period.'
      )
    ) {
      return
    }
    setIsCancelling(true)
    try {
      const response = await fetch('/api/payments/cancel', {
        method: 'POST',
        credentials: 'include',
      })
      if (response.ok) {
        toast.success('Subscription cancelled successfully')
        fetchSubscription()
      } else {
        const data = await response.json()
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch {
      toast.error('Failed to cancel subscription')
    } finally {
      setIsCancelling(false)
    }
  }

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
      const loaded = await loadRazorpayScript()
      if (!loaded) {
        toast.error('Failed to load payment processor. Please try again.')
        setUpgradingPlanId(null)
        return
      }

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

      const plan = plans.find(p => p.id === planId)

      const options = {
        key: orderData.key,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'ClearCRM',
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

  const currentPlan = plans.find(p => p.id === currentPlanId)

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
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
          Plans & Billing
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your subscription and view usage statistics
        </p>
      </div>

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
              <div className="flex items-center gap-3">
                {subscription.currentPeriodEnd && (
                  <div className="text-right text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {subscription.status === 'cancelled'
                          ? 'Active until'
                          : 'Renews'}{' '}
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
                {currentPlanId !== 'free' &&
                  subscription.status === 'active' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancel}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelling...' : 'Cancel Plan'}
                    </Button>
                  )}
              </div>
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

        <TabsContent value="plans" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map(plan => {
              const isCurrent = plan.id === currentPlanId
              const isDowngrade =
                plans.findIndex(p => p.id === plan.id) <
                plans.findIndex(p => p.id === currentPlanId)
              const isUpgrading = upgradingPlanId === plan.id

              return (
                <Card
                  key={plan.id}
                  className={`relative flex flex-col ${
                    plan.id === POPULAR_PLAN_ID ? 'border-2 border-primary shadow-lg' : ''
                  } ${isCurrent ? 'ring-1 ring-green-500' : ''}`}
                >
                  {plan.id === POPULAR_PLAN_ID && (
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
                      <span className="text-4xl font-bold text-foreground">
                        {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      </span>
                      {plan.price > 0 && (
                        <span className="text-muted-foreground">
                          /{plan.interval}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col">
                    <ul className="mb-6 flex-1 space-y-3">
                      {(plan.features || []).map((feature: string, index: number) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 flex-shrink-0 text-emerald-500" />
                          <span className="text-sm text-foreground">
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      variant={
                        isCurrent
                          ? 'outline'
                          : plan.id === POPULAR_PLAN_ID
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
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      {usage?.leads.limit === -1
                        ? 'Unlimited'
                        : `${usage?.leads.used ?? 0} / ${usage?.leads.limit ?? currentPlan?.limits.leads ?? 100}`}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage?.leads.used ?? 0,
                      usage?.leads.limit === -1
                        ? 1
                        : (usage?.leads.limit ??
                            currentPlan?.limits.leads ??
                            100)
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
                    <span className="text-muted-foreground">Used</span>
                    <span className="font-medium">
                      {usage?.members.limit === -1
                        ? 'Unlimited'
                        : `${usage?.members.used ?? 1} / ${usage?.members.limit ?? currentPlan?.limits.users ?? 2}`}
                    </span>
                  </div>
                  <Progress
                    value={getUsagePercentage(
                      usage?.members.used ?? 1,
                      usage?.members.limit === -1
                        ? 1
                        : (usage?.members.limit ??
                            currentPlan?.limits.users ??
                            2)
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
                    <span className="text-muted-foreground">This month</span>
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
                    <span className="text-muted-foreground">Used</span>
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
                  <div className="grid grid-cols-5 gap-4 border-b bg-muted p-3 text-sm font-medium text-muted-foreground">
                    <span>Date</span>
                    <span>Plan</span>
                    <span>Amount</span>
                    <span>Payment ID</span>
                    <span>Status</span>
                  </div>
                  <div className="grid grid-cols-5 gap-4 border-b p-3 text-sm last:border-0">
                    <span className="text-foreground">
                      {subscription.metadata?.lastPaymentAt
                        ? new Date(
                            subscription.metadata.lastPaymentAt
                          ).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : subscription.currentPeriodStart
                          ? new Date(
                              subscription.currentPeriodStart
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : '-'}
                    </span>
                    <span className="text-foreground">
                      {plans.find(p => p.id === subscription.planId)?.name ||
                        subscription.planId}
                    </span>
                    <span className="font-medium text-foreground">
                      ${((subscription.metadata?.amountPaid || 0) / 100).toFixed(2) !== '0.00'
                        ? ((subscription.metadata?.amountPaid || 0) / 100).toFixed(2)
                        : plans.find(p => p.id === subscription.planId)?.price || 0}
                    </span>
                    <span className="truncate font-mono text-xs text-muted-foreground">
                      {subscription.metadata?.razorpayPaymentId || '-'}
                    </span>
                    <Badge
                      variant={
                        subscription.status === 'active'
                          ? 'default'
                          : subscription.status === 'cancelled'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className={
                        subscription.status === 'active' ? 'bg-emerald-600' : ''
                      }
                    >
                      {subscription.status === 'active' ? 'Paid' : subscription.status === 'cancelled' ? 'Cancelled' : subscription.status}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No billing history yet
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
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
