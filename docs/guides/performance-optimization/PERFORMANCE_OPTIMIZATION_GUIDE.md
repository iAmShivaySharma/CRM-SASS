# CRM SaaS Performance Optimization Guide

## Scaling to 10,000,000 Users

> **Last Updated:** June 2026
> **Scope:** Full-stack performance optimization — database, caching, queues, search, logging, CDN, and infrastructure
> **Estimated Cost:** $5-15/month for self-hosted tools

---

## Table of Contents

1. [Current Architecture Audit](#1-current-architecture-audit)
2. [Critical Bugs to Fix First](#2-critical-bugs-to-fix-first)
3. [Tier 1: Zero-Cost MongoDB Optimizations](#3-tier-1-zero-cost-mongodb-optimizations)
4. [Tier 2: Redis — Caching, Sessions, Rate Limiting](#4-tier-2-redis--caching-sessions-rate-limiting)
5. [Tier 3: BullMQ — Async Job Processing](#5-tier-3-bullmq--async-job-processing)
6. [Tier 4: Meilisearch — Fast Full-Text Search](#6-tier-4-meilisearch--fast-full-text-search)
7. [Tier 5: Logging Optimization](#7-tier-5-logging-optimization)
8. [Tier 6: CDN & Edge Caching](#8-tier-6-cdn--edge-caching)
9. [Tier 7: MongoDB Replica Set & Sharding](#9-tier-7-mongodb-replica-set--sharding)
10. [Tier 8: Horizontal Scaling](#10-tier-8-horizontal-scaling)
11. [Monitoring & Observability](#11-monitoring--observability)
12. [Final Architecture Diagram](#12-final-architecture-diagram)
13. [Implementation Priority Checklist](#13-implementation-priority-checklist)
14. [Benchmarks & Targets](#14-benchmarks--targets)

---

## 1. Current Architecture Audit

### What We Have Today

| Layer             | Current Implementation         | Problem at 10M Scale                              |
| ----------------- | ------------------------------ | ------------------------------------------------- |
| Database          | MongoDB 7.0 (single instance)  | No replication, no sharding, single point of failure |
| Cache             | None (in-memory Maps only)     | Every request hits the database                   |
| Queue             | None (synchronous processing)  | Email, notifications, webhooks block API responses |
| Search            | MongoDB `$regex`               | Full collection scans on every text search         |
| Rate Limiting     | In-memory `Map`                | Lost on restart, no multi-instance coordination    |
| Sessions          | JWT in cookies (stateless)     | No way to revoke tokens instantly                  |
| File Storage      | MinIO (single instance)        | No CDN, synchronous uploads, no image transforms   |
| Logging           | Winston with 6 file transports | Heavy I/O per log message, no centralized aggregation |
| Real-time         | Socket.io (single server)      | No multi-server pub/sub adapter                    |
| Background Jobs   | Single `setInterval` cleanup   | No retry, no dead letter queue, no parallelism     |

### Current Request Flow (Slow Path)

```
Client Request
    |
    v
Next.js Middleware (JWT verify + rate limit check from memory Map)
    |
    v
API Route Handler
    |-- Direct MongoDB query (no cache)
    |-- Synchronous email send via Resend (200-500ms)
    |-- Synchronous notification create (50-100ms)
    |-- Synchronous activity log write (30-50ms)
    |-- Synchronous webhook delivery (100-2000ms)
    |
    v
Response (total: 400-2600ms)
```

### Target Request Flow (Optimized)

```
Client Request
    |
    v
Cloudflare Edge (cache hit? return immediately ~5ms)
    |
    v
Next.js Middleware (JWT verify + Redis rate limit check ~2ms)
    |
    v
API Route Handler
    |-- Redis cache check (hit? return ~3ms)
    |-- MongoDB query only on cache miss (~20ms)
    |-- Queue email job to BullMQ (~2ms)
    |-- Queue notification job (~2ms)
    |-- Queue activity log job (~2ms)
    |
    v
Response (total: 15-30ms)
```

---

## 2. Critical Bugs to Fix First

These are not optimizations — these are bugs that will **crash your server** at scale.

### Bug 2.1: Analytics Dashboard Loads All Leads Into Memory

**File:** `app/api/analytics/dashboard/route.ts`

**Problem:** The dashboard endpoint fetches the ENTIRE leads collection for a workspace into memory, then filters and counts in JavaScript. At 10M users with millions of leads per workspace, this causes Out-of-Memory (OOM) crashes.

**Current Code (broken):**
```typescript
// This loads EVERY lead into Node.js memory
const leads = await Lead.find({ workspaceId });
const currentLeads = leads.filter(l => l.createdAt >= startOfMonth);
const convertedLeads = leads.filter(l => l.status === 'converted');
const totalRevenue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
```

**Fixed Code (uses MongoDB aggregation):**
```typescript
const [stats] = await Lead.aggregate([
  { $match: { workspaceId: new mongoose.Types.ObjectId(workspaceId) } },
  {
    $facet: {
      total: [{ $count: 'count' }],
      byStatus: [
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ],
      revenue: [
        { $group: { _id: null, total: { $sum: '$value' } } }
      ],
      currentPeriod: [
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $count: 'count' }
      ],
      previousPeriod: [
        {
          $match: {
            createdAt: { $gte: startOfPreviousMonth, $lt: startOfMonth }
          }
        },
        { $count: 'count' }
      ],
      bySource: [
        { $group: { _id: '$source', count: { $sum: 1 }, revenue: { $sum: '$value' } } }
      ],
      conversionRate: [
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            converted: {
              $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
            }
          }
        }
      ]
    }
  }
]);
```

**Impact:** Goes from loading 1M+ documents into RAM to a single aggregation pipeline that MongoDB executes on disk.

---

### Bug 2.2: Message `readBy[]` Array Grows Without Bound

**File:** `lib/mongodb/models/Message.ts`

**Problem:** Every user who reads a message gets appended to the `readBy` array inside the Message document. MongoDB has a 16MB document size limit. A message in a workspace channel with 10,000 users means 10,000 entries in `readBy` per message. Multiply by millions of messages = document bloat and eventual crashes.

**Current Code (broken):**
```typescript
const MessageSchema = new Schema({
  // ...
  readBy: [{
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }]
});
```

**Fix: Separate Collection for Read Receipts**

Create a new model `lib/mongodb/models/MessageRead.ts`:

```typescript
import mongoose, { Schema } from 'mongoose';

const MessageReadSchema = new Schema({
  messageId: {
    type: Schema.Types.ObjectId,
    ref: 'Message',
    required: true
  },
  chatRoomId: {
    type: Schema.Types.ObjectId,
    ref: 'ChatRoom',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate reads
MessageReadSchema.index(
  { messageId: 1, userId: 1 },
  { unique: true }
);

// Fast "unread count" query per user per room
MessageReadSchema.index({ chatRoomId: 1, userId: 1, readAt: -1 });

// TTL: auto-delete read receipts older than 90 days
MessageReadSchema.index({ readAt: 1 }, { expireAfterSeconds: 90 * 86400 });

export default mongoose.models.MessageRead ||
  mongoose.model('MessageRead', MessageReadSchema);
```

**Unread count query (fast):**
```typescript
// Get last read timestamp for user in a room
const lastRead = await MessageRead.findOne(
  { chatRoomId, userId },
  { readAt: 1 },
  { sort: { readAt: -1 } }
).lean();

// Count messages after last read
const unreadCount = await Message.countDocuments({
  chatRoomId,
  createdAt: { $gt: lastRead?.readAt || new Date(0) }
});
```

---

### Bug 2.3: Console.log Statements in Production API Routes

**File:** `app/api/leads/route.ts` (14 console.log calls found)

**Problem:** `console.log` in production is synchronous, blocks the event loop, and writes unstructured data to stdout. At high throughput (10K+ req/sec), this measurably degrades performance.

**Fix:** Remove all `console.log` calls from API routes. Use the structured logger only for meaningful events:

```bash
# Find all console.log in API routes
grep -rn "console.log" app/api/ --include="*.ts"
```

```typescript
// REMOVE these:
console.log('Lead query:', query);
console.log('Filters:', filters);

// KEEP (but use structured logger):
logger.debug('Lead query executed', { query, duration: Date.now() - start });
```

---

### Bug 2.4: N+1 Queries in Cleanup Job

**File:** `lib/jobs/cleanupExpiredInputsJob.ts`

**Problem:** The job finds all expired records, then loops through each one individually calling `.populate()` and `.save()` — this creates N+1 database queries.

**Current Code (slow):**
```typescript
const expiredInputs = await UserInput.find({ expiresAt: { $lt: new Date() } });
for (const input of expiredInputs) {
  const populated = await UserInput.findById(input._id).populate('executionId');
  await populated.executionId.markTimeout();
  await populated.remove();
}
```

**Fixed Code (bulk operations):**
```typescript
const expiredInputs = await UserInput.find({ expiresAt: { $lt: new Date() } })
  .populate('executionId')
  .lean();

if (expiredInputs.length === 0) return;

// Bulk update all executions to timeout status
const executionIds = expiredInputs
  .map(input => input.executionId?._id)
  .filter(Boolean);

await WorkflowExecution.updateMany(
  { _id: { $in: executionIds } },
  { $set: { status: 'timeout', completedAt: new Date() } }
);

// Bulk delete all expired inputs
await UserInput.deleteMany({
  _id: { $in: expiredInputs.map(input => input._id) }
});

logger.info('Cleanup completed', {
  expiredInputs: expiredInputs.length,
  executionsTimedOut: executionIds.length
});
```

---

## 3. Tier 1: Zero-Cost MongoDB Optimizations

### 3.1 Add Compound Indexes for Common Queries

**File to modify:** Each model file in `lib/mongodb/models/`

Every API query pattern needs a matching compound index. Without them, MongoDB performs full collection scans.

```typescript
// Lead.ts — add these indexes
LeadSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
LeadSchema.index({ workspaceId: 1, source: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, priority: 1, status: 1 });
LeadSchema.index({ workspaceId: 1, 'tags': 1 });

// Text index for search (replaces $regex completely)
LeadSchema.index(
  { name: 'text', email: 'text', company: 'text', phone: 'text' },
  { weights: { name: 10, email: 5, company: 3, phone: 1 } }
);
```

```typescript
// Activity.ts — add time-range query index
ActivitySchema.index({ workspaceId: 1, performedBy: 1, createdAt: -1 });
ActivitySchema.index({ workspaceId: 1, entityType: 1, entityId: 1, createdAt: -1 });
```

```typescript
// Task.ts
TaskSchema.index({ workspaceId: 1, assignedTo: 1, status: 1 });
TaskSchema.index({ workspaceId: 1, projectId: 1, status: 1, createdAt: -1 });
```

**How to verify indexes are used:**
```bash
# In MongoDB shell
db.leads.find({ workspaceId: "...", status: "new" }).explain("executionStats")
# Look for: "stage": "IXSCAN" (good) vs "COLLSCAN" (bad)
```

---

### 3.2 Use MongoDB Text Search Instead of $regex

**File:** `app/api/leads/route.ts`

**Current Code (slow — triggers full collection scan):**
```typescript
if (search) {
  query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
    { company: { $regex: search, $options: 'i' } },
    { phone: { $regex: search, $options: 'i' } }
  ];
}
```

**Fixed Code (uses text index — 100x faster):**
```typescript
if (search) {
  query.$text = { $search: search };
  // Add text score for relevance sorting
  projection.score = { $meta: 'textScore' };
  sort = { score: { $meta: 'textScore' } };
}
```

> **Note:** This requires the text index from section 3.1 to be created first.
> For even better search, see [Tier 4: Meilisearch](#6-tier-4-meilisearch--fast-full-text-search).

---

### 3.3 Projection — Only Fetch Fields You Need

Every query that doesn't use `.select()` fetches ALL fields from the document. For a Lead with 20+ fields, this wastes bandwidth and memory.

**Before:**
```typescript
const leads = await Lead.find(query).lean();
// Returns all 20+ fields per document
```

**After:**
```typescript
// List view — only needs display fields
const leads = await Lead.find(query)
  .select('name email status source value priority createdAt assignedTo')
  .lean();

// Detail view — needs everything (no .select())
const lead = await Lead.findById(id).lean();
```

**Apply this pattern to all list endpoints:**
- `/api/leads` — select 8-10 fields max
- `/api/contacts` — select name, email, phone, company
- `/api/tasks` — select title, status, assignedTo, dueDate
- `/api/activities` — select activityType, description, performedBy, createdAt
- `/api/notifications` — select title, message, type, read, createdAt

---

### 3.4 Cursor-Based Pagination (Replace skip/limit)

MongoDB's `skip(N)` must scan and discard N documents before returning results. At page 1000 with 20 items per page, it scans 20,000 documents and discards 19,980.

**Before (O(N) — gets slower as page increases):**
```typescript
const page = parseInt(searchParams.get('page') || '1');
const limit = parseInt(searchParams.get('limit') || '20');
const skip = (page - 1) * limit;

const leads = await Lead.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit);
```

**After (O(1) — instant at any depth):**
```typescript
const cursor = searchParams.get('cursor'); // last document's _id
const limit = parseInt(searchParams.get('limit') || '20');

const paginationQuery = cursor
  ? { ...query, _id: { $lt: new mongoose.Types.ObjectId(cursor) } }
  : query;

const leads = await Lead.find(paginationQuery)
  .sort({ _id: -1 })
  .limit(limit + 1) // fetch one extra to determine hasMore
  .select('name email status source value createdAt')
  .lean();

const hasMore = leads.length > limit;
if (hasMore) leads.pop(); // remove the extra document

const nextCursor = leads.length > 0 ? leads[leads.length - 1]._id : null;

return Response.json({
  data: leads,
  pagination: { nextCursor, hasMore }
});
```

**Client-side usage:**
```typescript
// First page
const res1 = await fetch('/api/leads?limit=20');
const { data, pagination } = await res1.json();

// Next page
const res2 = await fetch(`/api/leads?limit=20&cursor=${pagination.nextCursor}`);
```

---

### 3.5 Bulk Write Operations

**Before (N database round-trips):**
```typescript
for (const lead of leads) {
  await Lead.updateOne({ _id: lead._id }, { $set: { status: 'contacted' } });
}
// 1000 leads = 1000 round-trips = ~5000ms
```

**After (1 database round-trip):**
```typescript
await Lead.bulkWrite(
  leads.map(lead => ({
    updateOne: {
      filter: { _id: lead._id },
      update: { $set: { status: 'contacted' } }
    }
  }))
);
// 1000 leads = 1 round-trip = ~50ms
```

---

### 3.6 Connection Pool Tuning

**File:** `lib/mongodb/connection.ts`

```typescript
const connectionOptions = {
  maxPoolSize: 50,                   // default is 5 — way too low for 10M users
  minPoolSize: 10,                   // keep 10 warm connections
  maxIdleTimeMS: 30000,              // close idle connections after 30s
  serverSelectionTimeoutMS: 5000,    // fail fast if MongoDB is down
  socketTimeoutMS: 45000,            // timeout slow queries
  compressors: ['zstd', 'snappy'],   // compress data on the wire (30-50% less bandwidth)
  retryWrites: true,                 // auto-retry failed writes
  retryReads: true,                  // auto-retry failed reads
  w: 'majority',                     // write concern for data safety
  readPreference: 'secondaryPreferred' // read from replicas when available
};

await mongoose.connect(process.env.MONGODB_URI, connectionOptions);
```

**Pool size guideline:**
| Concurrent Users | Max Pool Size |
| ---------------- | ------------- |
| < 1,000          | 10            |
| 1,000 - 10,000   | 25            |
| 10,000 - 100,000  | 50            |
| 100,000+          | 100           |

---

## 4. Tier 2: Redis — Caching, Sessions, Rate Limiting

Redis is the **single most impactful addition** to the stack. One Redis instance ($5-15/mo) replaces 5 separate concerns.

### 4.1 Add Redis to Docker

**File:** `docker-compose.yml`

```yaml
services:
  mongodb:
    image: mongo:7.0
    # ... existing config ...

  redis:
    image: redis:7-alpine
    container_name: crm-redis
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - crm-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  app:
    # ... existing config ...
    depends_on:
      - mongodb
      - redis
    environment:
      - REDIS_URL=redis://redis:6379

volumes:
  mongodb_data:
  redis_data:  # Add this
```

**`maxmemory-policy allkeys-lru`** means: when Redis hits 256MB, it automatically evicts the least-recently-used keys. This makes it a self-managing cache — no manual cleanup needed.

---

### 4.2 Install Redis Client

```bash
npm install ioredis
```

**File:** `lib/redis/client.ts`

```typescript
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
      enableReadyCheck: true,
      reconnectOnError(err) {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ETIMEDOUT'];
        return targetErrors.some(e => err.message.includes(e));
      }
    });

    redis.on('error', (err) => {
      console.error('Redis connection error:', err.message);
    });

    redis.on('connect', () => {
      console.log('Redis connected');
    });
  }

  return redis;
}

export default getRedisClient();
```

---

### 4.3 API Response Caching

This is where you see the biggest improvement. Instead of hitting MongoDB on every request, check Redis first.

**File:** `lib/redis/cache.ts`

```typescript
import redis from './client';

/**
 * Cache-aside pattern:
 * 1. Check Redis for cached data
 * 2. If cache hit → return immediately (1-3ms)
 * 3. If cache miss → fetch from MongoDB, store in Redis, return
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    // Step 1: Check cache
    const hit = await redis.get(key);
    if (hit) {
      return JSON.parse(hit) as T;
    }
  } catch (err) {
    // Redis down? Fall through to MongoDB
    console.error('Redis read error:', err);
  }

  // Step 2: Cache miss — fetch from source
  const data = await fetcher();

  // Step 3: Store in cache (non-blocking)
  try {
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    console.error('Redis write error:', err);
  }

  return data;
}

/**
 * Invalidate cache keys by pattern.
 * Call this whenever data is created/updated/deleted.
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await redis.scan(
        cursor,
        'MATCH', pattern,
        'COUNT', 100
      );
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error('Redis invalidate error:', err);
  }
}

/**
 * Cache with stale-while-revalidate pattern.
 * Returns stale data immediately while refreshing in background.
 */
export async function cachedSWR<T>(
  key: string,
  ttlSeconds: number,
  staleTTLSeconds: number,
  fetcher: () => Promise<T>
): Promise<T> {
  try {
    const raw = await redis.get(key);
    if (raw) {
      const { data, cachedAt } = JSON.parse(raw);
      const age = (Date.now() - cachedAt) / 1000;

      if (age > ttlSeconds && age <= staleTTLSeconds) {
        // Stale — return immediately, refresh in background
        refreshInBackground(key, staleTTLSeconds, fetcher);
      }

      return data as T;
    }
  } catch (err) {
    console.error('Redis SWR read error:', err);
  }

  const data = await fetcher();
  try {
    await redis.setex(key, staleTTLSeconds, JSON.stringify({
      data,
      cachedAt: Date.now()
    }));
  } catch (err) {
    console.error('Redis SWR write error:', err);
  }

  return data;
}

async function refreshInBackground<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<void> {
  try {
    const data = await fetcher();
    await redis.setex(key, ttl, JSON.stringify({
      data,
      cachedAt: Date.now()
    }));
  } catch (err) {
    console.error('Redis background refresh error:', err);
  }
}
```

---

### 4.4 Apply Caching to API Routes

**File:** `app/api/leads/route.ts` (GET handler)

```typescript
import { cached, invalidateCache } from '@/lib/redis/cache';

export async function GET(request: NextRequest) {
  // ... auth & param parsing ...

  const cacheKey = `leads:${workspaceId}:${page}:${limit}:${status}:${search}:${sortBy}`;

  const result = await cached(cacheKey, 60, async () => {
    const leads = await Lead.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('name email status source value priority createdAt assignedTo')
      .lean();

    const total = await Lead.countDocuments(query);

    return { leads, total, page, limit };
  });

  return Response.json(result);
}

export async function POST(request: NextRequest) {
  // ... create lead ...

  // Invalidate all lead list caches for this workspace
  await invalidateCache(`leads:${workspaceId}:*`);

  return Response.json(lead, { status: 201 });
}
```

### 4.5 Cache TTL Strategy

| Data Type                | Cache Key Pattern                       | TTL     | Invalidation Trigger            |
| ------------------------ | --------------------------------------- | ------- | ------------------------------- |
| Lead list (paginated)    | `leads:{wsId}:{page}:{filters}`         | 60s     | Lead CRUD                       |
| Dashboard analytics      | `analytics:{wsId}:dashboard`            | 5 min   | Lead CRUD, status changes       |
| Pipeline analytics       | `analytics:{wsId}:pipeline`             | 5 min   | Lead status changes             |
| User profile             | `user:{userId}`                         | 10 min  | Profile update                  |
| Workspace members        | `members:{wsId}`                        | 5 min   | Member add/remove/role change   |
| Roles & permissions      | `roles:{wsId}`                          | 30 min  | Role CRUD                       |
| Notification count       | `notif:count:{userId}`                  | 30s     | New notification                |
| Workflow catalog          | `workflows:catalog:{wsId}`             | 1 hr    | Workflow sync                   |
| Chat room list           | `chatrooms:{wsId}:{userId}`             | 2 min   | Room create/update              |
| Workspace settings       | `ws:settings:{wsId}`                    | 15 min  | Settings update                 |

---

### 4.6 Distributed Rate Limiting with Redis

Replace the in-memory `Map` rate limiter with a Redis-backed sliding window.

**File:** `lib/security/redis-rate-limiter.ts`

```typescript
import redis from '../redis/client';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Sliding window rate limiter using Redis.
 * Survives server restarts and works across multiple instances.
 */
export async function checkRateLimit(
  identifier: string,
  endpoint: string,
  limit: number,
  windowSeconds: number
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - (windowSeconds * 1000);
  const key = `rl:${endpoint}:${identifier}`;

  // Use Redis sorted set with timestamps as scores
  const pipeline = redis.pipeline();

  // Remove entries outside the window
  pipeline.zremrangebyscore(key, 0, windowStart);

  // Add current request
  pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);

  // Count requests in window
  pipeline.zcard(key);

  // Set expiry on the key
  pipeline.expire(key, windowSeconds);

  const results = await pipeline.exec();
  const count = results?.[2]?.[1] as number || 0;

  const resetAt = now + (windowSeconds * 1000);

  if (count > limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfter: Math.ceil(windowSeconds - ((now - windowStart) / 1000))
    };
  }

  return {
    allowed: true,
    remaining: limit - count,
    resetAt
  };
}

/**
 * Rate limit configurations per endpoint.
 */
export const RATE_LIMITS = {
  'auth/login':       { limit: 5,   window: 900 },    // 5 per 15 min
  'auth/signup':      { limit: 3,   window: 3600 },   // 3 per hour
  'api/leads':        { limit: 200, window: 900 },    // 200 per 15 min
  'api/analytics':    { limit: 30,  window: 900 },    // 30 per 15 min
  'api/webhooks':     { limit: 100, window: 900 },    // 100 per 15 min
  'api/chat':         { limit: 300, window: 900 },    // 300 per 15 min
  'api/default':      { limit: 200, window: 900 },    // 200 per 15 min
} as const;
```

**Update `middleware.ts` to use Redis rate limiter:**

```typescript
import { checkRateLimit, RATE_LIMITS } from './lib/security/redis-rate-limiter';

// In the middleware function:
const ip = request.headers.get('x-forwarded-for') || 'unknown';
const endpoint = getEndpointKey(pathname); // maps /api/leads/123 → 'api/leads'
const config = RATE_LIMITS[endpoint] || RATE_LIMITS['api/default'];

const result = await checkRateLimit(ip, endpoint, config.limit, config.window);

if (!result.allowed) {
  return new NextResponse('Too Many Requests', {
    status: 429,
    headers: {
      'Retry-After': String(result.retryAfter),
      'X-RateLimit-Limit': String(config.limit),
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(result.resetAt),
    }
  });
}
```

---

### 4.7 Redis-Backed Session Store (Instant Token Revocation)

Currently, JWTs are stateless — once issued, they cannot be revoked until they expire (7 days). This is a security risk.

**File:** `lib/redis/sessions.ts`

```typescript
import redis from './client';

const SESSION_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

export async function createSession(
  userId: string,
  tokenId: string,
  metadata: { workspaceId: string; role: string; ip: string; ua: string }
): Promise<void> {
  await redis.setex(
    `session:${userId}:${tokenId}`,
    SESSION_TTL,
    JSON.stringify({ ...metadata, createdAt: Date.now() })
  );
}

export async function verifySession(
  userId: string,
  tokenId: string
): Promise<boolean> {
  const exists = await redis.exists(`session:${userId}:${tokenId}`);
  return exists === 1;
}

export async function revokeSession(
  userId: string,
  tokenId: string
): Promise<void> {
  await redis.del(`session:${userId}:${tokenId}`);
}

export async function revokeAllSessions(userId: string): Promise<void> {
  let cursor = '0';
  do {
    const [nextCursor, keys] = await redis.scan(
      cursor, 'MATCH', `session:${userId}:*`, 'COUNT', 100
    );
    cursor = nextCursor;
    if (keys.length > 0) await redis.del(...keys);
  } while (cursor !== '0');
}
```

**Usage in middleware.ts:**
```typescript
// After JWT decode:
const isValid = await verifySession(decoded.userId, decoded.tokenId);
if (!isValid) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

**Usage on password change / security event:**
```typescript
await revokeAllSessions(userId); // instantly logs out all devices
```

---

### 4.8 Redis for Real-Time Counters

Instead of querying MongoDB for counts, use Redis atomic counters.

```typescript
// Unread notification count
await redis.incr(`notif:count:${userId}`);              // on new notification
const count = await redis.get(`notif:count:${userId}`);  // on badge render
await redis.set(`notif:count:${userId}`, '0');           // on mark-all-read

// Unread messages per chat room
await redis.hincrby(`unread:${userId}`, chatRoomId, 1);  // on new message
const unreads = await redis.hgetall(`unread:${userId}`); // get all rooms
await redis.hdel(`unread:${userId}`, chatRoomId);        // on room open

// Online users tracking
await redis.sadd(`online:${workspaceId}`, userId);       // on connect
await redis.srem(`online:${workspaceId}`, userId);       // on disconnect
await redis.expire(`online:${workspaceId}`, 300);        // auto-cleanup 5min
const onlineUsers = await redis.smembers(`online:${workspaceId}`);

// Active lead count per status (for dashboard)
await redis.hincrby(`lead:counts:${workspaceId}`, status, 1);  // on create
await redis.hincrby(`lead:counts:${workspaceId}`, status, -1); // on delete
const counts = await redis.hgetall(`lead:counts:${workspaceId}`);
```

---

### 4.9 Socket.io Redis Adapter (Multi-Server Real-Time)

When running multiple Next.js instances, Socket.io messages won't reach users connected to different servers. The Redis adapter solves this.

```bash
npm install @socket.io/redis-adapter
```

```typescript
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from '../redis/client';

const pubClient = getRedisClient();
const subClient = pubClient.duplicate();

const io = new Server(server, {
  adapter: createAdapter(pubClient, subClient),
  cors: { origin: process.env.CORS_ORIGINS }
});
```

---

## 5. Tier 3: BullMQ — Async Job Processing

BullMQ uses the same Redis instance — no additional infrastructure cost.

### 5.1 Install BullMQ

```bash
npm install bullmq
```

### 5.2 Define Queues

**File:** `lib/queue/queues.ts`

```typescript
import { Queue } from 'bullmq';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

// Email queue — for all transactional emails
export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 1000 },  // keep last 1000 completed
    removeOnFail: { count: 5000 },      // keep last 5000 failed for debugging
  }
});

// Notification queue — for in-app notifications
export const notificationQueue = new Queue('notifications', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 2000 },
  }
});

// Webhook queue — for outbound webhook deliveries
export const webhookQueue = new Queue('webhooks', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 10000 },
    removeOnComplete: { count: 2000 },
    removeOnFail: { count: 10000 },
  }
});

// Activity queue — for audit trail logging
export const activityQueue = new Queue('activity', {
  connection,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 },
  }
});

// Analytics queue — for heavy analytics calculations
export const analyticsQueue = new Queue('analytics', {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: { count: 100 },
  }
});
```

### 5.3 Create Workers

**File:** `lib/queue/workers/emailWorker.ts`

```typescript
import { Worker } from 'bullmq';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const emailWorker = new Worker('email', async (job) => {
  const { to, subject, html, from, replyTo } = job.data;

  const result = await resend.emails.send({
    from: from || process.env.EMAIL_FROM_ADDRESS || 'noreply@yourdomain.com',
    to,
    subject,
    html,
    ...(replyTo && { replyTo })
  });

  return { messageId: result.data?.id };
}, {
  connection,
  concurrency: 10,           // process 10 emails in parallel
  limiter: {
    max: 50,                  // max 50 jobs
    duration: 1000            // per second (Resend rate limit)
  }
});

emailWorker.on('completed', (job) => {
  console.log(`Email sent: ${job.id} → ${job.data.to}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`Email failed: ${job?.id} → ${err.message}`);
});

export default emailWorker;
```

**File:** `lib/queue/workers/notificationWorker.ts`

```typescript
import { Worker } from 'bullmq';
import Notification from '../../mongodb/models/Notification';
import redis from '../../redis/client';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const notificationWorker = new Worker('notifications', async (job) => {
  const { recipients, workspaceId, title, message, type, entityType, entityId, actionUrl } = job.data;

  // Batch insert notifications for all recipients
  const docs = recipients.map((userId: string) => ({
    workspaceId,
    userId,
    title,
    message,
    type,
    entityType,
    entityId,
    actionUrl,
    read: false,
    createdAt: new Date()
  }));

  await Notification.insertMany(docs, { ordered: false });

  // Update Redis unread counters
  const pipeline = redis.pipeline();
  for (const userId of recipients) {
    pipeline.incr(`notif:count:${userId}`);
  }
  await pipeline.exec();

  return { notified: recipients.length };
}, {
  connection,
  concurrency: 5,
  limiter: { max: 100, duration: 1000 }
});

export default notificationWorker;
```

**File:** `lib/queue/workers/webhookWorker.ts`

```typescript
import { Worker } from 'bullmq';
import crypto from 'crypto';
import WebhookLog from '../../mongodb/models/WebhookLog';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const webhookWorker = new Worker('webhooks', async (job) => {
  const { webhookId, url, payload, secret, headers } = job.data;

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const startTime = Date.now();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Id': webhookId,
      'X-Webhook-Timestamp': new Date().toISOString(),
      ...headers
    },
    body,
    signal: AbortSignal.timeout(30000) // 30s timeout
  });

  const duration = Date.now() - startTime;

  // Log the delivery
  await WebhookLog.create({
    webhookId,
    status: response.ok ? 'success' : 'failed',
    statusCode: response.status,
    duration,
    attempt: job.attemptsMade + 1,
    requestBody: payload,
    responseBody: await response.text().catch(() => ''),
  });

  if (!response.ok) {
    throw new Error(`Webhook delivery failed: ${response.status}`);
  }

  return { status: response.status, duration };
}, {
  connection,
  concurrency: 20,
  limiter: { max: 100, duration: 1000 }
});

export default webhookWorker;
```

**File:** `lib/queue/workers/activityWorker.ts`

```typescript
import { Worker } from 'bullmq';
import Activity from '../../mongodb/models/Activity';

const connection = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379')
};

const activityWorker = new Worker('activity', async (job) => {
  const activities = Array.isArray(job.data) ? job.data : [job.data];

  // Batch insert activities
  await Activity.insertMany(activities, { ordered: false });

  return { logged: activities.length };
}, {
  connection,
  concurrency: 5,
  batchSize: 50 // process up to 50 at a time
});

export default activityWorker;
```

### 5.4 Initialize Workers

**File:** `lib/queue/init.ts`

```typescript
import emailWorker from './workers/emailWorker';
import notificationWorker from './workers/notificationWorker';
import webhookWorker from './workers/webhookWorker';
import activityWorker from './workers/activityWorker';

export function initializeWorkers() {
  console.log('BullMQ workers initialized:', [
    'email', 'notifications', 'webhooks', 'activity'
  ].join(', '));
}

// Graceful shutdown
export async function shutdownWorkers() {
  await Promise.all([
    emailWorker.close(),
    notificationWorker.close(),
    webhookWorker.close(),
    activityWorker.close(),
  ]);
}
```

### 5.5 Usage in API Routes (Before vs After)

```typescript
// ============ BEFORE (Synchronous — blocks response) ============

export async function POST(request: NextRequest) {
  const lead = await Lead.create(data);

  // These 4 operations add 300-800ms to response time
  await emailService.sendEmail(assignee.email, 'New Lead Assigned', html);   // 200-500ms
  await NotificationService.createNotification(workspaceId, { ... });        // 50-100ms
  await Activity.create({ entityType: 'lead', activityType: 'created' });    // 30-50ms
  await deliverWebhooks(workspaceId, 'lead.created', lead);                  // 100-2000ms

  return Response.json(lead); // Total: 400-2650ms
}


// ============ AFTER (Async — instant response) ============

import { emailQueue, notificationQueue, activityQueue, webhookQueue } from '@/lib/queue/queues';

export async function POST(request: NextRequest) {
  const lead = await Lead.create(data);

  // These 4 operations add 5-10ms total to response time
  await emailQueue.add('lead-assigned', {
    to: assignee.email,
    subject: 'New Lead Assigned',
    html
  });

  await notificationQueue.add('lead-created', {
    recipients: [assignee._id],
    workspaceId,
    title: 'New Lead',
    message: `${lead.name} was assigned to you`
  });

  await activityQueue.add('log', {
    workspaceId,
    entityType: 'lead',
    entityId: lead._id,
    activityType: 'created',
    performedBy: userId
  });

  await webhookQueue.add('deliver', {
    workspaceId,
    event: 'lead.created',
    payload: lead
  });

  // Invalidate cache
  await invalidateCache(`leads:${workspaceId}:*`);

  return Response.json(lead); // Total: 25-40ms
}
```

**Impact on response times:**

| Operation         | Before (sync) | After (async) | Improvement |
| ----------------- | ------------- | ------------- | ----------- |
| Send email        | 200-500ms     | 2ms (queue)   | 100-250x    |
| Create notification | 50-100ms    | 2ms (queue)   | 25-50x      |
| Log activity      | 30-50ms       | 2ms (queue)   | 15-25x      |
| Deliver webhook   | 100-2000ms    | 2ms (queue)   | 50-1000x    |
| **Total added**   | **380-2650ms** | **8ms**      | **47-330x** |

---

## 6. Tier 4: Meilisearch — Fast Full-Text Search

Meilisearch is open-source, free to self-host, uses 10x less RAM than Elasticsearch, and provides sub-50ms search across millions of documents.

### 6.1 Add Meilisearch to Docker

**File:** `docker-compose.yml`

```yaml
services:
  meilisearch:
    image: getmeili/meilisearch:v1.7
    container_name: crm-meilisearch
    ports:
      - "7700:7700"
    environment:
      MEILI_MASTER_KEY: ${MEILI_MASTER_KEY:-your-master-key-change-me}
      MEILI_ENV: production
      MEILI_MAX_INDEXING_MEMORY: 512Mb
    volumes:
      - meili_data:/meili_data
    networks:
      - crm-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:7700/health"]
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  meili_data:
```

### 6.2 Install Client

```bash
npm install meilisearch
```

### 6.3 Create Search Client

**File:** `lib/search/client.ts`

```typescript
import { MeiliSearch, Index } from 'meilisearch';

let client: MeiliSearch | null = null;

export function getMeiliClient(): MeiliSearch {
  if (!client) {
    client = new MeiliSearch({
      host: process.env.MEILI_HOST || 'http://meilisearch:7700',
      apiKey: process.env.MEILI_MASTER_KEY
    });
  }
  return client;
}

/**
 * Initialize search indexes with proper configuration.
 * Run this once on app startup.
 */
export async function initSearchIndexes(): Promise<void> {
  const meili = getMeiliClient();

  // Leads index
  const leadsIndex = meili.index('leads');
  await leadsIndex.updateSettings({
    searchableAttributes: ['name', 'email', 'company', 'phone', 'notes'],
    filterableAttributes: ['workspaceId', 'status', 'source', 'priority', 'assignedTo', 'tags'],
    sortableAttributes: ['createdAt', 'value', 'name', 'updatedAt'],
    distinctAttribute: 'id',
    typoTolerance: {
      enabled: true,
      minWordSizeForTypos: { oneTypo: 4, twoTypos: 8 }
    },
    pagination: { maxTotalHits: 10000 }
  });

  // Contacts index
  const contactsIndex = meili.index('contacts');
  await contactsIndex.updateSettings({
    searchableAttributes: ['name', 'email', 'phone', 'company', 'notes'],
    filterableAttributes: ['workspaceId', 'leadId'],
    sortableAttributes: ['createdAt', 'name'],
  });

  // Tasks index
  const tasksIndex = meili.index('tasks');
  await tasksIndex.updateSettings({
    searchableAttributes: ['title', 'description'],
    filterableAttributes: ['workspaceId', 'projectId', 'status', 'assignedTo', 'priority'],
    sortableAttributes: ['createdAt', 'dueDate', 'priority'],
  });

  // Messages index (for chat search)
  const messagesIndex = meili.index('messages');
  await messagesIndex.updateSettings({
    searchableAttributes: ['content', 'senderName'],
    filterableAttributes: ['chatRoomId', 'senderId', 'type'],
    sortableAttributes: ['createdAt'],
  });

  console.log('Meilisearch indexes initialized');
}
```

### 6.4 Sync Service (MongoDB → Meilisearch)

**File:** `lib/search/sync.ts`

```typescript
import { getMeiliClient } from './client';

/**
 * Sync a single document to Meilisearch.
 * Call after every create/update in API routes.
 */
export async function indexDocument(
  indexName: string,
  document: Record<string, any>
): Promise<void> {
  try {
    const meili = getMeiliClient();
    const index = meili.index(indexName);

    // Meilisearch requires 'id' as string
    const doc = {
      ...document,
      id: document._id?.toString() || document.id,
    };
    delete doc._id;

    // Convert ObjectIds to strings
    for (const [key, value] of Object.entries(doc)) {
      if (value && typeof value === 'object' && value.toString && value._bsontype) {
        doc[key] = value.toString();
      }
    }

    await index.addDocuments([doc]);
  } catch (err) {
    console.error(`Failed to index document in ${indexName}:`, err);
    // Don't throw — search index failure shouldn't break the API
  }
}

/**
 * Remove a document from the search index.
 * Call after every delete in API routes.
 */
export async function removeDocument(
  indexName: string,
  documentId: string
): Promise<void> {
  try {
    const meili = getMeiliClient();
    await meili.index(indexName).deleteDocument(documentId);
  } catch (err) {
    console.error(`Failed to remove document from ${indexName}:`, err);
  }
}

/**
 * Bulk sync all documents from MongoDB to Meilisearch.
 * Use for initial migration or re-indexing.
 */
export async function bulkSync(
  indexName: string,
  model: any,
  query: Record<string, any> = {},
  batchSize: number = 1000
): Promise<number> {
  const meili = getMeiliClient();
  const index = meili.index(indexName);

  let total = 0;
  let skip = 0;

  while (true) {
    const docs = await model
      .find(query)
      .skip(skip)
      .limit(batchSize)
      .lean();

    if (docs.length === 0) break;

    const formatted = docs.map((doc: any) => {
      const d = { ...doc, id: doc._id.toString() };
      delete d._id;
      // Convert any ObjectId fields
      for (const [key, value] of Object.entries(d)) {
        if (value && typeof value === 'object' && value.toString && (value as any)._bsontype) {
          d[key] = value.toString();
        }
      }
      return d;
    });

    await index.addDocuments(formatted);

    total += docs.length;
    skip += batchSize;

    console.log(`Synced ${total} documents to ${indexName}`);
  }

  return total;
}
```

### 6.5 Search API Endpoint

**File:** `app/api/search/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getMeiliClient } from '@/lib/search/client';
import { verifyAuthToken } from '@/lib/mongodb/auth';

export async function GET(request: NextRequest) {
  const user = await verifyAuthToken(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const type = searchParams.get('type') || 'leads';   // leads, contacts, tasks, messages
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = parseInt(searchParams.get('offset') || '0');
  const filters = searchParams.get('filters') || '';

  const meili = getMeiliClient();
  const index = meili.index(type);

  // Always filter by workspace for multi-tenancy
  const workspaceFilter = `workspaceId = "${user.activeWorkspace}"`;
  const combinedFilter = filters
    ? `${workspaceFilter} AND ${filters}`
    : workspaceFilter;

  const results = await index.search(query, {
    filter: combinedFilter,
    limit,
    offset,
    sort: query ? undefined : ['createdAt:desc'], // relevance sort when searching, date sort when browsing
    attributesToHighlight: ['name', 'email', 'company', 'content', 'title'],
    highlightPreTag: '<mark>',
    highlightPostTag: '</mark>',
  });

  return NextResponse.json({
    hits: results.hits,
    total: results.estimatedTotalHits,
    query: results.query,
    processingTimeMs: results.processingTimeMs,
    pagination: { limit, offset }
  });
}
```

### 6.6 Performance Comparison

| Metric              | MongoDB `$regex`       | Meilisearch            |
| -------------------- | ---------------------- | ---------------------- |
| 100K documents       | 200-500ms              | 2-5ms                  |
| 1M documents         | 2-5 seconds            | 5-15ms                 |
| 10M documents        | 10-30 seconds (or OOM) | 15-50ms                |
| Typo tolerance       | None                   | Built-in (automatic)   |
| Autocomplete         | None                   | Built-in               |
| Relevance scoring    | None                   | TF-IDF based           |
| Highlighting         | Manual                 | Built-in               |
| Faceted search       | Manual aggregation     | Built-in               |
| RAM usage (10M docs) | N/A                    | ~500MB-1GB             |

---

## 7. Tier 5: Logging Optimization

### 7.1 The Problem

Current Winston setup creates **6 I/O streams** per log message:
1. Application log (daily rotating file)
2. Error log (daily rotating file)
3. Security log (daily rotating file)
4. Performance log (daily rotating file)
5. Exception handler (file)
6. Rejection handler (file)

Each `logger.info()` call triggers multiple synchronous disk writes. At 10K requests/second, this becomes a major bottleneck.

### 7.2 Option A: Switch to Pino (Recommended — 5x Faster)

Pino is the fastest Node.js logger. It writes JSON to stdout asynchronously and lets external tools handle routing/storage.

```bash
npm install pino pino-pretty
```

**File:** `lib/logging/logger.ts` (replacement)

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',

  // Structured JSON output
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      hostname: bindings.hostname,
      service: 'crm-saas'
    })
  },

  // Pretty print only in development
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,

  // Redact sensitive fields
  redact: {
    paths: [
      'password', 'token', 'secret', 'apiKey',
      'authorization', 'cookie', 'creditCard',
      '*.password', '*.token', '*.secret'
    ],
    censor: '[REDACTED]'
  },

  // Add timestamp
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Specialized child loggers
export const securityLogger = logger.child({ category: 'security' });
export const performanceLogger = logger.child({ category: 'performance' });
export const databaseLogger = logger.child({ category: 'database' });
export const httpLogger = logger.child({ category: 'http' });

export default logger;
```

**Log shipping in production (stdout → Grafana Loki):**

```yaml
# docker-compose.yml — add log driver
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
    # Loki agent picks up stdout logs automatically
```

### 7.3 Option B: Optimize Existing Winston

If you prefer to keep Winston, reduce the I/O:

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Production: stdout only (Docker/K8s captures it)
    new winston.transports.Console({
      level: 'info',
      stderrLevels: ['error']
    })
  ]
});

// Only add file transports in development
if (process.env.NODE_ENV === 'development') {
  logger.add(new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error'
  }));
  logger.add(new winston.transports.File({
    filename: 'logs/combined.log'
  }));
}
```

### 7.4 Logging Middleware Optimization

**File:** `lib/logging/middleware.ts`

```typescript
// BEFORE: clones request body twice, logs everything
export function withLogging(handler) {
  return async (request) => {
    const body = await request.clone().json(); // clone #1
    const body2 = await request.clone().json(); // clone #2 for handler
    logger.info('Request', { method, url, body }); // logs full body
    // ...
  };
}

// AFTER: log only what matters, no body cloning for GET requests
export function withLogging(handler) {
  return async (request) => {
    const start = Date.now();

    const response = await handler(request);

    const duration = Date.now() - start;

    // Only log slow requests or errors in production
    if (duration > 1000 || response.status >= 400) {
      logger.warn('Slow/error request', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration
      });
    } else if (process.env.NODE_ENV === 'development') {
      logger.debug('Request', {
        method: request.method,
        url: request.url,
        status: response.status,
        duration
      });
    }

    return response;
  };
}
```

---

## 8. Tier 6: CDN & Edge Caching

### 8.1 Cloudflare (Free Tier)

Cloudflare's free tier provides:
- Global CDN (300+ edge locations)
- DDoS protection (unlimited)
- SSL/TLS termination
- Browser caching
- Edge caching for API responses

**Setup:**
1. Add your domain to Cloudflare
2. Update DNS nameservers
3. Enable "Proxy" (orange cloud) for your domain
4. Configure page rules or cache rules

### 8.2 API Response Cache Headers

**File:** `next.config.js`

```javascript
module.exports = {
  async headers() {
    return [
      {
        // Static assets — cache for 1 year
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
        ]
      },
      {
        // API: Analytics — cache at edge for 5 minutes
        source: '/api/analytics/:path*',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=300, stale-while-revalidate=600' }
        ]
      },
      {
        // API: Lead list — cache at edge for 1 minute
        source: '/api/leads',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=60, stale-while-revalidate=120' }
        ]
      },
      {
        // API: Workflow catalog — cache at edge for 1 hour
        source: '/api/engines/catalog',
        headers: [
          { key: 'Cache-Control', value: 's-maxage=3600, stale-while-revalidate=7200' }
        ]
      },
      {
        // API: Mutations — never cache
        source: '/api/:path*',
        has: [{ type: 'header', key: 'x-method', value: '(POST|PUT|PATCH|DELETE)' }],
        headers: [
          { key: 'Cache-Control', value: 'no-store' }
        ]
      }
    ];
  }
};
```

### 8.3 MinIO Files Through CDN

Instead of serving MinIO presigned URLs directly (which bypass the CDN), proxy file downloads through your app with cache headers:

```typescript
// app/api/files/[...path]/route.ts
export async function GET(request: NextRequest, { params }) {
  const filePath = params.path.join('/');

  // Get file from MinIO
  const stream = await minioClient.getObject(BUCKET_NAME, filePath);

  return new NextResponse(stream, {
    headers: {
      'Content-Type': getMimeType(filePath),
      'Cache-Control': 'public, max-age=31536000, immutable', // CDN caches for 1 year
      'CDN-Cache-Control': 'max-age=31536000',
    }
  });
}
```

---

## 9. Tier 7: MongoDB Replica Set & Sharding

### 9.1 Replica Set (Read Scaling + High Availability)

A replica set gives you:
- **Read scaling:** Route read queries to secondary nodes
- **High availability:** Automatic failover if primary goes down
- **Zero downtime backups:** Back up from secondary without affecting primary

**File:** `docker-compose.yml` (replica set configuration)

```yaml
services:
  mongo-primary:
    image: mongo:7.0
    container_name: crm-mongo-primary
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27017:27017"
    volumes:
      - mongo_primary_data:/data/db
    networks:
      - crm-network

  mongo-secondary-1:
    image: mongo:7.0
    container_name: crm-mongo-secondary-1
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27018:27017"
    volumes:
      - mongo_secondary1_data:/data/db
    networks:
      - crm-network
    depends_on:
      - mongo-primary

  mongo-secondary-2:
    image: mongo:7.0
    container_name: crm-mongo-secondary-2
    command: mongod --replSet rs0 --bind_ip_all
    ports:
      - "27019:27017"
    volumes:
      - mongo_secondary2_data:/data/db
    networks:
      - crm-network
    depends_on:
      - mongo-primary

  mongo-init:
    image: mongo:7.0
    depends_on:
      - mongo-primary
      - mongo-secondary-1
      - mongo-secondary-2
    command: >
      mongosh --host mongo-primary:27017 --eval '
        rs.initiate({
          _id: "rs0",
          members: [
            { _id: 0, host: "mongo-primary:27017", priority: 2 },
            { _id: 1, host: "mongo-secondary-1:27017", priority: 1 },
            { _id: 2, host: "mongo-secondary-2:27017", priority: 1 }
          ]
        })
      '
    networks:
      - crm-network

volumes:
  mongo_primary_data:
  mongo_secondary1_data:
  mongo_secondary2_data:
```

**Connection string for replica set:**
```
MONGODB_URI=mongodb://mongo-primary:27017,mongo-secondary-1:27017,mongo-secondary-2:27017/crm?replicaSet=rs0
```

### 9.2 Read from Secondaries

```typescript
// For read-heavy, non-critical queries (analytics, lists, search):
const leads = await Lead.find(query)
  .read('secondaryPreferred')  // read from secondary if available
  .lean();

// For critical reads (auth, payments, real-time data):
const user = await User.findById(id)
  .read('primary')  // always read from primary
  .lean();
```

### 9.3 Sharding Strategy (10M+ Users)

When a single replica set can't handle the write load, shard by `workspaceId`:

```javascript
// Shard key: workspaceId (ensures all data for a workspace is on the same shard)
sh.shardCollection("crm.leads", { workspaceId: "hashed" });
sh.shardCollection("crm.activities", { workspaceId: "hashed" });
sh.shardCollection("crm.notifications", { workspaceId: "hashed" });
sh.shardCollection("crm.messages", { workspaceId: "hashed" });
```

**Why `workspaceId`?**
- All queries in the app filter by `workspaceId` (multi-tenant)
- Keeps related data together (no cross-shard queries)
- Even distribution with `"hashed"` strategy
- Scales linearly: add more shards as workspaces grow

---

## 10. Tier 8: Horizontal Scaling

### 10.1 Multiple Next.js Instances Behind Load Balancer

```yaml
# docker-compose.yml
services:
  app-1:
    build: .
    environment:
      - INSTANCE_ID=1
    networks:
      - crm-network

  app-2:
    build: .
    environment:
      - INSTANCE_ID=2
    networks:
      - crm-network

  app-3:
    build: .
    environment:
      - INSTANCE_ID=3
    networks:
      - crm-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - app-1
      - app-2
      - app-3
    networks:
      - crm-network
```

**File:** `nginx.conf`

```nginx
upstream crm_app {
    least_conn;  # route to least-busy instance
    server app-1:3000;
    server app-2:3000;
    server app-3:3000;
}

server {
    listen 80;
    server_name yourdomain.com;

    # Gzip compression
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1000;

    # Connection limits
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
    limit_conn conn_limit 50;

    location / {
        proxy_pass http://crm_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Socket.io — sticky sessions required
    location /socket.io/ {
        proxy_pass http://crm_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;

        # Sticky session via IP hash for WebSocket
        ip_hash;
    }

    # Static file caching
    location /_next/static/ {
        proxy_pass http://crm_app;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 10.2 Checklist for Multi-Instance Readiness

Before running multiple instances, ensure:

- [x] Redis for rate limiting (not in-memory Map)
- [x] Redis for sessions (not in-memory)
- [x] Redis adapter for Socket.io
- [x] BullMQ workers (only run on designated worker instances)
- [x] Shared file storage (MinIO is already external)
- [x] No in-memory state in API routes
- [x] Stateless JWT verification (or Redis session check)

---

## 11. Monitoring & Observability

### 11.1 Free Self-Hosted Stack: Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - crm-network

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    networks:
      - crm-network

  loki:
    image: grafana/loki:latest
    ports:
      - "3100:3100"
    volumes:
      - loki_data:/loki
    networks:
      - crm-network
```

### 11.2 Key Metrics to Track

| Metric                         | Alert Threshold    | Tool              |
| ------------------------------ | ------------------ | ----------------- |
| API response time (p95)        | > 500ms            | Prometheus        |
| API response time (p99)        | > 2000ms           | Prometheus        |
| Error rate (5xx)               | > 1%               | Prometheus        |
| MongoDB query time (p95)       | > 200ms            | Prometheus        |
| Redis hit rate                 | < 80%              | Redis INFO        |
| Redis memory usage             | > 80% of max       | Redis INFO        |
| BullMQ queue depth             | > 10,000           | BullMQ Dashboard  |
| BullMQ failed jobs             | > 100/hour         | BullMQ Dashboard  |
| MongoDB connection pool usage  | > 80%              | Mongoose events   |
| Node.js event loop lag         | > 100ms            | Prometheus        |
| Node.js heap usage             | > 80% of limit     | Prometheus        |
| Disk usage                     | > 85%              | Prometheus        |

### 11.3 Add Metrics Endpoint

```bash
npm install prom-client
```

```typescript
// lib/metrics/prometheus.ts
import { collectDefaultMetrics, Registry, Histogram, Counter } from 'prom-client';

const register = new Registry();
collectDefaultMetrics({ register });

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [register]
});

export const httpRequestTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'collection'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register]
});

export const cacheHitTotal = new Counter({
  name: 'cache_hits_total',
  help: 'Total cache hits',
  labelNames: ['cache_type'],
  registers: [register]
});

export const cacheMissTotal = new Counter({
  name: 'cache_misses_total',
  help: 'Total cache misses',
  labelNames: ['cache_type'],
  registers: [register]
});

export { register };
```

```typescript
// app/api/metrics/route.ts
import { register } from '@/lib/metrics/prometheus';

export async function GET() {
  const metrics = await register.metrics();
  return new Response(metrics, {
    headers: { 'Content-Type': register.contentType }
  });
}
```

---

## 12. Final Architecture Diagram

```
                         ┌──────────────────────────┐
                         │      Cloudflare CDN       │
                         │  (Free - DDoS + Cache)    │
                         └────────────┬─────────────┘
                                      │
                         ┌────────────▼─────────────┐
                         │     Nginx Load Balancer   │
                         │   (Gzip + SSL + Sticky)   │
                         └───┬────────┬────────┬────┘
                             │        │        │
                    ┌────────▼──┐ ┌───▼────┐ ┌─▼────────┐
                    │ Next.js   │ │Next.js │ │ Next.js  │
                    │ Instance 1│ │Inst. 2 │ │ Inst. 3  │
                    └──┬──┬──┬──┘ └──┬──┬──┘ └──┬──┬──┬─┘
                       │  │  │       │  │       │  │  │
          ┌────────────┘  │  └───────┼──┼───────┘  │  └──────────┐
          │               │         │  │           │             │
   ┌──────▼───────┐ ┌─────▼──────┐ ┌▼──▼───────┐ ┌▼─────────┐  │
   │    Redis     │ │  MongoDB   │ │Meilisearch│ │  MinIO    │  │
   │   (256MB)    │ │ Replica Set│ │ (Search)  │ │ (Files)   │  │
   │              │ │            │ │           │ │           │  │
   │ - Cache      │ │ - Primary  │ │ - Leads   │ │ - Images  │  │
   │ - Sessions   │ │ - Second.1 │ │ - Contacts│ │ - Docs    │  │
   │ - Rate Limit │ │ - Second.2 │ │ - Tasks   │ │ - Chat    │  │
   │ - Pub/Sub    │ │            │ │ - Messages│ │           │  │
   │ - Counters   │ │            │ │           │ │           │  │
   └──────┬───────┘ └────────────┘ └───────────┘ └───────────┘  │
          │                                                      │
   ┌──────▼───────────────────────────────────────────────────────┘
   │  BullMQ Workers (on Redis)
   │
   │  ┌─────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
   │  │ Email   │ │ Notification │ │ Webhook  │ │ Activity │
   │  │ Worker  │ │ Worker       │ │ Worker   │ │ Worker   │
   │  │ (x10)   │ │ (x5)        │ │ (x20)    │ │ (x5)     │
   │  └─────────┘ └──────────────┘ └──────────┘ └──────────┘
   │
   └───────────────────────────────────────────────────────────

   ┌───────────────────────────────────────────────────────────┐
   │  Monitoring (Self-Hosted, Free)                           │
   │  Prometheus → Grafana (Dashboards + Alerts)               │
   │  Loki (Log Aggregation from stdout)                       │
   └───────────────────────────────────────────────────────────┘
```

---

## 13. Implementation Priority Checklist

### Phase 1: Critical Fixes (Day 1-2)
- [ ] Fix analytics dashboard — replace in-memory filtering with aggregation pipeline
- [ ] Fix Message readBy — move to separate MessageRead collection
- [ ] Remove all console.log from API routes
- [ ] Fix N+1 queries in cleanup job — use bulk operations

### Phase 2: Redis Integration (Day 3-5)
- [ ] Add Redis to docker-compose
- [ ] Create Redis client (`lib/redis/client.ts`)
- [ ] Implement cache utility (`lib/redis/cache.ts`)
- [ ] Add caching to top 5 most-hit API routes (leads, analytics, members, notifications, tasks)
- [ ] Replace in-memory rate limiter with Redis rate limiter
- [ ] Add Redis session store for token revocation
- [ ] Add Socket.io Redis adapter

### Phase 3: BullMQ Queues (Day 6-8)
- [ ] Install BullMQ
- [ ] Create queue definitions
- [ ] Create email worker
- [ ] Create notification worker
- [ ] Create webhook worker
- [ ] Create activity logging worker
- [ ] Update all API routes to use queues instead of sync calls
- [ ] Add BullMQ dashboard for monitoring

### Phase 4: Database Optimization (Day 9-11)
- [ ] Add compound indexes to all models
- [ ] Add text indexes for search
- [ ] Implement cursor-based pagination
- [ ] Add .select() projections to all list queries
- [ ] Tune connection pool settings
- [ ] Convert bulk operations from loops to bulkWrite

### Phase 5: Search (Day 12-14)
- [ ] Add Meilisearch to docker-compose
- [ ] Create search client and index configuration
- [ ] Create sync service (MongoDB → Meilisearch)
- [ ] Run initial bulk sync for all collections
- [ ] Create unified search API endpoint
- [ ] Update frontend search to use new endpoint
- [ ] Add search sync to create/update/delete hooks

### Phase 6: Logging & CDN (Day 15-17)
- [ ] Switch from Winston file transports to Pino (stdout)
- [ ] Optimize logging middleware (remove body cloning, log only slow/error)
- [ ] Set up Cloudflare (free tier)
- [ ] Configure cache headers in next.config.js
- [ ] Set up Grafana + Loki for log aggregation

### Phase 7: Scaling Infrastructure (Day 18-21)
- [ ] Set up MongoDB replica set
- [ ] Configure read preferences for queries
- [ ] Add Nginx load balancer
- [ ] Deploy multiple Next.js instances
- [ ] Set up Prometheus + Grafana monitoring
- [ ] Add health check endpoints
- [ ] Load test with k6 or Artillery

---

## 14. Benchmarks & Targets

### API Response Time Targets

| Endpoint             | Current (est.) | Target (p95) | How                              |
| -------------------- | -------------- | ------------- | -------------------------------- |
| GET /api/leads       | 200-800ms      | < 50ms        | Redis cache + projection         |
| POST /api/leads      | 400-2600ms     | < 100ms       | BullMQ for side effects          |
| GET /api/analytics   | 2-10s          | < 200ms       | Aggregation + Redis cache        |
| GET /api/search?q=   | 2-5s           | < 50ms        | Meilisearch                      |
| GET /api/notifications | 100-300ms    | < 30ms        | Redis counters + cache           |
| POST /api/chat/messages | 100-300ms   | < 50ms        | Queue notifications + cache      |
| GET /api/webhooks    | 50-100ms       | < 20ms        | Redis cache                      |

### Infrastructure Targets

| Metric                  | Target               |
| ----------------------- | -------------------- |
| Redis cache hit rate    | > 90%                |
| API error rate (5xx)    | < 0.1%               |
| MongoDB p95 query time  | < 100ms              |
| BullMQ queue depth      | < 1,000 (normal)     |
| Uptime                  | 99.9%                |
| Time to first byte      | < 100ms              |

### Load Testing with k6

```bash
npm install -g k6
```

```javascript
// loadtest.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // ramp to 100 users
    { duration: '5m', target: 1000 },  // ramp to 1000 users
    { duration: '2m', target: 5000 },  // ramp to 5000 users
    { duration: '5m', target: 5000 },  // stay at 5000
    { duration: '2m', target: 0 },     // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  }
};

export default function () {
  const res = http.get('https://yourdomain.com/api/leads?limit=20', {
    headers: { Authorization: `Bearer ${__ENV.TOKEN}` }
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(1);
}
```

```bash
k6 run --env TOKEN=your-jwt-token loadtest.js
```

---

## Quick Reference: Package Installations

```bash
# All new packages needed
npm install ioredis bullmq meilisearch pino pino-pretty prom-client @socket.io/redis-adapter

# Dev dependencies for load testing
npm install -D k6
```

## Quick Reference: Environment Variables

```env
# Add to .env
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

MEILI_HOST=http://meilisearch:7700
MEILI_MASTER_KEY=your-master-key-change-me

LOG_LEVEL=info
```

---

## Summary

The total cost of this optimization is **$5-15/month** (managed Redis) or **$0** (self-hosted everything). The architecture goes from handling ~1,000 concurrent users to **100,000+ concurrent users** with the same hardware, primarily through:

1. **Redis caching** — eliminates 90% of database reads
2. **BullMQ queues** — eliminates 300-2600ms of blocking operations per request
3. **Meilisearch** — eliminates collection-scan searches
4. **MongoDB optimizations** — indexes, aggregations, projections, cursor pagination
5. **Horizontal scaling** — multiple instances behind a load balancer

The key principle: **push expensive work out of the request path**. Cache reads, queue writes, and let background workers handle the heavy lifting.
