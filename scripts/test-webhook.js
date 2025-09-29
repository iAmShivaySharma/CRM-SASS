#!/usr/bin/env node

/**
 * Webhook Testing Script
 *
 * This script helps you test webhooks in your CRM system.
 *
 * Usage:
 *   node scripts/test-webhook.js [webhook-id] [options]
 *
 * Examples:
 *   node scripts/test-webhook.js abc123
 *   node scripts/test-webhook.js abc123 --type facebook
 *   node scripts/test-webhook.js abc123 --custom '{"name":"John","email":"john@test.com"}'
 */

const https = require('https')
const http = require('http')
const crypto = require('crypto')

// Configuration
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const WEBHOOK_ID = process.argv[2]

// Command line arguments
const args = process.argv.slice(3)
const getArg = flag => {
  const index = args.indexOf(flag)
  return index !== -1 && args[index + 1] ? args[index + 1] : null
}

const webhookType = getArg('--type') || 'custom'
const customPayload = getArg('--custom')
const useSignature = args.includes('--signature')
const verbose = args.includes('--verbose')

// Test payloads for different webhook types
const TEST_PAYLOADS = {
  custom: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    company: 'Acme Corp',
    source: 'website',
    value: 5000,
    status: 'new',
    notes: 'Interested in premium plan',
    custom_fields: {
      utm_source: 'google',
      utm_campaign: 'summer2024',
      lead_score: '85',
      industry: 'technology',
    },
  },

  facebook: {
    object: 'page',
    entry: [
      {
        id: 'page-id-123',
        time: Math.floor(Date.now() / 1000),
        changes: [
          {
            field: 'leadgen',
            value: {
              leadgen_id: 'lead-123',
              page_id: 'page-id-123',
              form_id: 'form-123',
              adgroup_id: 'adgroup-123',
              ad_id: 'ad-123',
              created_time: Math.floor(Date.now() / 1000),
            },
          },
        ],
      },
    ],
  },

  zapier: {
    full_name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1987654321',
    company: 'Tech Solutions Inc',
    source: 'zapier',
    lead_value: 7500,
    custom_data: {
      industry: 'technology',
      employees: '50-100',
      budget: '10000-25000',
    },
  },

  google_forms: {
    formResponse: {
      answers: {
        name: 'Mike Johnson',
        email: 'mike.johnson@example.com',
        phone: '+1555123456',
        company: 'Johnson & Associates',
        interest: 'Enterprise Solution',
      },
      responseId: 'response-' + Date.now(),
      timestamp: new Date().toISOString(),
    },
  },

  swipepages: {
    email: 'john@doe.com',
    phone: '1234567890',
    company: 'Swipe Pages',
    city: 'New York City',
    name: 'John',
    role: 'Full Stack Dev',
    budget: '10k-25k',
    utm_source: 'google',
    utm_campaign: 'landing-page-test',
    form_name: 'Contact Form',
    landing_page: 'https://example.swipepages.com/contact',
    message: 'Interested in your services',
  },
}

function showUsage() {
  console.log(`
🔗 Webhook Testing Script

Usage:
  node scripts/test-webhook.js <webhook-id> [options]

Options:
  --type <type>        Webhook type: custom, facebook, zapier, google_forms (default: custom)
  --custom <json>      Custom JSON payload
  --signature          Include webhook signature (requires webhook secret)
  --verbose            Show detailed output
  --help               Show this help

Examples:
  node scripts/test-webhook.js abc123
  node scripts/test-webhook.js abc123 --type facebook
  node scripts/test-webhook.js abc123 --custom '{"name":"John","email":"john@test.com"}'
  node scripts/test-webhook.js abc123 --signature --verbose

Available webhook types:
  - custom: Generic lead data
  - facebook: Facebook Lead Ads format
  - zapier: Zapier webhook format
  - google_forms: Google Forms response format
  - swipepages: SwipePages landing page format
`)
}

function generateSignature(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex')
}

async function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.request(url, options, res => {
      let responseData = ''

      res.on('data', chunk => {
        responseData += chunk
      })

      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData)
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonResponse,
          })
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: responseData,
          })
        }
      })
    })

    req.on('error', reject)

    if (data) {
      req.write(data)
    }

    req.end()
  })
}

async function testWebhook() {
  if (!WEBHOOK_ID) {
    showUsage()
    process.exit(1)
  }

  if (args.includes('--help')) {
    showUsage()
    process.exit(0)
  }

  console.log('🔗 Testing Webhook...')
  console.log(`📍 Webhook ID: ${WEBHOOK_ID}`)
  console.log(`🎯 Type: ${webhookType}`)
  console.log(`🌐 Base URL: ${BASE_URL}`)
  console.log('')

  // Prepare payload
  let payload
  if (customPayload) {
    try {
      payload = JSON.parse(customPayload)
      console.log('📦 Using custom payload')
    } catch (e) {
      console.error('❌ Invalid JSON in custom payload:', e.message)
      process.exit(1)
    }
  } else {
    payload = TEST_PAYLOADS[webhookType]
    if (!payload) {
      console.error(`❌ Unknown webhook type: ${webhookType}`)
      console.log('Available types:', Object.keys(TEST_PAYLOADS).join(', '))
      process.exit(1)
    }
    console.log(`📦 Using ${webhookType} test payload`)
  }

  const payloadString = JSON.stringify(payload, null, 2)

  if (verbose) {
    console.log('📄 Payload:')
    console.log(payloadString)
    console.log('')
  }

  // Prepare request
  const webhookUrl = `${BASE_URL}/api/webhooks/receive/${WEBHOOK_ID}`
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': `WebhookTester/1.0 (${webhookType})`,
    'Content-Length': Buffer.byteLength(payloadString),
  }

  // Add signature if requested
  if (useSignature) {
    const secret = process.env.WEBHOOK_SECRET || 'test-secret'
    const signature = generateSignature(payloadString, secret)
    headers['X-Webhook-Signature'] = `sha256=${signature}`
    console.log('🔐 Including webhook signature')
  }

  console.log('🚀 Sending request...')

  try {
    const startTime = Date.now()
    const response = await makeRequest(
      webhookUrl,
      {
        method: 'POST',
        headers,
      },
      payloadString
    )

    const duration = Date.now() - startTime

    console.log('')
    console.log('📊 Response:')
    console.log(`   Status: ${response.status}`)
    console.log(`   Duration: ${duration}ms`)

    if (verbose) {
      console.log('   Headers:', JSON.stringify(response.headers, null, 2))
    }

    console.log('   Body:')
    console.log('  ', JSON.stringify(response.data, null, 2))

    // Status interpretation
    if (response.status === 200) {
      console.log('')
      console.log('✅ Webhook test successful!')

      if (response.data.leadId) {
        console.log(`📝 Lead created with ID: ${response.data.leadId}`)
      }

      console.log('')
      console.log('🎯 Next steps:')
      console.log('   1. Check your CRM dashboard for the new lead')
      console.log('   2. Verify all fields were populated correctly')
      console.log('   3. Test with different payload formats')
    } else if (response.status === 404) {
      console.log('')
      console.log('❌ Webhook not found')
      console.log('   - Check if the webhook ID is correct')
      console.log('   - Ensure the webhook exists and is active')
    } else if (response.status === 401) {
      console.log('')
      console.log('❌ Unauthorized')
      console.log('   - Check webhook signature if using --signature')
      console.log('   - Verify webhook secret is correct')
    } else if (response.status === 400) {
      console.log('')
      console.log('❌ Bad Request')
      console.log('   - Check payload format')
      console.log('   - Verify required fields are present')
    } else {
      console.log('')
      console.log('❌ Unexpected response')
      console.log('   - Check server logs for more details')
    }
  } catch (error) {
    console.log('')
    console.log('❌ Request failed:', error.message)

    if (error.code === 'ECONNREFUSED') {
      console.log('   - Make sure your server is running')
      console.log('   - Check if the URL is correct')
    }
  }
}

// Run the test
testWebhook().catch(console.error)
