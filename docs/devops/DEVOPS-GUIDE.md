# DevOps Guide — CRM SaaS

This is the central guide for the CRM SaaS infrastructure, CI/CD pipelines, deployment workflows, and operational runbooks.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Environment Strategy](#environment-strategy)
3. [Repository Structure](#repository-structure)
4. [Workflow: Feature to Production](#workflow-feature-to-production)
5. [Label-Based Deployment](#label-based-deployment)
6. [Friday Production Releases](#friday-production-releases)
7. [GitHub Secrets Setup](#github-secrets-setup)
8. [GitHub Environments Setup](#github-environments-setup)
9. [MongoDB Atlas](#mongodb-atlas)
10. [Monitoring & Observability](#monitoring--observability)
11. [Incident Response](#incident-response)
12. [Related Docs](#related-docs)

---

## Architecture Overview

```
Developer → GitHub PR → CI Pipeline → Docker Build → GHCR → Kustomize → K8s Cluster
                            │
                     ┌──────┴──────┐
                     │  Security   │
                     │  Scanning   │
                     └─────────────┘

Environments:
  DEV  → dev.crm.example.com    (auto on develop push + READY TO DEV label)
  QA   → qa.crm.example.com    (READY FOR QA label)
  PROD → crm.example.com       (READY TO RELEASE label, Fridays only)

Database: MongoDB Atlas (managed, no self-hosted DB in K8s)
Registry: GitHub Container Registry (ghcr.io)
```

---

## Environment Strategy

| Environment | Branch     | Trigger                        | Replicas | Resources        | Approval |
|-------------|------------|--------------------------------|----------|------------------|----------|
| **Dev**     | `develop`  | Auto on push / `READY TO DEV`  | 1        | 100m CPU, 256Mi  | None     |
| **QA**      | `release/*`| `READY FOR QA` label           | 2        | 250m CPU, 512Mi  | Optional |
| **Prod**    | `main`     | `READY TO RELEASE` label       | 3-10     | 500m CPU, 1Gi    | Required |

**Key rules:**
- Dev can be deployed anytime, automatically or via label
- QA requires passing CI and optional reviewer approval
- Prod deployments are **gated to Fridays only** (UTC)
- Each environment has its own MongoDB Atlas cluster/database
- Each environment has its own Kustomize overlay with isolated namespaces

---

## Repository Structure

```
CRM-SASS/
├── docker/
│   ├── Dockerfile           # Multi-stage production (3 stages)
│   ├── Dockerfile.dev       # Development with hot reload
│   └── .dockerignore
│
├── k8s/
│   ├── base/                # Shared Kubernetes manifests
│   │   ├── kustomization.yaml
│   │   ├── deployment.yaml
│   │   ├── service.yaml
│   │   ├── ingress.yaml
│   │   ├── configmap.yaml
│   │   ├── secret.yaml      # Template only — real values via CI/Vault
│   │   ├── hpa.yaml
│   │   ├── serviceaccount.yaml
│   │   ├── networkpolicy.yaml
│   │   ├── pdb.yaml
│   │   └── namespace.yaml
│   └── overlays/
│       ├── dev/             # Dev overrides
│       ├── qa/              # QA overrides
│       └── prod/            # Prod overrides (higher resources, more replicas)
│
├── .github/workflows/
│   ├── ci.yml               # PR checks: lint, test, audit
│   ├── build.yml            # Docker build + push to GHCR + cosign signing
│   ├── deploy.yml           # Label-based deployment (dev/qa/prod)
│   └── security.yml         # CodeQL, Semgrep, Trivy, TruffleHog, license check
│
├── docker-compose.yml       # Local prod-like run
├── docker-compose.dev.yml   # Local dev with hot reload
└── docs/                    # You are here
```

---

## Workflow: Feature to Production

```
1. Create feature branch from `develop`
       git checkout -b feat/my-feature develop

2. Develop & push
       git push origin feat/my-feature

3. Open PR → `develop`
       CI runs automatically (lint, type-check, tests, audit)

4. Add label: READY TO DEV
       → Builds image, deploys to dev environment
       → Bot comments on PR with dev URL

5. QA testing — add label: READY FOR QA
       → Builds image, deploys to QA
       → Smoke tests run automatically

6. Merge PR into `develop`
       → Auto-deploys to dev

7. Create release PR: `develop` → `main`
       → E2E tests run (only on PRs to main)

8. On Friday — add label: READY TO RELEASE
       → Friday gate passes
       → Builds image, deploys to production
       → Release tag created automatically (v20260618-abc1234)

9. Merge into `main`
```

---

## Label-Based Deployment

### Labels to create in GitHub (Settings → Labels)

| Label               | Color (suggested) | Description                        |
|---------------------|-------------------|------------------------------------|
| `READY TO DEV`      | `#0E8A16` (green) | Deploy to development environment  |
| `READY FOR QA`      | `#FBCA04` (yellow)| Deploy to QA environment           |
| `READY TO RELEASE`  | `#D93F0B` (red)   | Deploy to production (Friday only) |

### How it works

1. You add a label to a PR
2. GitHub fires the `labeled` event
3. `deploy.yml` reads the label name → resolves the target environment
4. Builds a Docker image tagged `{env}-{sha}`
5. Updates the Kustomize overlay with the new image tag
6. Applies the overlay to the target K8s cluster
7. Comments on the PR with the deployment URL

### Removing a label

Removing a label does **not** trigger a rollback. To rollback, either:
- Re-deploy a previous image by re-running the workflow
- Use `kubectl rollout undo deployment/crm-app -n crm-saas-{env}`

---

## Friday Production Releases

Production deployments (`READY TO RELEASE`) are gated:

- The `friday-gate` job checks `date -u +%u` (1=Mon, 5=Fri)
- If it's not Friday (UTC), the job fails and blocks the deploy
- A repo admin can manually re-run the workflow to override in emergencies

**Why Fridays?** — This is configurable. To change the allowed day, edit the `friday-gate` step in `.github/workflows/deploy.yml`:

```yaml
# Change "5" to your desired day (1=Mon, 2=Tue, ... 7=Sun)
if [[ "$DAY" != "5" ]]; then
```

To allow any day (remove the gate), delete or skip the `friday-gate` job.

---

## GitHub Secrets Setup

Go to **Settings → Secrets and variables → Actions** and add:

### Required for CI

| Secret            | Description                          |
|-------------------|--------------------------------------|
| `CI_JWT_SECRET`   | JWT secret for test environments     |

### Required for deployment

These are injected into K8s secrets via your deployment tool (Sealed Secrets, External Secrets, or direct kubectl):

| Secret                        | Description                      |
|-------------------------------|----------------------------------|
| `MONGODB_URI_DEV`             | Atlas connection string (dev)    |
| `MONGODB_URI_QA`              | Atlas connection string (qa)     |
| `MONGODB_URI_PROD`            | Atlas connection string (prod)   |
| `JWT_SECRET`                  | Production JWT signing secret    |
| `RESEND_API_KEY`              | Transactional email API key      |
| `MINIO_ACCESS_KEY`            | MinIO / S3 access key            |
| `MINIO_SECRET_KEY`            | MinIO / S3 secret key            |
| `N8N_API_KEY`                 | n8n workflow automation key      |
| `API_KEY_ENCRYPTION_SECRET`   | Encryption key for stored API keys|
| `GOOGLE_OAUTH_CLIENT_ID`      | Google OAuth client ID           |
| `GOOGLE_OAUTH_CLIENT_SECRET`  | Google OAuth client secret       |
| `RAZORPAY_KEY_ID`             | Razorpay key ID                  |
| `RAZORPAY_KEY_SECRET`         | Razorpay key secret              |
| `DODO_API_KEY`                | Dodo Payments API key            |
| `DODO_WEBHOOK_SECRET`         | Dodo webhook verification secret |

**Never commit secrets to code.** The old `ci.yml` had hardcoded MongoDB credentials — this has been fixed.

---

## GitHub Environments Setup

Go to **Settings → Environments** and create:

### `dev`
- No protection rules
- Secrets: `MONGODB_URI` (Atlas dev cluster)

### `qa`
- Optional: Required reviewers (QA lead)
- Secrets: `MONGODB_URI` (Atlas QA cluster)

### `production`
- Required reviewers (at least 1 senior dev / devops)
- Branch restriction: `main` only
- Secrets: `MONGODB_URI` (Atlas prod cluster), all prod API keys

---

## MongoDB Atlas

We use **MongoDB Atlas** (managed) — no self-hosted MongoDB in Kubernetes.

### Per-environment Atlas setup

| Environment | Cluster Tier  | Region          |
|-------------|---------------|-----------------|
| Dev         | M0/M2 (free/shared) | Same as prod  |
| QA          | M10 (dedicated)     | Same as prod  |
| Prod        | M10+ (dedicated)    | Your region   |

### Security checklist

- [ ] IP Access List: restrict to K8s cluster egress IPs only
- [ ] Database users: one per environment, least-privilege roles
- [ ] Enable audit logging on prod cluster
- [ ] Enable encryption at rest (default on M10+)
- [ ] Connection strings use `+srv` and TLS
- [ ] Network peering or private endpoints for prod (no public internet)

### Backup

Atlas handles automated backups. For prod:
- Enable continuous backup with point-in-time recovery
- Test restore procedure quarterly

---

## Monitoring & Observability

### Recommended stack

| Layer        | Tool                   |
|--------------|------------------------|
| Metrics      | Prometheus + Grafana   |
| Logging      | Loki or ELK            |
| Tracing      | OpenTelemetry + Jaeger |
| Uptime       | UptimeRobot / Betterstack |
| Alerts       | Grafana Alerting → Slack |
| DB Monitoring| MongoDB Atlas built-in  |

### Key metrics to watch

- HTTP response time (p50, p95, p99)
- Error rate (5xx responses)
- Pod restart count
- Memory / CPU utilization
- MongoDB Atlas: connections, query targeting, replication lag
- HPA scaling events

---

## Incident Response

### Rollback steps

```bash
# Quick rollback to previous deployment
kubectl rollout undo deployment/prod-crm-app -n crm-saas-prod

# Rollback to a specific revision
kubectl rollout history deployment/prod-crm-app -n crm-saas-prod
kubectl rollout undo deployment/prod-crm-app -n crm-saas-prod --to-revision=N

# Verify
kubectl rollout status deployment/prod-crm-app -n crm-saas-prod
```

### Emergency hotfix (bypasses Friday gate)

1. Create hotfix branch from `main`
2. Fix and push
3. Open PR to `main`
4. A repo admin re-runs the `friday-gate` job manually (it will fail but admin can skip)
5. Or temporarily change the gate day in the workflow

---

## Related Docs

| Doc | Path |
|-----|------|
| Docker Guide | [docs/docker/DOCKER-GUIDE.md](../docker/DOCKER-GUIDE.md) |
| Kubernetes Guide | [docs/kubernetes/KUBERNETES-GUIDE.md](../kubernetes/KUBERNETES-GUIDE.md) |
| CI/CD Pipeline Guide | [docs/ci-cd/CICD-GUIDE.md](../ci-cd/CICD-GUIDE.md) |
| Security Guide | [docs/security/SECURITY-GUIDE.md](../security/SECURITY-GUIDE.md) |
