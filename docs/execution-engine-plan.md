# Execution Engine — Architecture & Improvement Plan

## Current State Summary

The execution engine integrates with **n8n** (self-hosted) via REST API to run automated workflows. It supports:

- Workflow catalog sync from n8n
- Execute workflows with customer or platform API keys
- Multi-step workflows with pause/resume via webhooks
- Customer API key management (AES-256-GCM encrypted)
- Usage/cost tracking per execution, key, and workflow

### Architecture

```
[CRM Frontend] → [Next.js API Routes] → [n8n REST API] → [Workflow Execution]
                                      ↕
                              [MongoDB Models]
                    (WorkflowCatalog, WorkflowExecution,
                     CustomerApiKey, UserInput)
```

### What's Working

| Layer                                | Status                                |
| ------------------------------------ | ------------------------------------- |
| n8n API client (`lib/n8n/client.ts`) | Full REST wrapper, 814 lines          |
| Workflow sync (`lib/n8n/sync.ts`)    | Auto-sync with category mapping       |
| Execute endpoint                     | Customer/platform keys, dynamic input |
| Pause/resume via webhooks            | Multi-step with timeout               |
| API key encryption                   | AES-256-GCM                           |
| MongoDB models                       | 5 models, proper indexes              |
| RTK Query API                        | 45 endpoints                          |
| Frontend catalog page                | Working with real API                 |

### What's Broken/Missing

| Issue                                  | Impact                                       | Severity |
| -------------------------------------- | -------------------------------------------- | -------- |
| **Input form page DOES NOT EXIST**     | Users get 404 when trying to provide input   | BLOCKER  |
| **PendingInputsModal not integrated**  | Users don't see pending input requests       | BLOCKER  |
| **No RTK Query hooks for input**       | No `submitInput` or `getPendingInputs` hooks | BLOCKER  |
| API keys page uses **mock data**       | Users can't manage keys in UI                | HIGH     |
| Executions page uses **mock data**     | Users can't see real history                 | HIGH     |
| Webhook URL uses timestamp (guessable) | Security risk on public webhook              | MEDIUM   |
| No webhook retry logic                 | Failed deliveries lost                       | MEDIUM   |
| No execution cancellation              | Can't stop running workflows                 | MEDIUM   |
| Only OpenRouter provider               | Limited AI model support                     | LOW      |
| 5-second polling (not real-time)       | Slow UX for long workflows                   | LOW      |
| n8n not in docker-compose              | Manual setup required                        | LOW      |

### User Input Flow — Current State

```
Workflow pauses → UserInput record created → User clicks "Provide Input"
                                                      ↓
                                              ❌ 404 PAGE NOT FOUND
                                     /engines/executions/[id]/input
                                          (page never created)
```

**Backend is production-ready** — validation, resume, timeout, multi-step all work.
**Frontend is broken** — no page to enter input, no hooks to submit it.

#### What Needs to Be Built

1. **Input form page:** `app/(dashboard)/engines/executions/[id]/input/page.tsx`
   - GET `/api/engines/executions/[id]/input` to fetch schema
   - Render dynamic form from inputSchema (string, number, select, textarea, file)
   - POST `/api/engines/executions/[id]/input` to submit
   - Show validation errors, timeout countdown, success state

2. **RTK Query hooks in `lib/api/enginesApi.ts`:**
   - `getExecutionInput` — fetch input requirement for an execution
   - `submitExecutionInput` — submit user's input data
   - `getPendingInputs` — list all pending inputs for user

3. **Dashboard integration:**
   - Add pending inputs indicator/badge to engines page header
   - Show PendingInputsModal when there are active inputs
   - Notification bell integration for input-required alerts

4. **Webhook URL security:**
   - Replace timestamp-based URL with crypto.randomUUID()
   - Add HMAC signature verification for webhook payloads

---

## Improvement Plan

### Phase 1: Fix User Input Flow (BLOCKER)

**Priority: CRITICAL — Users cannot provide input to paused workflows**

#### 1.1 Create Input Form Page

**Create:** `app/(dashboard)/engines/executions/[id]/input/page.tsx`

This is the most critical missing piece. The page must:

- Fetch input requirement via GET `/api/engines/executions/[id]/input`
- Show workflow name, step description, timeout countdown
- Dynamically render form fields from `inputSchema`:
  - `string` → Input or Textarea (for message/content fields)
  - `number` → Number input with min/max
  - `select` → Dropdown from options
  - `boolean` → Checkbox
  - `array` → Multi-select or tag input
  - `file` → File upload
- Validate client-side before submission
- POST to `/api/engines/executions/[id]/input`
- Show success state or redirect to execution details
- Handle expired/already-submitted states gracefully

#### 1.2 Add RTK Query Hooks for Input

**File:** `lib/api/enginesApi.ts`

Add missing endpoints:

```typescript
getExecutionInput: query({ executionId }) → GET /api/engines/executions/[id]/input
submitExecutionInput: mutation({ executionId, inputData }) → POST /api/engines/executions/[id]/input
getPendingInputs: query({ limit?, priority? }) → GET /api/engines/input/pending
```

#### 1.3 Integrate PendingInputsModal

- Import and render `PendingInputsModal` in engines page
- Add pending inputs badge/indicator to engines page header
- Show count of pending inputs with urgency coloring

#### 1.4 Fix Webhook URL Security

**File:** `lib/n8n/client.ts`

Replace:

```typescript
// BEFORE (guessable)
;`${workflowId}-step-${step}-${Date.now()}`
// AFTER (secure)
`${workflowId}-${crypto.randomUUID()}`
```

### Phase 2: Wire Mock Pages to Real APIs

**Priority: HIGH — Pages exist but show fake data**

#### 2.1 Fix API Keys Page

**File:** `app/(dashboard)/engines/api-keys/page.tsx`

Replace mock data with RTK Query hooks:

- `useGetApiKeysQuery()` for listing keys
- `useCreateApiKeyMutation()` for adding
- `useUpdateApiKeyMutation()` for edit/set-default
- `useDeleteApiKeyMutation()` for removal
- `useValidateApiKeyMutation()` for testing

These hooks already exist in `lib/api/enginesApi.ts` — just need to wire them.

#### 2.2 Fix Executions Page

**File:** `app/(dashboard)/engines/executions/page.tsx`

Replace mock data with:

- `useGetExecutionsQuery()` for listing
- `useGetExecutionQuery()` for details
- Real status badges, duration, cost from API

#### 2.3 Fix Pending Inputs Integration

Wire `PendingInputsModal` to `useGetPendingInputsQuery()` — already defined in enginesApi.

---

### Phase 3: n8n Infrastructure

#### 2.1 Add n8n to Docker Compose

**File:** `docker-compose.dev.yml`

```yaml
n8n:
  image: n8nio/n8n:latest
  ports:
    - '5678:5678'
  environment:
    - N8N_BASIC_AUTH_ACTIVE=true
    - N8N_BASIC_AUTH_USER=admin
    - N8N_BASIC_AUTH_PASSWORD=admin
    - N8N_HOST=localhost
    - N8N_PORT=5678
    - N8N_PROTOCOL=http
    - WEBHOOK_URL=http://n8n:5678
    - N8N_ENCRYPTION_KEY=${N8N_ENCRYPTION_KEY}
  volumes:
    - n8n_data:/home/node/.n8n
  networks:
    - crm-network
```

#### 2.2 Auto-Sync on Startup

Add a startup hook or cron job that runs `WorkflowSyncService.syncAllWorkflows()` when the app starts, so the catalog is always fresh.

---

### Phase 4: Execution Reliability

#### 3.1 Webhook Retry Logic

**File:** `lib/n8n/client.ts`

Add exponential backoff for `resumeWorkflowWithInput()`:

- 3 retries with delays: 1s, 5s, 15s
- Log each retry attempt
- Mark as failed after exhausting retries

#### 3.2 Execution Cancellation

**New route:** `app/api/engines/executions/[id]/cancel/route.ts`

- Call n8n API to stop execution (if supported)
- Mark execution as 'cancelled' in MongoDB
- Clean up any pending UserInput records
- Refund cost if applicable

#### 3.3 Real-Time Execution Updates

Replace 5-second polling with WebSocket/SSE:

- Use existing Socket.IO infrastructure (`lib/context/SocketContext.tsx`)
- Emit events: `execution:started`, `execution:progress`, `execution:waiting_for_input`, `execution:completed`, `execution:failed`
- Frontend subscribes to execution-specific room

---

### Phase 5: Multi-Provider API Key Support

#### 4.1 Extend CustomerApiKey Model

**File:** `lib/mongodb/models/CustomerApiKey.ts`

Add providers:

```typescript
provider: 'openrouter' | 'openai' | 'anthropic' | 'google'
```

Update validation per provider:

- OpenRouter: `sk-or-v1-*`
- OpenAI: `sk-*`
- Anthropic: `sk-ant-*`
- Google: `AIza*`

#### 4.2 Credential Mapping in Execution

**File:** `lib/n8n/client.ts`

Map provider keys to n8n credential overrides:

- OpenRouter → `openRouterApi` credential
- OpenAI → `openAiApi` credential
- Anthropic → `anthropicApi` credential

#### 4.3 Update API Key UI

Add provider selector in `AddApiKeyModal`:

- Dropdown: OpenRouter, OpenAI, Anthropic, Google
- Dynamic validation rules per provider
- Provider-specific branding/icons

---

### Phase 6: Advanced Workflow Features

#### 5.1 Workflow Version Tracking

Track which n8n workflow version was used for each execution:

- Store `n8nData.versionId` at execution time
- Compare with current version on re-execution
- Show "workflow updated since last run" warning

#### 5.2 Test/Dry-Run Mode

Add `dryRun: true` option to execute endpoint:

- Validates input schema without executing
- Estimates cost based on workflow analysis
- Returns expected output structure
- No charges applied

#### 5.3 Scheduled Executions

Add cron-based execution scheduling:

- New model: `ScheduledExecution` with cron expression
- BullMQ repeatable job to trigger executions
- Dashboard showing upcoming/past scheduled runs

#### 5.4 Workflow Templates

Allow users to save input presets:

- Store frequently used input configurations
- One-click re-execution with saved inputs
- Share templates within workspace

---

### Phase 7: Cost & Usage Controls

#### 6.1 Rate Limiting

Per-workspace limits:

- Max executions per hour/day
- Max cost per day/month
- Configurable in workspace settings

#### 6.2 Budget Alerts

Notifications when:

- Daily/monthly spend exceeds threshold
- API key usage spikes
- Execution failure rate increases

#### 6.3 Detailed Cost Breakdown

Track per-node costs within a workflow:

- Token usage per AI node
- API call costs
- Total vs estimated comparison

---

### Phase 8: Microservice Extraction (Future)

When execution volume grows, extract to separate service:

#### 7.1 Worker Service Architecture

```
[CRM Monolith]
    ↓ (BullMQ job)
[Execution Worker Service]
    ├── Consumes execution jobs from Redis queue
    ├── Manages n8n API calls
    ├── Handles webhook callbacks
    ├── Updates MongoDB with results
    └── Emits Socket.IO events for real-time updates

Shared: MongoDB, Redis
```

#### 7.2 What Moves to Worker

- `lib/n8n/client.ts` → worker service
- `lib/n8n/sync.ts` → worker service
- Execution logic from `app/api/engines/execute/route.ts` → worker
- Webhook handler `app/api/engines/input/webhook/[webhookId]/route.ts` → worker
- Cleanup job `app/api/engines/jobs/cleanup/route.ts` → worker cron

#### 7.3 What Stays in Monolith

- API routes (thin layer that enqueues jobs)
- Frontend components
- RTK Query API
- MongoDB models (shared)

#### 7.4 Communication

- CRM → Worker: BullMQ job queue (already have `lib/queue/`)
- Worker → CRM: Redis pub/sub for real-time updates
- Worker → MongoDB: Direct connection (shared database)

---

## Implementation Priority

| Phase                          | Effort   | Impact                              | Priority |
| ------------------------------ | -------- | ----------------------------------- | -------- |
| Phase 1: Fix User Input Flow   | 1-2 days | CRITICAL — workflow input is broken | **P0**   |
| Phase 2: Wire Mock Pages       | 1-2 days | HIGH — users can't use features     | **P0**   |
| Phase 3: n8n Infrastructure    | 0.5 day  | MEDIUM — developer experience       | **P1**   |
| Phase 4: Execution Reliability | 2-3 days | HIGH — production stability         | **P1**   |
| Phase 5: Multi-Provider Keys   | 1-2 days | MEDIUM — broader AI coverage        | **P2**   |
| Phase 6: Advanced Features     | 3-5 days | MEDIUM — competitive features       | **P2**   |
| Phase 7: Cost Controls         | 1-2 days | MEDIUM — business critical          | **P2**   |
| Phase 8: Microservice          | 3-5 days | LOW (until scale) — future-proof    | **P3**   |

---

## Key Files Reference

| File                                                 | Lines | Purpose                  |
| ---------------------------------------------------- | ----- | ------------------------ |
| `lib/n8n/client.ts`                                  | 814   | n8n REST API wrapper     |
| `lib/n8n/sync.ts`                                    | 296   | Workflow sync service    |
| `lib/mongodb/models/WorkflowExecution.ts`            | 440   | Execution tracking       |
| `lib/mongodb/models/WorkflowCatalog.ts`              | 220   | Workflow catalog         |
| `lib/mongodb/models/CustomerApiKey.ts`               | 276   | API key management       |
| `lib/mongodb/models/UserInput.ts`                    | 354   | Pause/resume input       |
| `app/api/engines/execute/route.ts`                   | 297   | Main execution endpoint  |
| `app/api/engines/executions/[id]/input/route.ts`     | 410   | Input submission         |
| `app/api/engines/input/webhook/[webhookId]/route.ts` | 250   | Public webhook handler   |
| `lib/api/enginesApi.ts`                              | ~500  | RTK Query (45 endpoints) |

## Environment Variables

```bash
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
PLATFORM_OPENROUTER_API_KEY=sk-or-v1-...
API_KEY_ENCRYPTION_SECRET=<64-char-hex-string>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```
