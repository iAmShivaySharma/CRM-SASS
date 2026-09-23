import { Cashfree } from 'cashfree-pg'

Cashfree.XClientId = process.env.CASHFREE_APP_ID!
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY!
Cashfree.XEnvironment =
  process.env.NODE_ENV === 'production'
    ? Cashfree.Environment.PRODUCTION
    : Cashfree.Environment.SANDBOX

const API_VERSION = '2023-08-01'

export interface CreateOrderOptions {
  amount: number
  currency?: string
  orderId?: string
  customerDetails: {
    customerId: string
    customerEmail: string
    customerPhone?: string
    customerName: string
  }
  returnUrl: string
  notifyUrl: string
  orderNote?: string
}

export interface CreateSubscriptionOptions {
  subscriptionId: string
  planId: string
  customerEmail: string
  customerPhone: string
  customerName: string
  returnUrl?: string
  notifyUrl?: string
}

export async function createOrder(options: CreateOrderOptions) {
  const request = {
    order_amount: options.amount,
    order_currency: options.currency || 'INR',
    order_id: options.orderId || `order_${Date.now()}`,
    customer_details: {
      customer_id: options.customerDetails.customerId,
      customer_email: options.customerDetails.customerEmail,
      customer_phone: options.customerDetails.customerPhone || '9999999999',
      customer_name: options.customerDetails.customerName,
    },
    order_meta: {
      return_url: options.returnUrl,
      notify_url: options.notifyUrl,
    },
    order_note: options.orderNote,
  }

  const response = await Cashfree.PGCreateOrder(API_VERSION, request)
  return response.data
}

export async function verifyPayment(orderId: string) {
  const response = await Cashfree.PGOrderFetchPayments(API_VERSION, orderId)
  return response.data
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  try {
    Cashfree.PGVerifyWebhookSignature(rawBody, signature, timestamp)
    return true
  } catch {
    return false
  }
}

export async function createSubscription(options: CreateSubscriptionOptions) {
  const response = await (Cashfree as any).subs.createSubscription({
    subscription_id: options.subscriptionId,
    plan_id: options.planId,
    customer_details: {
      customer_email: options.customerEmail,
      customer_phone: options.customerPhone,
      customer_name: options.customerName,
    },
    return_url: options.returnUrl,
    notification_url: options.notifyUrl,
  })
  return response.data
}

export async function cancelSubscription(subscriptionId: string) {
  const response = await (Cashfree as any).subs.cancelSubscription({
    subscription_id: subscriptionId,
  })
  return response.data
}

export async function getSubscription(subscriptionId: string) {
  const response = await (Cashfree as any).subs.fetchSubscription({
    subscription_id: subscriptionId,
  })
  return response.data
}

export async function createPlan(
  planId: string,
  planName: string,
  amount: number,
  intervalType: 'MONTH' | 'YEAR' = 'MONTH',
  intervals: number = 1,
  maxCycles: number = 12
) {
  const response = await (Cashfree as any).subs.createPlan({
    plan_id: planId,
    plan_name: planName,
    plan_type: 'PERIODIC',
    plan_recurring_amount: amount,
    plan_max_cycles: maxCycles,
    plan_interval_type: intervalType,
    plan_intervals: intervals,
  })
  return response.data
}
