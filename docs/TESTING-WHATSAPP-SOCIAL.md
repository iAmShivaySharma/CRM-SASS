# WhatsApp & Social Media — Complete Testing Guide

## Prerequisites

- Dev server running: `npm run dev`
- Logged in with a workspace selected
- For WhatsApp: a Meta Business App with WhatsApp Cloud API enabled
- For Social Media: social account credentials (Facebook/Instagram/LinkedIn/Twitter)

---

## Part 1: WhatsApp Complete Flow

### 1.1 Connect WhatsApp Account

#### Option A: Facebook Embedded Signup

1. Navigate to **WhatsApp → Accounts** tab
2. Click **"Connect with Facebook"**
3. Facebook login popup opens
4. Log in and grant permissions (whatsapp_business_management, whatsapp_business_messaging)
5. On success, accounts auto-populate from your Business portfolio

> Requires `NEXT_PUBLIC_META_APP_ID` in `.env`

#### Option B: Manual Token Entry

1. Navigate to **WhatsApp → Accounts** tab
2. Click **"Connect Manually"**
3. Fill in:
   - Display Name: `My Business`
   - Phone Number: `+91XXXXXXXXXX`
   - Phone Number ID: from Meta Developer Console → WhatsApp → API Setup
   - Business Account ID: from Meta Business Suite
   - Access Token: System User Access Token from Meta
   - Webhook Verify Token: any string you choose
4. Toggle **Auto-Reply Bot** ON
5. Set Tone: Professional
6. Set Business Context: `We sell organic skincare products. Free delivery above Rs 500. Open Mon-Sat 10am-7pm.`
7. Click **Connect**

**Verify:** Account appears in list with "Active" badge

### 1.2 Set Up Meta Webhook

1. Go to [Meta Developer Console](https://developers.facebook.com)
2. Select your app → WhatsApp → Configuration
3. Set Callback URL: `https://your-domain.com/api/whatsapp/webhook`
4. Set Verify Token: same as step 1.1 above
5. Subscribe to fields: `messages`, `message_status`
6. Click **Verify and Save**

**Verify:** Meta shows "Webhook verified" green check

### 1.3 Test Inbound Message + AI Auto-Reply

1. Send a WhatsApp message to your business phone number from a personal phone
2. In CRM, go to **WhatsApp → Conversations** tab
3. Conversation should appear in the left sidebar
4. Click it — message thread shows your inbound message
5. If bot is enabled, AI auto-reply should appear as an outbound message
6. Check the reply tone matches what you configured

**Verify:**

- [ ] Inbound message appears in CRM
- [ ] AI auto-reply sent back via WhatsApp
- [ ] Message status updates (sent → delivered → read)

### 1.4 Test Idempotency

1. Same inbound message should not create duplicate entries
2. Check MongoDB: `db.whatsappmessages.find({ waMessageId: "wamid.xxx" })` should return exactly 1 document

### 1.5 Test Conversation State Machine

#### Test AI Mode (default)

1. Send a message to your business number
2. Bot should auto-reply (conversation mode = `ai`)

#### Test Human Handoff

```bash
TOKEN="your-jwt-token"

# Get conversations
curl -s "http://localhost:3000/api/whatsapp/conversations?workspaceId=YOUR_WS_ID" \
  -H "Authorization: Bearer $TOKEN"

# Take over conversation (replace CONV_ID)
curl -s -X POST "http://localhost:3000/api/whatsapp/conversations/CONV_ID/handoff" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "take_over"}'
```

3. Send another message from personal phone
4. Bot should NOT auto-reply (mode is now `human`)
5. CRM should show notification for the assigned agent

#### Release Back to AI

```bash
curl -s -X POST "http://localhost:3000/api/whatsapp/conversations/CONV_ID/handoff" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "release"}'
```

6. Send another message — bot should auto-reply again

**Verify:**

- [ ] Handoff stops AI auto-reply
- [ ] Release resumes AI auto-reply
- [ ] Notification sent to assigned agent during handoff

### 1.6 Test Templates

1. Go to **WhatsApp → Templates** tab
2. Click **"New Template"**
3. Fill:
   - Name: `order_update` (lowercase, underscores only)
   - Category: Utility
   - Language: en
   - Body: `Hi {{1}}, your order {{2}} has been shipped!`
4. Click **Create Template**
5. Click **"Submit to Meta"** on the template card
6. Click **"Sync from Meta"** to refresh status from Meta

**Verify:**

- [ ] Template created with PENDING status
- [ ] After Meta approval, status changes to APPROVED
- [ ] Sync pulls updated statuses

### 1.7 Test Broadcast

1. Go to **WhatsApp → Broadcast** tab
2. Select Account
3. Enter Template Name (must be APPROVED)
4. Enter Language: `en`
5. Add recipients (one phone per line):
   ```
   +919876543210
   +919876543211
   ```
6. Click **Send Broadcast**

**Verify:**

- [ ] Toast shows "Broadcast sent to X recipients"
- [ ] Messages appear in conversation threads

### 1.8 Test Bot Flow Builder

#### Create a Flow

1. Go to **WhatsApp → Bot Flows** tab
2. Click **"Create Bot Flow"**
3. Fill:
   - Name: `Welcome Flow`
   - Account: select your account
   - Trigger Keywords: `hi, hello, hey, start`
4. On the canvas:
   - Click **"Add First Step"**
   - Pick **Send Message** → type: `Welcome! How can I help you today?`
   - Click **"Add Step Below"** → pick **Quick Reply**
   - Set message: `Choose an option:`
   - Add buttons: `Pricing`, `Book Demo`, `Support`
   - Add a step after Pricing → **Send Message**: `Our plans start at $29/month`
   - Add a step after Support → **Assign Human**
   - Add a step after Book Demo → **AI Reply** with tone: Friendly, context: `Help user book a demo meeting`
5. Click **Save**

**Verify:**

- [ ] Flow appears in list with step count
- [ ] Canvas shows nodes with connections
- [ ] Each Quick Reply button creates a separate branch
- [ ] Right panel shows correct fields per node type

#### Edit a Flow

1. Click **Edit** on the flow card
2. Modify a message or add a new step
3. Click **Save**

**Verify:** Changes persist after page reload

#### Toggle Active/Inactive

1. Click **Activate** / **Deactivate** on a flow card
2. Badge updates to Active/Inactive

#### Delete a Flow

1. Click **Delete** on a flow card
2. Flow removed from list

### 1.9 Test Chat Thread

1. Go to **WhatsApp → Conversations**
2. Select a conversation from the left sidebar
3. Type a message in the input → click Send
4. Message appears in thread (right-aligned, outbound)
5. Click the template button → select a template → fill variables → send

**Verify:**

- [ ] Messages send and appear in real-time
- [ ] Status icons update (check, double-check)
- [ ] Template messages send with variables filled

---

## Part 2: Social Media Complete Flow

### 2.1 Connect Social Accounts

1. Navigate to **Social Media** (sidebar → Marketing → Social Media)
2. Go to **Accounts** tab
3. Click **"Connect Account"**
4. Fill:
   - Platform: Facebook
   - Account Name: `My Business Page`
   - Account ID: Page ID from Facebook
   - Access Token: Page Access Token from Graph API Explorer
5. Click **Connect**
6. Repeat for Instagram, LinkedIn, Twitter as needed

**Verify:**

- [ ] Account appears with platform icon and "Active" badge
- [ ] Multiple accounts per platform supported

### 2.2 AI Post Generation

1. Go to **Compose** tab
2. Click **"AI Generate"**
3. Fill:
   - Topic: `New product launch - organic face cream`
   - Tone: Professional
   - Platform: Instagram
   - Brand Name: `Your Brand`
   - Include Hashtags: ON
   - Include Emoji: ON
4. Click **Generate**
5. AI-generated content fills the textarea

**Verify:**

- [ ] Content is platform-appropriate (short for Twitter, longer for LinkedIn)
- [ ] Hashtags included when toggled
- [ ] Tone matches selection

### 2.3 Compose and Schedule a Post

#### Draft Post

1. In Compose tab, write content (or use AI-generated)
2. Select platforms: check Facebook + Instagram
3. Click **"Save Draft"**
4. Go to **Posts** tab → filter "Drafts" → post appears

#### Schedule Post

1. In Compose tab, write content
2. Select platforms
3. Pick schedule date/time (future date)
4. Click **"Schedule"**
5. Go to **Posts** tab → filter "Scheduled" → post appears with scheduled time
6. Go to **Calendar** tab → post appears on the selected date

#### Post Now

1. In Compose tab, write content
2. Select platforms
3. Click **"Post Now"**
4. Post status changes to "publishing" then "published"

**Verify:**

- [ ] Draft saves without schedule
- [ ] Scheduled post appears in calendar on correct date
- [ ] Post Now immediately publishes
- [ ] Status badges correct (draft/scheduled/published)

### 2.4 Per-Platform Content Customization

1. In Compose tab, write main content
2. Select multiple platforms (e.g., Facebook + Twitter + LinkedIn)
3. Click on a platform chip/name to add custom content for that platform
4. Write platform-specific version (e.g., shorter for Twitter)
5. Save/Schedule

**Verify:** Each platform entry in the post has its own `customContent` field

### 2.5 Calendar View

1. Go to **Calendar** tab
2. Navigate months using arrows
3. Scheduled posts appear as previews on their dates
4. Click a post preview → opens edit view
5. Drag between dates (if supported)

**Verify:**

- [ ] Month grid displays correctly
- [ ] Posts show on correct dates
- [ ] Month navigation works

### 2.6 Posts Management

1. Go to **Posts** tab
2. Test filter tabs:
   - **All**: shows everything
   - **Drafts**: only draft posts
   - **Scheduled**: only scheduled posts
   - **Published**: only published posts
   - **Failed**: only failed posts
3. Click **Edit** on a post → modify content → save
4. Click **Delete** on a post → confirm → removed

**Verify:**

- [ ] Filters work correctly
- [ ] Edit persists changes
- [ ] Delete removes post
- [ ] Platform icons show on each card
- [ ] AI-generated posts show AI badge

### 2.7 Disconnect Account

1. Go to **Accounts** tab
2. Click **Disconnect** on an account
3. Account removed from list

---

## Part 3: API Testing (curl)

Replace `TOKEN` and `WS` with your actual values.

```bash
TOKEN="your-jwt-token"
WS="your-workspace-id"
```

### WhatsApp Bot Flows

```bash
# Create bot flow
curl -s -X POST http://localhost:3000/api/whatsapp/bot-flows \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "'$WS'",
    "accountId": "your-account-id",
    "name": "Test Flow",
    "triggerKeywords": ["hi", "hello"],
    "steps": [
      {
        "id": "step-1",
        "type": "send_message",
        "data": { "message": "Welcome!" },
        "position": { "x": 250, "y": 150 },
        "connections": [{ "targetStepId": "step-2" }]
      },
      {
        "id": "step-2",
        "type": "quick_reply",
        "data": {
          "message": "How can I help?",
          "buttons": [
            { "id": "btn-1", "title": "Pricing" },
            { "id": "btn-2", "title": "Support" }
          ]
        },
        "position": { "x": 250, "y": 350 },
        "connections": []
      }
    ]
  }'

# List bot flows
curl -s "http://localhost:3000/api/whatsapp/bot-flows?workspaceId=$WS" \
  -H "Authorization: Bearer $TOKEN"

# Update bot flow (replace FLOW_ID)
curl -s -X PUT "http://localhost:3000/api/whatsapp/bot-flows/FLOW_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Updated Flow", "isActive": true }'

# Delete bot flow
curl -s -X DELETE "http://localhost:3000/api/whatsapp/bot-flows/FLOW_ID?workspaceId=$WS" \
  -H "Authorization: Bearer $TOKEN"
```

### Social Media

```bash
# Connect social account
curl -s -X POST http://localhost:3000/api/social/accounts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "'$WS'",
    "platform": "facebook",
    "accountName": "My Page",
    "accountId": "page-id-123",
    "accessToken": "your-page-access-token"
  }'

# List social accounts
curl -s "http://localhost:3000/api/social/accounts?workspaceId=$WS" \
  -H "Authorization: Bearer $TOKEN"

# AI generate post
curl -s -X POST http://localhost:3000/api/social/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "Summer sale announcement",
    "platform": "instagram",
    "tone": "fun",
    "brandName": "My Brand",
    "includeHashtags": true,
    "includeEmoji": true
  }'

# Create draft post
curl -s -X POST http://localhost:3000/api/social/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "'$WS'",
    "content": "Exciting news! Our summer sale starts tomorrow.",
    "platforms": [
      { "platform": "facebook", "accountId": "page-id-123" },
      { "platform": "instagram", "accountId": "ig-id-456" }
    ],
    "status": "draft"
  }'

# Create scheduled post
curl -s -X POST http://localhost:3000/api/social/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "workspaceId": "'$WS'",
    "content": "Check out our latest collection!",
    "platforms": [
      { "platform": "linkedin", "accountId": "li-id-789" }
    ],
    "scheduledAt": "2026-09-10T10:00:00.000Z"
  }'

# List posts (with filters)
curl -s "http://localhost:3000/api/social/posts?workspaceId=$WS" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:3000/api/social/posts?workspaceId=$WS&status=scheduled" \
  -H "Authorization: Bearer $TOKEN"

curl -s "http://localhost:3000/api/social/posts?workspaceId=$WS&status=draft&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"

# Update post (replace POST_ID)
curl -s -X PUT "http://localhost:3000/api/social/posts/POST_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "content": "Updated content!", "status": "draft" }'

# Delete post
curl -s -X DELETE "http://localhost:3000/api/social/posts/POST_ID?workspaceId=$WS" \
  -H "Authorization: Bearer $TOKEN"

# Disconnect account (replace ACCOUNT_ID)
curl -s -X DELETE "http://localhost:3000/api/social/accounts?id=ACCOUNT_ID&workspaceId=$WS" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Checklist Summary

### WhatsApp

- [ ] Account connected (Facebook or Manual)
- [ ] Meta webhook verified
- [ ] Inbound messages received in CRM
- [ ] AI auto-reply works when bot enabled
- [ ] Idempotency: no duplicate messages
- [ ] Human handoff stops AI, release resumes AI
- [ ] Templates: create, submit, sync, broadcast
- [ ] Bot flow: create with canvas, multiple node types, branching
- [ ] Bot flow: edit, activate/deactivate, delete
- [ ] Chat thread: send messages, send templates

### Social Media

- [ ] Accounts: connect, list, disconnect
- [ ] AI generate: topic → platform-specific content
- [ ] Compose: write, select platforms, save draft
- [ ] Schedule: pick date/time, post appears in calendar
- [ ] Calendar: month view, posts on correct dates
- [ ] Posts: filter by status, edit, delete
- [ ] Per-platform content customization
