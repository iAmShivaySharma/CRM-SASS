// Dodo Payments Integration
// Documentation: https://docs.dodopayments.com/

interface DodoConfig {
  apiKey: string
  publicKey: string
  webhookSecret: string
  baseUrl: string
}

class DodoPayments {
  private config: DodoConfig

  constructor(config: DodoConfig) {
    this.config = config
  }

  // Create customer
  async createCustomer(data: {
    email: string
    name: string
    metadata?: Record<string, any>
  }) {
    try {
      const response = await fetch(`${this.config.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Dodo API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating Dodo customer:', error)
      throw error
    }
  }

  // Create subscription
  async createSubscription(data: {
    customer_id: string
    price_id: string
    metadata?: Record<string, any>
  }) {
    try {
      const response = await fetch(`${this.config.baseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error(`Dodo API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error creating Dodo subscription:', error)
      throw error
    }
  }

  // Get subscription
  async getSubscription(subscriptionId: string) {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/subscriptions/${subscriptionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Dodo API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching Dodo subscription:', error)
      throw error
    }
  }

  // Cancel subscription
  async cancelSubscription(subscriptionId: string) {
    try {
      const response = await fetch(
        `${this.config.baseUrl}/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Dodo API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error canceling Dodo subscription:', error)
      throw error
    }
  }

  // Get prices
  async getPrices() {
    try {
      const response = await fetch(`${this.config.baseUrl}/prices`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Dodo API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error fetching Dodo prices:', error)
      throw error
    }
  }

  // Verify webhook signature
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const crypto = require('crypto')
      const expectedSignature = crypto
        .createHmac('sha256', this.config.webhookSecret)
        .update(payload)
        .digest('hex')

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch (error) {
      console.error('Error verifying webhook signature:', error)
      return false
    }
  }
}

// Initialize Dodo client
export const dodoPayments = new DodoPayments({
  apiKey: process.env.DODO_API_KEY!,
  publicKey: process.env.NEXT_PUBLIC_DODO_PUBLIC_KEY!,
  webhookSecret: process.env.DODO_WEBHOOK_SECRET!,
  baseUrl: 'https://api.dodopayments.com/v1', // Update with actual Dodo API URL
})

// Types for Dodo Payments
export interface DodoCustomer {
  id: string
  email: string
  name: string
  created_at: string
  metadata: Record<string, any>
}

export interface DodoSubscription {
  id: string
  customer_id: string
  price_id: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing'
  current_period_start: string
  current_period_end: string
  trial_end?: string
  canceled_at?: string
  created_at: string
  metadata: Record<string, any>
}

export interface DodoPrice {
  id: string
  product_id: string
  amount: number
  currency: string
  interval: 'month' | 'year'
  interval_count: number
  created_at: string
}

export interface DodoWebhookEvent {
  id: string
  type: string
  data: {
    object: DodoCustomer | DodoSubscription | any
  }
  created_at: string
}
