# CRM SaaS — Monitoring, Metrics & Alerting Plan

## Overview

Add full observability to the CRM SaaS using Prometheus + Grafana. This plan covers app-level instrumentation, infrastructure monitoring, dashboards, and alerting. Everything is defined as code in the repo — portable across GCP, AWS, or self-hosted.

---

## Current State

| Component                               | Status                         |
| --------------------------------------- | ------------------------------ |
| Winston logging (security, audit, perf) | Done                           |
| BullMQ queue monitoring                 | Partial (logs only)            |
| `/api/health` endpoint                  | Referenced but NOT implemented |
| `/api/metrics` endpoint                 | Not implemented                |
| Prometheus                              | Not set up                     |
| Grafana                                 | Not set up                     |
| Alerting                                | Not set up                     |
| prom-client npm package                 | Not installed                  |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CRM SaaS App                         │
│                                                         │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ /api/    │  │ /api/metrics │  │ Custom Metrics    │  │
│  │ health   │  │ (Prometheus) │  │ (prom-client)     │  │
│  └──────────┘  └──────┬───────┘  └────────┬──────────┘  │
│                       │                    │             │
└───────────────────────┼────────────────────┼─────────────┘
                        │                    │
                  ┌─────▼────────────────────▼──────┐
                  │         Prometheus               │
                  │  (scrapes /api/metrics every 15s)│
                  └─────────────┬────────────────────┘
                                │
                  ┌─────────────▼────────────────────┐
                  │          Grafana                  │
                  │  ┌────────────┐ ┌──────────────┐ │
                  │  │ Dashboards │ │ Alert Rules  │ │
                  │  └────────────┘ └──────┬───────┘ │
                  └────────────────────────┼─────────┘
                                           │
                              ┌────────────▼──────────┐
                              │  Notifications        │
                              │  - Email (Resend)     │
                              │  - Slack webhook      │
                              │  - Discord webhook    │
                              └───────────────────────┘
```

---

## Implementation Steps

### Phase 1: App Instrumentation

#### 1.1 Install prom-client

```bash
npm install prom-client
```

#### 1.2 Create metrics registry — `lib/metrics/registry.ts`

```typescript
import client from 'prom-client'

// Create a custom registry
export const register = new client.Registry()

// Add default Node.js metrics (CPU, memory, event loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'crm_',
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
})

// Export client for creating custom metrics
export { client }
```

#### 1.3 Define custom metrics — `lib/metrics/custom.ts`

```typescript
import { client, register } from './registry'

// ── HTTP Metrics ──────────────────────────────────────

export const httpRequestDuration = new client.Histogram({
  name: 'crm_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
})

export const httpRequestsTotal = new client.Counter({
  name: 'crm_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

export const httpActiveRequests = new client.Gauge({
  name: 'crm_http_active_requests',
  help: 'Number of active HTTP requests',
  registers: [register],
})

// ── Auth Metrics ──────────────────────────────────────

export const authLoginTotal = new client.Counter({
  name: 'crm_auth_login_total',
  help: 'Total login attempts',
  labelNames: ['status'], // success, failed, locked
  registers: [register],
})

export const authActiveSessionsGauge = new client.Gauge({
  name: 'crm_auth_active_sessions',
  help: 'Number of active user sessions',
  registers: [register],
})

// ── Database Metrics ──────────────────────────────────

export const dbQueryDuration = new client.Histogram({
  name: 'crm_db_query_duration_seconds',
  help: 'Duration of database queries',
  labelNames: ['operation', 'collection'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
})

export const dbConnectionPool = new client.Gauge({
  name: 'crm_db_connection_pool',
  help: 'MongoDB connection pool status',
  labelNames: ['state'], // active, available, idle
  registers: [register],
})

// ── Redis Metrics ─────────────────────────────────────

export const redisCommandDuration = new client.Histogram({
  name: 'crm_redis_command_duration_seconds',
  help: 'Duration of Redis commands',
  labelNames: ['command'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [register],
})

export const redisConnectionStatus = new client.Gauge({
  name: 'crm_redis_connected',
  help: 'Redis connection status (1=connected, 0=disconnected)',
  registers: [register],
})

// ── Queue Metrics (BullMQ) ────────────────────────────

export const queueJobsTotal = new client.Counter({
  name: 'crm_queue_jobs_total',
  help: 'Total jobs processed by queue',
  labelNames: ['queue', 'status'], // completed, failed, delayed
  registers: [register],
})

export const queueJobDuration = new client.Histogram({
  name: 'crm_queue_job_duration_seconds',
  help: 'Duration of queue job processing',
  labelNames: ['queue'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [register],
})

export const queueDepth = new client.Gauge({
  name: 'crm_queue_depth',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue', 'state'], // waiting, active, delayed, failed
  registers: [register],
})

// ── Business Metrics ──────────────────────────────────

export const leadsCreatedTotal = new client.Counter({
  name: 'crm_leads_created_total',
  help: 'Total leads created',
  labelNames: ['workspace', 'source'],
  registers: [register],
})

export const workspaceActiveUsers = new client.Gauge({
  name: 'crm_workspace_active_users',
  help: 'Number of active users per workspace',
  labelNames: ['workspace'],
  registers: [register],
})

export const emailsSentTotal = new client.Counter({
  name: 'crm_emails_sent_total',
  help: 'Total emails sent',
  labelNames: ['type', 'status'], // transactional/campaign, success/failed
  registers: [register],
})

export const socketConnectionsGauge = new client.Gauge({
  name: 'crm_socket_active_connections',
  help: 'Number of active Socket.io connections',
  registers: [register],
})

// ── Rate Limiting Metrics ─────────────────────────────

export const rateLimitHitsTotal = new client.Counter({
  name: 'crm_rate_limit_hits_total',
  help: 'Total rate limit hits',
  labelNames: ['route'],
  registers: [register],
})

// ── Error Metrics ─────────────────────────────────────

export const errorsTotal = new client.Counter({
  name: 'crm_errors_total',
  help: 'Total application errors',
  labelNames: ['type', 'route'], // unhandled, validation, auth, db
  registers: [register],
})
```

#### 1.4 Create metrics middleware — `lib/metrics/middleware.ts`

Wrap every API route handler to auto-record:

- Request count (`crm_http_requests_total`)
- Request duration (`crm_http_request_duration_seconds`)
- Active requests (`crm_http_active_requests`)
- Error counting (`crm_errors_total`)

```typescript
// Usage in any API route:
// export const GET = withMetrics(handler, '/api/leads');
```

#### 1.5 Implement `/api/health` — `app/api/health/route.ts`

```typescript
// Returns:
// {
//   status: "healthy" | "degraded" | "unhealthy",
//   timestamp: "2024-...",
//   uptime: 12345,
//   checks: {
//     mongodb: { status: "up", latency_ms: 2 },
//     redis: { status: "up", latency_ms: 1 },
//     queues: {
//       email: { waiting: 0, active: 0, failed: 0 },
//       notifications: { waiting: 0, active: 0, failed: 0 },
//       webhooks: { waiting: 0, active: 0, failed: 0 },
//       activity: { waiting: 0, active: 0, failed: 0 }
//     }
//   },
//   memory: { rss: "120MB", heapUsed: "80MB", heapTotal: "150MB" }
// }
//
// Status codes:
//   200 — all healthy
//   207 — degraded (redis down but mongo up)
//   503 — unhealthy (mongo down)
```

#### 1.6 Implement `/api/metrics` — `app/api/metrics/route.ts`

```typescript
// Serves Prometheus text format from the registry
// Protected: only allow from Prometheus scraper IP or internal network
// Content-Type: text/plain; version=0.0.4; charset=utf-8
```

---

### Phase 2: Infrastructure — Prometheus & Grafana

#### 2.1 Create `docker-compose.monitoring.yml`

```yaml
services:
  prometheus:
    image: prom/prometheus:v2.53.0
    container_name: crm-prometheus
    restart: unless-stopped
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/prometheus/alert-rules.yml:/etc/prometheus/alert-rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    networks:
      - crm-monitoring

  grafana:
    image: grafana/grafana:11.1.0
    container_name: crm-grafana
    restart: unless-stopped
    ports:
      - '3001:3000'
    environment:
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_ADMIN_PASSWORD:-changeme}
      - GF_USERS_ALLOW_SIGN_UP=false
      - GF_SERVER_ROOT_URL=https://grafana.yourdomain.com
    volumes:
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus
    networks:
      - crm-monitoring

  # Optional: Node exporter for host machine metrics
  node-exporter:
    image: prom/node-exporter:v1.8.1
    container_name: crm-node-exporter
    restart: unless-stopped
    ports:
      - '9100:9100'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--path.rootfs=/rootfs'
    networks:
      - crm-monitoring

  # Optional: Redis exporter
  redis-exporter:
    image: oliver006/redis_exporter:v1.61.0
    container_name: crm-redis-exporter
    restart: unless-stopped
    ports:
      - '9121:9121'
    environment:
      - REDIS_ADDR=redis://redis:6379
    networks:
      - crm-monitoring

  # Optional: MongoDB exporter
  mongodb-exporter:
    image: percona/mongodb_exporter:0.40.0
    container_name: crm-mongodb-exporter
    restart: unless-stopped
    ports:
      - '9216:9216'
    environment:
      - MONGODB_URI=${MONGODB_URI}
    command:
      - '--collect-all'
    networks:
      - crm-monitoring

volumes:
  prometheus_data:
  grafana_data:

networks:
  crm-monitoring:
    driver: bridge
```

#### 2.2 Prometheus config — `monitoring/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  scrape_timeout: 10s

rule_files:
  - alert-rules.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: [] # Add Alertmanager if needed later

scrape_configs:
  # CRM App metrics
  - job_name: 'crm-app'
    metrics_path: '/api/metrics'
    scrape_interval: 15s
    static_configs:
      - targets: ['app:3000']
        labels:
          app: 'crm-sass'
          env: 'production'

  # Node exporter (host machine)
  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  # Redis exporter
  - job_name: 'redis'
    static_configs:
      - targets: ['redis-exporter:9121']

  # MongoDB exporter
  - job_name: 'mongodb'
    static_configs:
      - targets: ['mongodb-exporter:9216']

  # Prometheus self-monitoring
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']
```

---

### Phase 3: Alert Rules

#### 3.1 Alert rules — `monitoring/prometheus/alert-rules.yml`

```yaml
groups:
  # ── Application Alerts ──────────────────────────────
  - name: crm_app_alerts
    rules:
      # High error rate (>5% of requests returning 5xx)
      - alert: HighErrorRate
        expr: |
          sum(rate(crm_http_requests_total{status_code=~"5.."}[5m]))
          /
          sum(rate(crm_http_requests_total[5m]))
          > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'High 5xx error rate ({{ $value | humanizePercentage }})'
          description: 'More than 5% of requests are failing with 5xx errors for the last 5 minutes.'

      # Slow response times (p95 > 2s)
      - alert: SlowResponses
        expr: |
          histogram_quantile(0.95, rate(crm_http_request_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Slow API responses (p95 = {{ $value }}s)'
          description: '95th percentile response time is above 2 seconds.'

      # App down (no metrics for 2 minutes)
      - alert: AppDown
        expr: up{job="crm-app"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'CRM App is DOWN'
          description: 'The CRM application has been unreachable for over 2 minutes.'

      # High memory usage (>85% of container limit)
      - alert: HighMemoryUsage
        expr: |
          crm_process_resident_memory_bytes / (1024 * 1024 * 1024) > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High memory usage ({{ $value | humanize }}GB)'

      # Too many active requests (possible overload)
      - alert: HighConcurrency
        expr: crm_http_active_requests > 100
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: '{{ $value }} concurrent requests — possible overload'

  # ── Auth Alerts ─────────────────────────────────────
  - name: crm_auth_alerts
    rules:
      # Brute force detection (>20 failed logins in 5 min)
      - alert: BruteForceDetected
        expr: |
          sum(rate(crm_auth_login_total{status="failed"}[5m])) * 300 > 20
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: 'Possible brute force attack — {{ $value }} failed logins in 5 min'

      # Login success rate dropping
      - alert: LowLoginSuccessRate
        expr: |
          sum(rate(crm_auth_login_total{status="success"}[15m]))
          /
          sum(rate(crm_auth_login_total[15m]))
          < 0.7
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Login success rate dropped to {{ $value | humanizePercentage }}'

  # ── Database Alerts ─────────────────────────────────
  - name: crm_database_alerts
    rules:
      # MongoDB connection down
      - alert: MongoDBDown
        expr: crm_db_connection_pool{state="active"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'MongoDB connection pool has 0 active connections'

      # Slow queries (p95 > 500ms)
      - alert: SlowDatabaseQueries
        expr: |
          histogram_quantile(0.95, rate(crm_db_query_duration_seconds_bucket[5m])) > 0.5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Slow DB queries — p95 = {{ $value }}s'

      # Connection pool exhaustion (>80% used)
      - alert: ConnectionPoolExhaustion
        expr: |
          crm_db_connection_pool{state="active"}
          /
          (crm_db_connection_pool{state="active"} + crm_db_connection_pool{state="available"})
          > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'MongoDB connection pool >80% utilized'

  # ── Redis Alerts ────────────────────────────────────
  - name: crm_redis_alerts
    rules:
      - alert: RedisDown
        expr: crm_redis_connected == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: 'Redis connection is DOWN'

  # ── Queue Alerts ────────────────────────────────────
  - name: crm_queue_alerts
    rules:
      # Queue backlog (>100 waiting jobs)
      - alert: QueueBacklog
        expr: crm_queue_depth{state="waiting"} > 100
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Queue {{ $labels.queue }} has {{ $value }} waiting jobs'

      # Queue failures (>10 failed in 5 min)
      - alert: QueueHighFailureRate
        expr: |
          sum(rate(crm_queue_jobs_total{status="failed"}[5m])) by (queue) * 300 > 10
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Queue {{ $labels.queue }} — {{ $value }} failures in 5 min'

      # Dead letter queue growing (failed jobs not being retried)
      - alert: QueueDeadLetterGrowing
        expr: crm_queue_depth{state="failed"} > 50
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: '{{ $value }} failed jobs stuck in {{ $labels.queue }} queue'

  # ── Email Alerts ────────────────────────────────────
  - name: crm_email_alerts
    rules:
      - alert: EmailDeliveryFailures
        expr: |
          sum(rate(crm_emails_sent_total{status="failed"}[15m]))
          /
          sum(rate(crm_emails_sent_total[15m]))
          > 0.1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: 'Email delivery failure rate is {{ $value | humanizePercentage }}'

  # ── Rate Limiting Alerts ────────────────────────────
  - name: crm_ratelimit_alerts
    rules:
      - alert: ExcessiveRateLimiting
        expr: |
          sum(rate(crm_rate_limit_hits_total[5m])) * 300 > 50
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: '{{ $value }} rate limit hits in 5 minutes'

  # ── Infrastructure Alerts (Node Exporter) ───────────
  - name: infra_alerts
    rules:
      - alert: HighCPUUsage
        expr: |
          100 - (avg(rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 85
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Host CPU usage is {{ $value }}%'

      - alert: HighDiskUsage
        expr: |
          (node_filesystem_size_bytes{mountpoint="/"} - node_filesystem_free_bytes{mountpoint="/"})
          /
          node_filesystem_size_bytes{mountpoint="/"}
          * 100 > 85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'Disk usage is {{ $value }}%'

      - alert: HighRAMUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes)
          /
          node_memory_MemTotal_bytes
          * 100 > 90
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'RAM usage is {{ $value }}%'
```

---

### Phase 4: Grafana Dashboards

#### 4.1 Grafana provisioning — `monitoring/grafana/provisioning/datasources/prometheus.yml`

```yaml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: false
```

#### 4.2 Dashboard provisioning — `monitoring/grafana/provisioning/dashboards/dashboards.yml`

```yaml
apiVersion: 1
providers:
  - name: 'CRM Dashboards'
    orgId: 1
    folder: 'CRM SaaS'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: false
```

#### 4.3 Dashboards to create (JSON files in `monitoring/grafana/dashboards/`)

**Dashboard 1: `app-overview.json` — Application Overview**

```
Panels:
├── Request Rate (req/sec) — timeseries
├── Error Rate (%) — stat with threshold colors
├── Response Time (p50, p95, p99) — timeseries
├── Active Requests — gauge
├── Requests by Route (top 10) — bar chart
├── Status Code Distribution (2xx/4xx/5xx) — pie chart
├── Uptime — stat
└── Node.js Memory (heap used vs total) — timeseries
```

**Dashboard 2: `database.json` — Database & Redis**

```
Panels:
├── MongoDB Query Duration (p50, p95) — timeseries
├── Query Rate by Collection — timeseries
├── Connection Pool (active/available) — gauge
├── Slow Queries (>500ms) — table
├── Redis Connected Status — stat
├── Redis Command Duration — timeseries
├── Redis Memory Usage — timeseries
└── Redis Commands/sec — timeseries
```

**Dashboard 3: `queues.json` — BullMQ Queues**

```
Panels:
├── Queue Depth by Queue — timeseries (email, notifications, webhooks, activity)
├── Job Processing Rate — timeseries
├── Job Duration by Queue — timeseries
├── Failed Jobs (per queue) — stat with alert threshold
├── Completed vs Failed — stacked bar
├── Retry Rate — timeseries
└── Dead Letter Queue Size — stat
```

**Dashboard 4: `auth-security.json` — Auth & Security**

```
Panels:
├── Login Attempts (success/failed) — timeseries
├── Login Success Rate — gauge
├── Active Sessions — stat
├── Rate Limit Hits by Route — timeseries
├── Failed Login Heatmap (by hour) — heatmap
├── Brute Force Alerts — alert list
└── Error Types Distribution — pie chart
```

**Dashboard 5: `business.json` — Business Metrics**

```
Panels:
├── Leads Created (daily) — timeseries
├── Active Users per Workspace — bar chart
├── Emails Sent (success/failed) — timeseries
├── Socket.io Active Connections — timeseries
├── Email Delivery Rate — gauge
└── Top Active Workspaces — table
```

**Dashboard 6: `infrastructure.json` — Host Machine (Node Exporter)**

```
Panels:
├── CPU Usage (%) — timeseries
├── RAM Usage (%) — timeseries
├── Disk Usage (%) — gauge
├── Network I/O — timeseries
├── Disk I/O — timeseries
└── System Load (1m, 5m, 15m) — timeseries
```

---

### Phase 5: Grafana Alerting (Contact Points & Notification Policies)

#### 5.1 Contact points — `monitoring/grafana/provisioning/alerting/contactpoints.yml`

```yaml
apiVersion: 1
contactPoints:
  - orgId: 1
    name: email-alerts
    receivers:
      - uid: email-receiver
        type: email
        settings:
          addresses: 'your-email@domain.com'

  - orgId: 1
    name: slack-alerts
    receivers:
      - uid: slack-receiver
        type: slack
        settings:
          url: '${SLACK_WEBHOOK_URL}'
          channel: '#crm-alerts'

  - orgId: 1
    name: discord-alerts
    receivers:
      - uid: discord-receiver
        type: discord
        settings:
          url: '${DISCORD_WEBHOOK_URL}'
```

#### 5.2 Notification policies — `monitoring/grafana/provisioning/alerting/policies.yml`

```yaml
apiVersion: 1
policies:
  - orgId: 1
    receiver: email-alerts
    routes:
      - receiver: slack-alerts
        matchers:
          - severity = critical
        continue: true
      - receiver: email-alerts
        matchers:
          - severity = warning
        group_wait: 30s
        group_interval: 5m
        repeat_interval: 4h
```

---

## File Structure (Final)

```
CRM-SASS/
├── lib/
│   └── metrics/
│       ├── registry.ts          # Prometheus registry + default metrics
│       ├── custom.ts            # All custom metric definitions
│       ├── middleware.ts         # withMetrics() wrapper for API routes
│       └── index.ts             # Barrel export
├── app/api/
│   ├── health/route.ts          # Health check endpoint
│   └── metrics/route.ts         # Prometheus metrics endpoint
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml       # Scrape config
│   │   └── alert-rules.yml      # All alert rules
│   └── grafana/
│       ├── provisioning/
│       │   ├── datasources/
│       │   │   └── prometheus.yml
│       │   ├── dashboards/
│       │   │   └── dashboards.yml
│       │   └── alerting/
│       │       ├── contactpoints.yml
│       │       └── policies.yml
│       └── dashboards/
│           ├── app-overview.json
│           ├── database.json
│           ├── queues.json
│           ├── auth-security.json
│           ├── business.json
│           └── infrastructure.json
└── docker-compose.monitoring.yml
```

---

## Environment Variables to Add

```env
# Monitoring
GRAFANA_ADMIN_PASSWORD=your-secure-password
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
METRICS_ENABLED=true
```

---

## GCP-Specific Notes

### If deploying on GCE e2-micro (1GB RAM)

Running Prometheus + Grafana on the same VM adds ~300-400MB RAM. Options:

1. **Option A — Run monitoring on same VM** (tight but doable)
   - Prometheus with shorter retention (7d instead of 30d)
   - Grafana with SQLite (default)
   - Total RAM: ~900MB-1GB (will need swap)

2. **Option B — Use Grafana Cloud Free** (recommended for e2-micro)
   - Grafana Cloud free tier: 10K metrics, 50GB logs, 50GB traces
   - Only run a lightweight Prometheus/Grafana Agent on VM
   - No Grafana container needed locally
   - Saves ~200MB RAM

3. **Option C — Separate monitoring VM**
   - Second e2-micro (NOT free, only 1 free per account)
   - Or use Grafana Cloud free + Prometheus remote write

### Recommended for GCP e2-micro:

```
VM (e2-micro, 1GB RAM)
├── CRM App (~400MB)
├── Redis (~100MB)
├── Prometheus Agent (~50MB, remote-write to Grafana Cloud)
└── OS (~200MB)

Grafana Cloud (free tier)
├── Dashboards
├── Alerting
└── Long-term metric storage
```

---

## Implementation Order

| Step | Task                                                 | Effort  | Priority |
| ---- | ---------------------------------------------------- | ------- | -------- |
| 1    | Install prom-client, create `lib/metrics/`           | 1 hour  | P0       |
| 2    | Implement `/api/health` endpoint                     | 30 min  | P0       |
| 3    | Implement `/api/metrics` endpoint                    | 30 min  | P0       |
| 4    | Add `withMetrics()` middleware to key routes         | 2 hours | P0       |
| 5    | Add business metrics to lead/email/auth handlers     | 2 hours | P1       |
| 6    | Create `docker-compose.monitoring.yml`               | 30 min  | P1       |
| 7    | Write Prometheus config + alert rules                | 1 hour  | P1       |
| 8    | Create Grafana provisioning configs                  | 1 hour  | P1       |
| 9    | Build Grafana dashboard JSONs (6 dashboards)         | 3 hours | P2       |
| 10   | Set up Grafana alerting (contact points + policies)  | 1 hour  | P2       |
| 11   | Add queue depth metrics collection (periodic scrape) | 1 hour  | P2       |
| 12   | Test full stack locally with docker-compose          | 1 hour  | P1       |

**Total estimated effort: ~14 hours**

---

## Quick Start (After Implementation)

```bash
# Start app + monitoring stack
docker compose -f docker-compose.dev.yml -f docker-compose.monitoring.yml up -d

# Access
# App:        http://localhost:3000
# Health:     http://localhost:3000/api/health
# Metrics:    http://localhost:3000/api/metrics
# Prometheus: http://localhost:9090
# Grafana:    http://localhost:3001 (admin / changeme)
```
