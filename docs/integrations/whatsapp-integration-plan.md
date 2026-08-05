# WhatsApp Business Cloud API Integration Plan

## Why
ClearCRM needs built-in WhatsApp messaging so employees can chat with leads/contacts directly from the CRM. Each workspace connects their own WhatsApp Business account via Meta Cloud API. Messages are sent/received inline, linked to leads/contacts, with template support for outbound campaigns.

---

## WhatsApp Cloud API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://graph.facebook.com/v23.0/{phoneNumberId}/messages` | POST | Send messages (text, image, video, document, template, interactive) |
| Webhook (incoming) | POST | Receive messages, delivery/read receipts, status updates |
| `https://graph.facebook.com/v23.0/{phoneNumberId}` | GET | Get phone number info |
| `https://graph.facebook.com/v23.0/{businessAccountId}/message_templates` | GET | List approved templates |

### Authentication
- **Access Token**: Permanent system user token from Meta Business Settings
- **Required Permissions**: `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`
- **Header**: `Authorization: Bearer {ACCESS_TOKEN}`

### Message Types Supported
- Text, Image, Video, Document, Audio, Sticker, Location, Contacts
- Interactive: Reply Buttons (up to 3), List Messages, CTA URL Buttons
- Template Messages (pre-approved by Meta, required for initiating conversations)
- Reaction Messages (emoji reactions)

### Webhook Events
- `messages` — incoming messages from customers
- `statuses` — sent, delivered, read, failed receipts
- `errors` — delivery failures

### 24-Hour Window Rule
- **Template messages**: Can be sent anytime (must be pre-approved by Meta)
- **Service messages** (free-form text, media, interactive): Only within 24 hours of the customer's last message
- After 24 hours with no customer reply, only template messages are allowed

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    ClearCRM Frontend                      │
│                                                         │
│  Settings/Integrations   LeadSheet     WhatsApp Inbox   │
│  ┌──────────────────┐  ┌───────────┐  ┌──────────────┐ │
│  │ WhatsAppSettings │  │ WhatsApp  │  │ Conversation │ │
│  │ - Connect form   │  │ ChatBtn   │  │ List + Chat  │ │
│  │ - Phone number   │  │           │  │ Thread View  │ │
│  │ - Templates      │  │           │  │              │ │
│  └──────────────────┘  └───────────┘  └──────────────┘ │
│           │                  │              │           │
│           ▼                  ▼              ▼           │
│  ┌──────────────────────────────────────────────────┐   │
│  │          RTK Query: whatsappApi.ts                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│                   ClearCRM Backend                        │
│                                                         │
│  API Routes                                             │
│  ├── /api/whatsapp/account         (GET/POST/DELETE)    │
│  ├── /api/whatsapp/account/test    (POST)               │
│  ├── /api/whatsapp/send            (POST)               │
│  ├── /api/whatsapp/templates       (GET)                │
│  ├── /api/whatsapp/conversations   (GET)                │
│  ├── /api/whatsapp/conversations/[id] (GET)             │
│  └── /api/webhooks/whatsapp/[workspaceId] (GET/POST)    │
│           │                          ▲                  │
│           ▼                          │                  │
│  ┌─────────────────┐   ┌────────────┴───────────┐      │
│  │ WhatsAppService  │   │ Webhook Handler        │      │
│  │ - send message   │   │ - verify (GET)         │      │
│  │ - fetch templates│   │ - receive message(POST)│      │
│  │ - manage convos  │   │ - match phone→lead     │      │
│  └────────┬─────────┘   └──────────────────────-─┘      │
│           │                                             │
│           ▼                                             │
│  ┌─────────────────┐                                    │
│  │ WhatsAppClient   │──────► Meta Graph API              │
│  │ - sendMessage()  │                                    │
│  │ - getTemplates() │                                    │
│  │ - getPhoneInfo() │                                    │
│  └─────────────────┘                                    │
│                                                         │
│  MongoDB Models                                         │
│  ├── WhatsAppAccount (encrypted token per workspace)    │
│  ├── WhatsAppConversation (thread per phone number)     │
│  └── WhatsAppMessage (individual messages)              │
└─────────────────────────────────────────────────────────┘
```

---

## Phase 1 — Foundation (Models + Client + Service)

### 1.1 WhatsAppAccount Model
**File:** `lib/mongodb/models/WhatsAppAccount.ts`

Per-workspace WhatsApp Business credentials. AES-256-GCM encryption.

| Field | Type | Description |
|-------|------|-------------|
| `workspaceId` | ObjectId (unique, indexed) | Workspace |
| `encryptedAccessToken` | String | Encrypted permanent access token |
| `phoneNumberId` | String | Meta phone number ID |
| `businessAccountId` | String | WhatsApp Business Account ID |
| `displayPhoneNumber` | String | Display phone number (e.g., +91 98xxx) |
| `businessName` | String | Business display name |
| `webhookVerifyToken` | String | Random token for webhook verification |
| `isActive` | Boolean | Whether integration is active |
| `connectionStatus` | Enum | `connected` / `disconnected` / `error` |
| `connectedBy` | ObjectId (ref User) | Who set up the connection |
| `stats.messagesSent` | Number | Total messages sent |
| `stats.messagesReceived` | Number | Total messages received |
| `stats.lastMessageAt` | Date | Last message timestamp |

**Methods:**
- `setAccessToken(token)` — encrypts and stores
- `getAccessToken()` — decrypts and returns
- `generateWebhookVerifyToken()` — creates random verify token

### 1.2 WhatsAppConversation Model
**File:** `lib/mongodb/models/WhatsAppConversation.ts`

One conversation per unique phone number per workspace.

| Field | Type | Description |
|-------|------|-------------|
| `workspaceId` | ObjectId (indexed) | Workspace |
| `waId` | String (indexed) | Customer's WhatsApp ID (phone number) |
| `customerPhone` | String | Formatted phone number |
| `customerName` | String | Profile name from WhatsApp |
| `leadId` | ObjectId (ref Lead, indexed) | Auto-linked lead |
| `contactId` | ObjectId (ref Contact, indexed) | Auto-linked contact |
| `assignedTo` | ObjectId (ref User) | Assigned agent |
| `status` | Enum | `active` / `closed` / `expired` |
| `lastMessageAt` | Date | Last message timestamp |
| `lastMessagePreview` | String | Truncated last message |
| `lastMessageDirection` | Enum | `inbound` / `outbound` |
| `serviceWindowExpiresAt` | Date | 24-hour window expiry |
| `unreadCount` | Number | Unread message count |
| `tags` | [String] | Conversation tags |

**Indexes:** `(workspaceId, lastMessageAt DESC)`, `(workspaceId, waId)` unique, `(leadId)`, `(contactId)`, `(assignedTo, status)`

### 1.3 WhatsAppMessage Model
**File:** `lib/mongodb/models/WhatsAppMessage.ts`

Individual messages within a conversation.

| Field | Type | Description |
|-------|------|-------------|
| `conversationId` | ObjectId (ref WhatsAppConversation, indexed) | Parent conversation |
| `workspaceId` | ObjectId (indexed) | Workspace |
| `wamId` | String (unique) | WhatsApp message ID |
| `direction` | Enum | `inbound` / `outbound` |
| `type` | Enum | `text` / `image` / `video` / `document` / `audio` / `sticker` / `location` / `contacts` / `interactive` / `template` / `reaction` |
| `content` | Mixed | Message content based on type |
| `content.text` | String | Text body (for text messages) |
| `content.caption` | String | Media caption |
| `content.mediaUrl` | String | Media download URL |
| `content.mediaId` | String | Meta media ID |
| `content.mimeType` | String | Media MIME type |
| `content.filename` | String | Document filename |
| `content.latitude` | Number | Location lat |
| `content.longitude` | Number | Location lng |
| `content.templateName` | String | Template name (for template messages) |
| `content.buttons` | [Object] | Interactive button data |
| `status` | Enum | `sent` / `delivered` / `read` / `failed` |
| `statusUpdatedAt` | Date | Last status update |
| `errorCode` | Number | Error code if failed |
| `errorMessage` | String | Error details |
| `sentBy` | ObjectId (ref User) | CRM user who sent (outbound only) |
| `replyToWamId` | String | Quoted message ID |
| `timestamp` | Date | Message timestamp |

**Indexes:** `(conversationId, timestamp)`, `(wamId)` unique, `(workspaceId, timestamp DESC)`

### 1.4 WhatsApp API Client
**File:** `lib/whatsapp/client.ts`

```
WhatsAppClient
├── constructor(accessToken, phoneNumberId)
├── sendTextMessage(to, text, replyToId?) → { messages: [{ id }] }
├── sendTemplateMessage(to, templateName, languageCode, components?) → response
├── sendImageMessage(to, imageUrl, caption?) → response
├── sendDocumentMessage(to, documentUrl, filename, caption?) → response
├── sendVideoMessage(to, videoUrl, caption?) → response
├── sendAudioMessage(to, audioUrl) → response
├── sendLocationMessage(to, lat, lng, name?, address?) → response
├── sendInteractiveButtons(to, bodyText, buttons[]) → response
├── sendInteractiveList(to, bodyText, sections[]) → response
├── sendReaction(to, messageId, emoji) → response
├── markAsRead(messageId) → response
├── getTemplates(businessAccountId) → templates[]
├── getPhoneNumberInfo() → { display_phone_number, verified_name }
└── private request(endpoint, body) → response
```

### 1.5 WhatsApp Service
**File:** `lib/services/whatsappService.ts`

```
WhatsAppService
├── getWorkspaceAccount(workspaceId) → WhatsAppAccount | null
├── sendMessage(workspaceId, userId, to, type, content) → WhatsAppMessage
├── sendTemplate(workspaceId, userId, to, templateName, params) → WhatsAppMessage
├── processIncomingWebhook(workspaceId, webhookPayload) → void
│   ├── findOrCreateConversation(workspaceId, waId, customerName)
│   ├── createMessage(conversation, messageData)
│   ├── matchPhoneToLeadOrContact(workspaceId, phone)
│   └── updateConversationLastMessage()
├── processStatusWebhook(workspaceId, statusPayload) → void
│   └── updateMessageStatus(wamId, status)
├── getConversations(workspaceId, filters) → paginated list
├── getConversationMessages(conversationId, page) → paginated messages
├── getConversationsForLead(leadId) → conversations
├── getConversationsForContact(contactId) → conversations
├── getTemplates(workspaceId) → templates[]
├── isInServiceWindow(conversation) → boolean
└── assignConversation(conversationId, userId) → void
```

---

## Phase 2 — API Routes

### 2.1 Account Management
**File:** `app/api/whatsapp/account/route.ts`

| Method | Action |
|--------|--------|
| `GET` | Return connection status + display phone number (no token exposed) |
| `POST` | Connect: accepts `{ accessToken, phoneNumberId, businessAccountId }`, validates via Graph API, stores encrypted, returns status |
| `DELETE` | Disconnect: deactivates account |

### 2.2 Test Connection
**File:** `app/api/whatsapp/account/test/route.ts`

| Method | Action |
|--------|--------|
| `POST` | Tests stored token by calling Graph API `GET /{phoneNumberId}`, returns phone info or error |

### 2.3 Send Message
**File:** `app/api/whatsapp/send/route.ts`

| Method | Action |
|--------|--------|
| `POST` | Body: `{ to, type, content, conversationId?, leadId?, contactId?, replyToWamId? }`. Sends via Graph API. Creates/updates conversation + message. Returns message record. |

### 2.4 Templates
**File:** `app/api/whatsapp/templates/route.ts`

| Method | Action |
|--------|--------|
| `GET` | Fetches approved templates from Meta Graph API for the workspace |

### 2.5 Conversations
**File:** `app/api/whatsapp/conversations/route.ts`

| Method | Action |
|--------|--------|
| `GET` | List conversations. Query: `leadId`, `contactId`, `status`, `assignedTo`, `page`, `limit` |

**File:** `app/api/whatsapp/conversations/[id]/route.ts`

| Method | Action |
|--------|--------|
| `GET` | Conversation detail with paginated messages |
| `PATCH` | Update: assign agent, change status, add tags |

### 2.6 Webhook Receiver
**File:** `app/api/webhooks/whatsapp/[workspaceId]/route.ts`

| Method | Action |
|--------|--------|
| `GET` | **Webhook verification**: Meta sends `hub.mode`, `hub.verify_token`, `hub.challenge`. Verify token matches stored `webhookVerifyToken`, return `hub.challenge`. |
| `POST` | **Receive events**: Parse `entry[].changes[].value`. Handle `messages` (incoming), `statuses` (delivery/read receipts). Match phone → lead/contact. Create conversation + message. Emit socket event for real-time UI. Return 200. |

---

## Phase 3 — Frontend (API Slice + Settings)

### 3.1 RTK Query Slice
**File:** `lib/api/whatsappApi.ts`

| Endpoint | Type | Route |
|----------|------|-------|
| `getWhatsappStatus` | Query | `GET /api/whatsapp/account` |
| `connectWhatsapp` | Mutation | `POST /api/whatsapp/account` |
| `disconnectWhatsapp` | Mutation | `DELETE /api/whatsapp/account` |
| `testWhatsappConnection` | Mutation | `POST /api/whatsapp/account/test` |
| `sendWhatsappMessage` | Mutation | `POST /api/whatsapp/send` |
| `getTemplates` | Query | `GET /api/whatsapp/templates` |
| `getConversations` | Query | `GET /api/whatsapp/conversations` |
| `getConversation` | Query | `GET /api/whatsapp/conversations/:id` |

### 3.2 WhatsApp Settings Component
**File:** `components/settings/WhatsAppSettings.tsx`

**Disconnected state:**
- Card with WhatsApp Business logo + description
- Form: Access Token, Phone Number ID, Business Account ID inputs
- "Connect" button
- Setup guide link to Meta Business Manager

**Connected state:**
- Status badge (green: connected)
- Display phone number + business name
- Webhook URL: `{APP_URL}/api/webhooks/whatsapp/{workspaceId}`
- Webhook Verify Token (copyable)
- "Test Connection" button
- "Disconnect" button
- Stats: messages sent, received, last message time

### 3.3 Modified Files
| File | Change |
|------|--------|
| `app/(dashboard)/settings/page.tsx` | Add WhatsApp card inside Integrations tab (alongside TeleCMI) |
| `lib/store.ts` | Register `whatsappApi` reducer + middleware |

---

## Phase 4 — Chat UI Components

### 4.1 WhatsApp Chat Button
**File:** `components/whatsapp/WhatsAppChatButton.tsx`

Props: `phoneNumber`, `leadId?`, `contactId?`, `variant?: 'icon' | 'button'`

- Opens WhatsApp conversation panel or initiates new conversation
- Disabled if WhatsApp not connected
- Shows green WhatsApp icon

### 4.2 WhatsApp Inbox Page
**File:** `app/(dashboard)/whatsapp/page.tsx`

Full-page WhatsApp inbox with two-panel layout:
- **Left panel**: Conversation list (search, filter by status/assignee, unread badge)
- **Right panel**: Chat thread (message bubbles, input bar, template picker)

### 4.3 Conversation List
**File:** `components/whatsapp/ConversationList.tsx`

- List of conversations sorted by last message
- Each row: customer name/phone, last message preview, timestamp, unread badge
- Search by name/phone
- Filter by: assigned to me, unassigned, all
- Click to open conversation

### 4.4 Chat Thread
**File:** `components/whatsapp/ChatThread.tsx`

- Message bubbles (inbound left gray, outbound right primary)
- Support all message types: text, image, video, document, audio, location
- Status indicators: sent ✓, delivered ✓✓, read ✓✓ (blue)
- Reply-to (quote) support
- Linked lead/contact info at top
- 24-hour window warning banner when window is expiring/expired

### 4.5 Message Input
**File:** `components/whatsapp/MessageInput.tsx`

- Text input with send button
- Attachment button (image, document, video, audio)
- Template picker button (opens modal with approved templates)
- Emoji picker
- Reply-to indicator
- Disabled with "Send template" prompt when outside 24-hour window

### 4.6 Template Picker
**File:** `components/whatsapp/TemplatePicker.tsx`

- Modal listing approved templates
- Search/filter by category
- Template preview with parameter placeholders
- Fill parameters form
- Send button

### 4.7 WhatsApp Message Panel (for Lead/Contact detail)
**File:** `components/whatsapp/WhatsAppMessagePanel.tsx`

Props: `leadId?`, `contactId?`

Compact version of chat thread for embedding in LeadDetailsSheet / ContactDetail. Shows recent messages + "Open in WhatsApp Inbox" link.

### 4.8 Modified Files
| File | Change |
|------|--------|
| `components/leads/LeadDetailsSheet.tsx` | Add `WhatsAppChatButton` + `WhatsAppMessagePanel` |
| `components/contacts/ContactDetail.tsx` | Same |
| `components/layout/Sidebar.tsx` | Add "WhatsApp" nav item under communication section |

---

## Phase 5 — Real-Time Updates

### Socket Events
Add to `server/socket-server.js`:

| Event | Direction | Purpose |
|-------|-----------|---------|
| `whatsapp:new-message` | Server → Client | New incoming WhatsApp message |
| `whatsapp:status-update` | Server → Client | Message delivery/read receipt |
| `whatsapp:new-conversation` | Server → Client | New conversation started |

When webhook receives a message:
1. Process and store in DB
2. Emit socket event to workspace room
3. Frontend updates conversation list + thread in real-time

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `WHATSAPP_ENCRYPTION_SECRET` | 64-char hex for encrypting WhatsApp tokens (fallback to `API_KEY_ENCRYPTION_SECRET`) |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Global fallback verify token (optional, per-workspace preferred) |

---

## File Summary

### New Files (20)
```
lib/mongodb/models/WhatsAppAccount.ts
lib/mongodb/models/WhatsAppConversation.ts
lib/mongodb/models/WhatsAppMessage.ts
lib/whatsapp/client.ts
lib/services/whatsappService.ts
lib/api/whatsappApi.ts
app/api/whatsapp/account/route.ts
app/api/whatsapp/account/test/route.ts
app/api/whatsapp/send/route.ts
app/api/whatsapp/templates/route.ts
app/api/whatsapp/conversations/route.ts
app/api/whatsapp/conversations/[id]/route.ts
app/api/webhooks/whatsapp/[workspaceId]/route.ts
app/(dashboard)/whatsapp/page.tsx
components/settings/WhatsAppSettings.tsx
components/whatsapp/WhatsAppChatButton.tsx
components/whatsapp/ConversationList.tsx
components/whatsapp/ChatThread.tsx
components/whatsapp/MessageInput.tsx
components/whatsapp/TemplatePicker.tsx
components/whatsapp/WhatsAppMessagePanel.tsx
```

### Modified Files (6)
```
lib/mongodb/models/index.ts              — export new models
lib/store.ts                             — register whatsappApi
app/(dashboard)/settings/page.tsx        — add WhatsApp to Integrations tab
components/leads/LeadDetailsSheet.tsx     — add WhatsApp button + message panel
components/contacts/ContactDetail.tsx     — add WhatsApp button + message panel
components/layout/Sidebar.tsx            — add WhatsApp nav item
server/socket-server.js                  — add WhatsApp socket events
```

---

## 24-Hour Window Handling

| Scenario | Allowed Message Types | UI Behavior |
|----------|----------------------|-------------|
| Customer messaged < 24h ago | All types (text, media, interactive) | Full message input enabled |
| Customer messaged > 24h ago | Template messages only | Input disabled, "Send Template" button shown |
| No prior conversation | Template messages only | Template picker opens first |

---

## Testing Checklist

- [ ] Connect WhatsApp in Settings → token stored encrypted
- [ ] Test Connection → validates against Meta Graph API
- [ ] Send text message to a number → delivered via WhatsApp
- [ ] Send template message → delivered with parameters filled
- [ ] Send image/document → media uploaded and sent
- [ ] Receive incoming message → webhook creates conversation + message
- [ ] Incoming message auto-links to lead by phone match
- [ ] Real-time: new message appears in inbox without refresh
- [ ] Delivery/read receipts update message status
- [ ] 24-hour window: input disables after expiry, shows template option
- [ ] LeadDetailsSheet shows WhatsApp chat button + recent messages
- [ ] Multiple workspaces → independent WhatsApp accounts
- [ ] Disconnect → account deactivated, buttons disabled

---

## Sources
- [WhatsApp Cloud API Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Send Messages Guide](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-messages/)
- [Messages API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages/)
- [Webhooks Overview](https://developers.facebook.com/documentation/business-messaging/whatsapp/webhooks/overview)
- [Template Fundamentals](https://developers.facebook.com/documentation/business-messaging/whatsapp/templates/overview)
