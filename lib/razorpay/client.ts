import crypto from 'crypto'
import Razorpay from 'razorpay'

function safeTimingSafeEqual(a: string, b: string): boolean {
  const bufA = new Uint8Array(Buffer.from(a))
  const bufB = new Uint8Array(Buffer.from(b))
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

let razorpayInstance: Razorpay | null = null

function getRazorpay(): Razorpay {
  if (!razorpayInstance) {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    })
  }
  return razorpayInstance
}

export interface CreateOrderOptions {
  amount: number
  currency?: string
  receipt?: string
  notes?: Record<string, string>
}

export interface CreateSubscriptionOptions {
  planId: string
  totalCount?: number
  quantity?: number
  customerNotify?: boolean
  notes?: Record<string, string>
}

export async function createOrder(options: CreateOrderOptions) {
  const order = await getRazorpay().orders.create({
    amount: options.amount,
    currency: options.currency || 'INR',
    receipt: options.receipt || `rcpt_${Date.now()}`,
    notes: options.notes || {},
  })
  return order
}

export async function createSubscription(options: CreateSubscriptionOptions) {
  const subscription = await getRazorpay().subscriptions.create({
    plan_id: options.planId,
    total_count: options.totalCount || 12,
    quantity: options.quantity || 1,
    customer_notify: options.customerNotify ? 1 : 0,
    notes: options.notes || {},
  })
  return subscription
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  try {
    return safeTimingSafeEqual(signature, expectedSignature)
  } catch {
    return false
  }
}

export function verifySubscriptionSignature(
  subscriptionId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${paymentId}|${subscriptionId}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest('hex')

  try {
    return safeTimingSafeEqual(signature, expectedSignature)
  } catch {
    return false
  }
}

export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  try {
    return safeTimingSafeEqual(signature, expectedSignature)
  } catch {
    return false
  }
}

export async function getSubscription(subscriptionId: string) {
  const subscription = await getRazorpay().subscriptions.fetch(subscriptionId)
  return subscription
}

export async function cancelSubscription(
  subscriptionId: string,
  cancelAtEnd: boolean = true
) {
  const subscription = await getRazorpay().subscriptions.cancel(
    subscriptionId,
    cancelAtEnd
  )
  return subscription
}

export async function createPlan(
  name: string,
  period: 'monthly' | 'yearly',
  interval: number,
  amount: number,
  currency: string = 'INR',
  description?: string
) {
  const plan = await getRazorpay().plans.create({
    period: period,
    interval: interval,
    item: {
      name: name,
      amount: amount,
      currency: currency,
      description: description || name,
    },
  })
  return plan
}

export async function getPayment(paymentId: string) {
  const payment = await getRazorpay().payments.fetch(paymentId)
  return payment
}

export { getRazorpay }
