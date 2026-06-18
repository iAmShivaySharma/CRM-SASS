import Razorpay from 'razorpay'
import crypto from 'crypto'

// Razorpay client singleton
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export interface CreateOrderOptions {
  amount: number // in paise (INR smallest unit)
  currency?: string
  receipt?: string
  notes?: Record<string, string>
}

export interface CreateSubscriptionOptions {
  planId: string // Razorpay plan ID
  totalCount?: number
  quantity?: number
  customerNotify?: boolean
  notes?: Record<string, string>
}

/**
 * Create a one-time payment order
 */
export async function createOrder(options: CreateOrderOptions) {
  const order = await razorpayInstance.orders.create({
    amount: options.amount,
    currency: options.currency || 'INR',
    receipt: options.receipt || `rcpt_${Date.now()}`,
    notes: options.notes || {},
  })
  return order
}

/**
 * Create a recurring subscription
 */
export async function createSubscription(options: CreateSubscriptionOptions) {
  const subscription = await razorpayInstance.subscriptions.create({
    plan_id: options.planId,
    total_count: options.totalCount || 12,
    quantity: options.quantity || 1,
    customer_notify: options.customerNotify ? 1 : 0,
    notes: options.notes || {},
  })
  return subscription
}

/**
 * Verify payment signature using HMAC SHA256
 * Used after one-time payment checkout
 */
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
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Verify subscription payment signature
 * Used after subscription checkout
 */
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
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Verify webhook signature from Razorpay
 */
export function verifyWebhookSignature(
  body: string,
  signature: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )
  } catch {
    return false
  }
}

/**
 * Get subscription details from Razorpay
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await razorpayInstance.subscriptions.fetch(subscriptionId)
  return subscription
}

/**
 * Cancel a subscription on Razorpay
 * @param cancelAtEnd - if true, cancels at end of current billing period
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtEnd: boolean = true
) {
  const subscription = await razorpayInstance.subscriptions.cancel(
    subscriptionId,
    cancelAtEnd
  )
  return subscription
}

/**
 * Create a plan on Razorpay for recurring billing
 */
export async function createPlan(
  name: string,
  period: 'monthly' | 'yearly',
  interval: number,
  amount: number,
  currency: string = 'INR',
  description?: string
) {
  const plan = await razorpayInstance.plans.create({
    period: period,
    interval: interval,
    item: {
      name: name,
      amount: amount, // in paise
      currency: currency,
      description: description || name,
    },
  })
  return plan
}

/**
 * Fetch payment details
 */
export async function getPayment(paymentId: string) {
  const payment = await razorpayInstance.payments.fetch(paymentId)
  return payment
}

export { razorpayInstance }
