# TeleCMI Telephony Integration Plan

## Why
ClearCRM needs built-in calling so employees can click-to-call leads/contacts directly from the CRM dashboard. TeleCMI provides the telephony API. Each workspace connects their own TeleCMI account, employees make calls, and all call logs + recordings are automatically linked to leads/contacts.

---

## TeleCMI API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://rest.telecmi.com/v2/token` | POST | Get admin token (30d expiry) with `appid` + `secret` |
| `https://rest.telecmi.com/v2/webrtc/click2call` | POST | Admin click-to-call with `user_id`, `secret`, `to`, `callerid` |
| `https://rest.telecmi.com/v2/click2call` | POST | User click-to-call with `token`, `to` |
| Webhook (CDR) | POST (incoming) | TeleCMI sends call records to our endpoint |

### CDR Webhook Fields
`cmiuuid`, `direction` (inbound/outbound), `from`, `to`, `status`, `answeredsec`, `hangup_reason`, `record` (boolean), `filename`, `user`, `team`, `conversation_uuid`, `time`, `virtual_number`, `appid`

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    ClearCRM Frontend                  │
│                                                     │
│  Settings/Integrations    LeadSheet    ContactDetail │
│  ┌──────────────────┐  ┌───────────┐  ┌───────────┐ │
│  │ TelecmiSettings  │  │ ClickTo   │  │ ClickTo   │ │
│  │ - Connect form   │  │ CallBtn   │  │ CallBtn   │ │
│  │ - Status badge   │  │ CallLog   │  │ CallLog   │ │
│  │ - Webhook URL    │  │ Panel     │  │ Panel     │ │
│  └──────────────────┘  └───────────┘  └───────────┘ │
│           │                  │              │        │
│           ▼                  ▼              ▼        │
│  ┌──────────────────────────────────────────────┐   │
│  │          RTK Query: telecmiApi.ts             │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│                   ClearCRM Backend                    │
│                                                     │
│  API Routes                                         │
│  ├── /api/telecmi/account      (GET/POST/DELETE)    │
│  ├── /api/telecmi/account/test (POST)               │
│  ├── /api/telecmi/call         (POST)               │
│  ├── /api/telecmi/calls        (GET)                │
│  ├── /api/telecmi/calls/[id]   (GET)                │
│  └── /api/webhooks/telecmi/[workspaceId] (POST)     │
│           │                          ▲              │
│           ▼                          │              │
│  ┌────────────────┐    ┌─────────────┴──────┐       │
│  │ TelecmiService │    │ CDR Webhook Handler│       │
│  │ - token mgmt   │    │ - parse CDR        │       │
│  │ - call init    │    │ - match phone→lead │       │
│  │ - log calls    │    │ - create CallLog   │       │
│  └───────┬────────┘    └────────────────────┘       │
│          │                                          │
│          ▼                                          │
│  ┌────────────────┐                                 │
│  │ TelecmiClient  │──────► TeleCMI REST API         │
│  │ - getToken()   │                                 │
│  │ - clickToCall()│                                 │
│  └────────────────┘                                 │
│                                                     │
│  MongoDB Models                                     │
│  ├── TelecmiAccount (encrypted creds per workspace) │
│  └── CallLog (linked to Lead/Contact)               │
└─────────────────────────────────────────────────────┘
```

---

## Phase 1 — Foundation (Models + Client + Service)

### 1.1 TelecmiAccount Model
**File:** `lib/mongodb/models/TelecmiAccount.ts`

Stores per-workspace TeleCMI credentials using AES-256-GCM encryption (same pattern as `CustomerApiKey` and `EmailAccount`).

| Field | Type | Description |
|-------|------|-------------|
| `workspaceId` | ObjectId (unique, indexed) | Workspace this account belongs to |
| `encryptedAppId` | String | AES-256-GCM encrypted App ID |
| `encryptedAppSecret` | String | AES-256-GCM encrypted App Secret |
| `encryptedAdminToken` | String | Encrypted 30-day admin token |
| `adminTokenExpiresAt` | Date | Token expiry for auto-refresh |
| `isActive` | Boolean | Whether integration is active |
| `connectionStatus` | Enum | `connected` / `disconnected` / `error` / `testing` |
| `defaultCallerId` | String | Default outbound caller ID |
| `connectedBy` | ObjectId (ref User) | Who set up the connection |
| `stats.totalCalls` | Number | Total calls made |
| `stats.lastCallAt` | Date | Last call timestamp |

**Methods:**
- `setAppCredentials(appId, appSecret)` — encrypts and stores
- `getAppCredentials()` — decrypts and returns `{ appId, appSecret }`
- `setAdminToken(token, expiresIn)` — encrypts token, sets expiry
- `getAdminToken()` — decrypts and returns
- `isAdminTokenExpired()` — checks expiry

### 1.2 CallLog Model
**File:** `lib/mongodb/models/CallLog.ts`

| Field | Type | Description |
|-------|------|-------------|
| `workspaceId` | ObjectId (indexed) | Workspace |
| `cmiuuid` | String (unique) | TeleCMI call UUID |
| `conversationUuid` | String | TeleCMI conversation UUID |
| `direction` | Enum | `inbound` / `outbound` |
| `from` | String | Caller number |
| `to` | String | Called number |
| `status` | String | answered, missed, busy, failed |
| `duration` | Number | Duration in seconds |
| `hangupReason` | String | Why call ended |
| `recordingUrl` | String | Recording file URL |
| `recordingFilename` | String | Recording filename |
| `telecmiUser` | String | TeleCMI user who handled call |
| `telecmiTeam` | String | TeleCMI team |
| `leadId` | ObjectId (ref Lead, indexed) | Auto-linked lead |
| `contactId` | ObjectId (ref Contact, indexed) | Auto-linked contact |
| `initiatedBy` | ObjectId (ref User) | CRM user who clicked call |
| `callStartedAt` | Date | Call start time |

**Indexes:** `(workspaceId, createdAt DESC)`, `(cmiuuid)` unique, `(leadId, createdAt DESC)`, `(contactId, createdAt DESC)`

### 1.3 TeleCMI API Client
**File:** `lib/telecmi/client.ts`

Follows `lib/n8n/client.ts` pattern.

```
TelecmiClient
├── getAdminToken(appId, appSecret) → { secret, expiresIn }
├── clickToCall(secret, userId, to, callerId?, options?) → { code, msg, request_id }
└── private request(endpoint, options) → response
```

### 1.4 TeleCMI Service
**File:** `lib/services/telecmiService.ts`

```
TelecmiService
├── getWorkspaceAccount(workspaceId) → TelecmiAccount | null
├── ensureValidToken(workspaceId) → adminToken (auto-refreshes if expired)
├── initiateCall(workspaceId, userId, toNumber, leadId?, contactId?) → CallLog
├── processCdrWebhook(workspaceId, cdrPayload) → CallLog
├── getCallLogs(workspaceId, filters) → { calls, total, page }
├── getCallLogsForLead(leadId) → CallLog[]
└── getCallLogsForContact(contactId) → CallLog[]
```

### 1.5 Phone Utils
**File:** `lib/telecmi/phoneUtils.ts`

- `normalizePhone(phone)` — strips `+`, country codes, spaces, dashes → consistent format
- `matchPhoneToLead(workspaceId, phone)` — queries `Lead.findOne({ workspaceId, phone: regex })`
- `matchPhoneToContact(workspaceId, phone)` — queries `Contact.findOne({ workspaceId, phone: regex })`

### 1.6 Modified Files
| File | Change |
|------|--------|
| `lib/mongodb/models/index.ts` | Export `TelecmiAccount` + `CallLog` |

---

## Phase 2 — API Routes

### 2.1 Account Management
**File:** `app/api/telecmi/account/route.ts`

| Method | Action |
|--------|--------|
| `GET` | Return connection status (no secrets exposed) |
| `POST` | Connect: accepts `{ appId, appSecret }`, validates via `/v2/token`, encrypts + stores, returns status |
| `DELETE` | Disconnect: deactivates account |

### 2.2 Test Connection
**File:** `app/api/telecmi/account/test/route.ts`

| Method | Action |
|--------|--------|
| `POST` | Tests stored credentials by calling `/v2/token`, returns success/failure |

### 2.3 Click-to-Call
**File:** `app/api/telecmi/call/route.ts`

| Method | Action |
|--------|--------|
| `POST` | Body: `{ to, leadId?, contactId?, callerId? }`. Initiates call via TeleCMI. Creates CallLog. Returns call UUID. |

### 2.4 Call Logs
**File:** `app/api/telecmi/calls/route.ts`

| Method | Action |
|--------|--------|
| `GET` | List call logs. Query: `leadId`, `contactId`, `direction`, `page`, `limit`, `from`, `to` (date range) |

**File:** `app/api/telecmi/calls/[id]/route.ts`

| Method | Action |
|--------|--------|
| `GET` | Single call log with full detail |

### 2.5 CDR Webhook Receiver
**File:** `app/api/webhooks/telecmi/[workspaceId]/route.ts`

**No auth middleware** (external webhook). Flow:
1. Receive TeleCMI CDR POST
2. Validate workspace has active TeleCMI account
3. Upsert `CallLog` by `cmiuuid`
4. Normalize phone → match to `Lead.phone` or `Contact.phone`
5. If lead matched: update `Lead.lastContactedAt`, create activity log
6. Update account stats
7. Return `200 OK`

---

## Phase 3 — Frontend (API Slice + Settings)

### 3.1 RTK Query Slice
**File:** `lib/api/telecmiApi.ts`

| Endpoint | Type | Route |
|----------|------|-------|
| `getTelecmiStatus` | Query | `GET /api/telecmi/account` |
| `connectTelecmi` | Mutation | `POST /api/telecmi/account` |
| `disconnectTelecmi` | Mutation | `DELETE /api/telecmi/account` |
| `testConnection` | Mutation | `POST /api/telecmi/account/test` |
| `initiateCall` | Mutation | `POST /api/telecmi/call` |
| `getCallLogs` | Query | `GET /api/telecmi/calls` |
| `getCallLog` | Query | `GET /api/telecmi/calls/:id` |

### 3.2 TeleCMI Settings Component
**File:** `components/settings/TelecmiSettings.tsx`

**Disconnected state:**
- Card with TeleCMI logo + description
- Form: App ID input + App Secret input
- "Connect" button → calls `connectTelecmi`
- Link to TeleCMI dashboard to get credentials

**Connected state:**
- Status badge (green: connected)
- Masked credentials preview
- Webhook URL to configure in TeleCMI: `{APP_URL}/api/webhooks/telecmi/{workspaceId}`
- Default Caller ID input
- "Test Connection" button
- "Disconnect" button (destructive)
- Stats: total calls, last call time

### 3.3 Modified Files
| File | Change |
|------|--------|
| `app/(dashboard)/settings/page.tsx` | Add 7th "Integrations" tab rendering `TelecmiSettings` |
| `lib/store.ts` | Register `telecmiApi` reducer + middleware |

---

## Phase 4 — Call UI Components

### 4.1 ClickToCallButton
**File:** `components/telecmi/ClickToCallButton.tsx`

Props: `phoneNumber`, `leadId?`, `contactId?`, `variant?: 'icon' | 'button'`

- `icon` variant: small Phone icon button (for list rows)
- `button` variant: full button with "Call" text
- Disabled with tooltip if TeleCMI not connected
- Shows toast on success/failure
- Loading state during call initiation

### 4.2 CallLogPanel
**File:** `components/telecmi/CallLogPanel.tsx`

Props: `leadId?`, `contactId?`

List of call logs showing:
- Direction icon (↙ inbound / ↗ outbound)
- Phone number
- Status badge (answered/missed/busy)
- Duration (mm:ss format)
- Timestamp (relative)
- Play button if recording exists

### 4.3 CallRecordingPlayer
**File:** `components/telecmi/CallRecordingPlayer.tsx`

Props: `recordingUrl`, `filename?`

Inline HTML5 audio player with play/pause, progress bar, duration display.

### 4.4 Modified Files
| File | Change |
|------|--------|
| `components/leads/LeadDetailsSheet.tsx` | Add `ClickToCallButton` next to phone field + `CallLogPanel` card section |
| `components/contacts/ContactDetail.tsx` | Same — `ClickToCallButton` + `CallLogPanel` |

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TELECMI_ENCRYPTION_SECRET` | 64-char hex string for encrypting TeleCMI credentials (fallback to `API_KEY_ENCRYPTION_SECRET`) |

No global TeleCMI credentials needed — each workspace stores its own.

---

## File Summary

### New Files (17)
```
lib/mongodb/models/TelecmiAccount.ts
lib/mongodb/models/CallLog.ts
lib/telecmi/client.ts
lib/telecmi/phoneUtils.ts
lib/services/telecmiService.ts
lib/api/telecmiApi.ts
app/api/telecmi/account/route.ts
app/api/telecmi/account/test/route.ts
app/api/telecmi/call/route.ts
app/api/telecmi/calls/route.ts
app/api/telecmi/calls/[id]/route.ts
app/api/webhooks/telecmi/[workspaceId]/route.ts
components/settings/TelecmiSettings.tsx
components/telecmi/ClickToCallButton.tsx
components/telecmi/CallLogPanel.tsx
components/telecmi/CallRecordingPlayer.tsx
```

### Modified Files (5)
```
lib/mongodb/models/index.ts          — export new models
lib/store.ts                         — register telecmiApi
app/(dashboard)/settings/page.tsx    — add Integrations tab
components/leads/LeadDetailsSheet.tsx — add call button + log panel
components/contacts/ContactDetail.tsx — add call button + log panel
```

---

## Testing Checklist

- [ ] Connect TeleCMI in Settings → credentials stored encrypted in DB
- [ ] Test Connection button → validates against TeleCMI API
- [ ] Click call on lead with phone → call initiates, CallLog created
- [ ] Simulate CDR webhook POST → CallLog created, linked to matching lead
- [ ] Lead detail sheet → call history panel shows all calls
- [ ] Recording play button → audio plays inline
- [ ] Disconnect → account deactivated, buttons disabled
- [ ] Multi-workspace → each workspace has independent TeleCMI config
- [ ] Token auto-refresh → expired token gets refreshed before call
