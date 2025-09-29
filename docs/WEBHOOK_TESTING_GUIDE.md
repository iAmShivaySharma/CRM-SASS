# 🔗 Webhook Testing Guide

## Overview

This guide shows you how to test webhooks in your CRM system to ensure they properly receive and process lead data from external sources.

## 🚀 Quick Start

### 1. Create a Webhook in the CRM

1. **Navigate to Webhooks** (if webhook management UI exists)
   - Or use the API directly to create a webhook

2. **Create Webhook via API**:

```bash
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "name": "Test Lead Webhook",
    "description": "Testing webhook for lead capture",
    "webhookType": "custom",
    "events": ["lead.created"]
  }'
```

3. **Response will include**:

```json
{
  "success": true,
  "webhook": {
    "id": "webhook-id-here",
    "webhookUrl": "http://localhost:3000/api/webhooks/receive/webhook-id-here",
    "secret": "your-webhook-secret"
  }
}
```

## 🧪 Testing Methods

### Method 1: Using cURL (Recommended)

```bash
# Basic lead webhook test
curl -X POST http://localhost:3000/api/webhooks/receive/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -H "User-Agent: TestClient/1.0" \
  -d '{
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+1234567890",
    "company": "Acme Corp",
    "source": "website",
    "value": 5000,
    "status": "new",
    "notes": "Interested in premium plan",
    "custom_fields": {
      "utm_source": "google",
      "utm_campaign": "summer2024",
      "lead_score": "85"
    }
  }'
```

### Method 2: Using Postman

1. **Create New Request**
   - Method: `POST`
   - URL: `http://localhost:3000/api/webhooks/receive/YOUR_WEBHOOK_ID`

2. **Headers**:

   ```
   Content-Type: application/json
   User-Agent: PostmanTest/1.0
   ```

3. **Body** (raw JSON):
   ```json
   {
     "name": "Jane Smith",
     "email": "jane.smith@example.com",
     "phone": "+1987654321",
     "company": "Tech Solutions Inc",
     "source": "facebook",
     "value": 7500,
     "status": "qualified",
     "notes": "Looking for enterprise solution",
     "custom_fields": {
       "industry": "technology",
       "employees": "50-100",
       "budget": "10000-25000"
     }
   }
   ```

### Method 3: Using Node.js Script

Create `test-webhook.js`:

```javascript
const fetch = require('node-fetch')

async function testWebhook() {
  const webhookUrl =
    'http://localhost:3000/api/webhooks/receive/YOUR_WEBHOOK_ID'

  const testData = {
    name: 'Test Lead',
    email: 'test@example.com',
    phone: '+1555123456',
    company: 'Test Company',
    source: 'api_test',
    value: 1000,
    custom_fields: {
      test_field: 'test_value',
      priority: 'high',
    },
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'NodeTest/1.0',
      },
      body: JSON.stringify(testData),
    })

    const result = await response.json()
    console.log('Status:', response.status)
    console.log('Response:', result)
  } catch (error) {
    console.error('Error:', error)
  }
}

testWebhook()
```

Run with: `node test-webhook.js`

## 🔍 Verification Steps

### 1. Check Webhook Logs

```bash
# Get webhook details and recent logs
curl -X GET http://localhost:3000/api/webhooks/YOUR_WEBHOOK_ID \
  -H "Cookie: your-auth-cookie"
```

### 2. Verify Lead Creation

1. Go to your CRM dashboard
2. Navigate to Leads page
3. Look for the test lead you just created
4. Check that all fields are populated correctly
5. Verify custom fields are saved

### 3. Check Database (if you have access)

```javascript
// In MongoDB shell or Node.js
db.leads.find().sort({ createdAt: -1 }).limit(5)
```

## 🎯 Different Webhook Types

### Facebook Leads Format

```json
{
  "object": "page",
  "entry": [
    {
      "id": "page-id",
      "time": 1234567890,
      "changes": [
        {
          "field": "leadgen",
          "value": {
            "leadgen_id": "lead-id",
            "page_id": "page-id",
            "form_id": "form-id",
            "adgroup_id": "adgroup-id",
            "ad_id": "ad-id",
            "created_time": 1234567890
          }
        }
      ]
    }
  ]
}
```

### Google Forms Format

```json
{
  "formResponse": {
    "answers": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890"
    },
    "responseId": "response-id",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Zapier Format

```json
{
  "full_name": "John Doe",
  "email": "john@example.com",
  "phone": "+1234567890",
  "company": "Acme Corp",
  "source": "zapier",
  "custom_data": {
    "utm_source": "google",
    "utm_medium": "cpc"
  }
}
```

### SwipePages Format

```json
{
  "email": "john@doe.com",
  "phone": "1234567890",
  "company": "Swipe Pages",
  "city": "New York City",
  "name": "John",
  "role": "Full Stack Dev",
  "budget": "10k-25k",
  "utm_source": "google",
  "utm_campaign": "landing-page-test",
  "form_name": "Contact Form",
  "landing_page": "https://example.swipepages.com/contact",
  "message": "Interested in your services"
}
```

## 🔐 Testing with Webhook Signatures

If your webhook has a secret, test with signature verification:

```bash
# Generate signature (in Node.js)
const crypto = require('crypto');
const body = JSON.stringify(yourPayload);
const secret = 'your-webhook-secret';
const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

# Then include in request
curl -X POST http://localhost:3000/api/webhooks/receive/YOUR_WEBHOOK_ID \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=${signature}" \
  -d '{"your": "payload"}'
```

## 🐛 Troubleshooting

### Common Issues:

1. **404 Not Found**
   - Check webhook ID is correct
   - Ensure webhook exists and is active

2. **401 Unauthorized**
   - Webhook signature mismatch
   - Check secret and signature generation

3. **400 Bad Request**
   - Invalid JSON format
   - Missing required fields
   - Data validation failed

4. **500 Internal Server Error**
   - Database connection issues
   - Processing error in webhook handler

### Debug Steps:

1. **Check webhook status**:

   ```bash
   curl -X GET http://localhost:3000/api/webhooks/YOUR_WEBHOOK_ID
   ```

2. **View recent logs**:
   - Logs are included in webhook details response
   - Check `recentLogs` array for error messages

3. **Test simple payload first**:

   ```json
   {
     "name": "Test",
     "email": "test@example.com"
   }
   ```

4. **Check server logs**:
   - Look at your Next.js console output
   - Check for MongoDB connection errors

## 📊 Expected Response Formats

### Success Response (200):

```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "leadId": "created-lead-id",
  "processingTime": 150
}
```

### Error Response (400/401/500):

```json
{
  "error": "Error description",
  "details": "Additional error details"
}
```

## 🎉 Next Steps

After successful webhook testing:

1. **Set up real integrations** (Facebook, Google Forms, etc.)
2. **Configure transformation rules** for different data formats
3. **Set up monitoring** for webhook failures
4. **Test error handling** and retry mechanisms
5. **Scale testing** with multiple concurrent requests

## 📞 Support

If webhooks aren't working:

1. Check the webhook logs in your CRM
2. Verify your webhook URL is accessible
3. Test with the simplest possible payload first
4. Check server logs for detailed error messages
