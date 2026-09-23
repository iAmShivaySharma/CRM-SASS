import { Cashfree, CFEnvironment } from 'cashfree-pg'

function getCashfreeClient() {
  const appId = process.env.CASHFREE_APP_ID
  const secretKey = process.env.CASHFREE_SECRET_KEY

  if (!appId || !secretKey) {
    throw new Error('CASHFREE_APP_ID and CASHFREE_SECRET_KEY must be set')
  }

  const env =
    process.env.NODE_ENV === 'production'
      ? CFEnvironment.PRODUCTION
      : CFEnvironment.SANDBOX

  return new Cashfree(env, appId, secretKey)
}

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
  returnUrl: string
  notifyUrl: string
}

export async function createCashfreeOrder(options: CreateOrderOptions) {
  const cf = getCashfreeClient()

  const orderId =
    options.orderId ||
    `order_${Date.now()}_${Math.random().toString(36).substring(7)}`

  const request = {
    order_amount: options.amount,
    order_currency: options.currency || 'INR',
    order_id: orderId,
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

  const response = await cf.PGCreateOrder(request)
  const data = response?.data

  if (!data?.payment_session_id) {
    throw new Error('Failed to create Cashfree order')
  }

  return {
    orderId: data.order_id,
    paymentSessionId: data.payment_session_id,
    orderStatus: data.order_status,
  }
}

export async function verifyCashfreePayment(orderId: string) {
  const cf = getCashfreeClient()

  const response = await cf.PGOrderFetchPayments(orderId)
  const payments = response?.data

  if (!payments || payments.length === 0) {
    return { success: false, error: 'No payments found' }
  }

  const payment = payments[0]

  if (payment.payment_status === 'SUCCESS') {
    return {
      success: true,
      paymentId: payment.cf_payment_id?.toString(),
      amount: payment.payment_amount,
      paymentMethod: payment.payment_group,
    }
  }

  return {
    success: false,
    error: payment.payment_message || 'Payment not successful',
    status: payment.payment_status,
  }
}

export function verifyCashfreeWebhook(
  rawBody: string,
  signature: string,
  timestamp: string
) {
  const cf = getCashfreeClient()

  try {
    const result = cf.PGVerifyWebhookSignature(signature, rawBody, timestamp)
    return { valid: true, event: result }
  } catch {
    return { valid: false, event: null }
  }
}

export async function createCashfreeSubscription(
  options: CreateSubscriptionOptions
) {
  const cf = getCashfreeClient()

  const request = {
    subscription_id: options.subscriptionId,
    customer_details: {
      customer_email: options.customerEmail,
      customer_phone: options.customerPhone,
      customer_name: options.customerName,
    },
    plan_details: {
      plan_id: options.planId,
    },
    subscription_meta: {
      return_url: options.returnUrl,
      notification_url: options.notifyUrl,
    },
  }

  const response = await cf.SubsCreateSubscription(request as any)
  const data = response?.data

  return {
    subscriptionId: data?.subscription_id,
    authorizationLink: (data as any)?.authorization_link,
    status: data?.subscription_status,
  }
}

export async function cancelCashfreeSubscription(subscriptionId: string) {
  const cf = getCashfreeClient()

  const response = await cf.SubsManageSubscription(subscriptionId, {
    subscription_id: subscriptionId,
    action: 'CANCEL',
  } as any)

  return { success: true, data: response?.data }
}

export async function getCashfreeSubscription(subscriptionId: string) {
  const cf = getCashfreeClient()

  const response = await cf.SubsFetchSubscription(subscriptionId)
  return response?.data
}

export async function createCashfreePlan(params: {
  planId: string
  planName: string
  amount: number
  intervalType: 'MONTH' | 'YEAR' | 'WEEK' | 'DAY'
  intervals: number
  maxCycles?: number
}) {
  const cf = getCashfreeClient()

  const request = {
    plan_id: params.planId,
    plan_name: params.planName,
    plan_type: 'PERIODIC' as const,
    plan_recurring_amount: params.amount,
    plan_max_cycles: params.maxCycles || 12,
    plan_interval_type: params.intervalType,
    plan_intervals: params.intervals,
    plan_currency: 'INR',
  }

  const response = await cf.SubsCreatePlan(request as any)
  return response?.data
}
