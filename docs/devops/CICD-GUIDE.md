# CI/CD Pipeline Guide — CRM SaaS

## Workflow Overview

```
                    PR Opened / Push
                         │
              ┌──────────┴──────────┐
              │      ci.yml         │
              │  Lint, Type, Test   │
              │  Audit, E2E (main) │
              └──────────┬──────────┘
                         │ ✅ Pass
                         │
         ┌───────────────┼───────────────┐
         │               │               │
   READY TO DEV    READY FOR QA    READY TO RELEASE
         │               │               │
         ▼               ▼               ▼
    deploy.yml       deploy.yml      deploy.yml
    ┌────────┐      ┌────────┐     ┌──────────┐
    │ Build  │      │ Build  │     │ Friday?  │
    │ Deploy │      │ Deploy │     │ Build    │
    │  DEV   │      │   QA   │     │ Deploy   │
    └────────┘      └────────┘     │  PROD    │
                                   └──────────┘
                                        │
                                   Auto-tag release
```

---

## Workflow Files

### 1. `ci.yml` — PR Quality Gate

**Triggers**: Every PR to `main`/`develop`/`release/*` + push to `develop`

| Job                  | What it does                                    | Required |
|----------------------|-------------------------------------------------|----------|
| `quality`            | ESLint, TypeScript type-check, Prettier format  | Yes      |
| `unit-tests`         | Jest unit tests with coverage                   | Yes      |
| `integration-tests`  | Jest integration tests against real MongoDB     | Yes      |
| `e2e-tests`          | Playwright E2E (Chromium) — only PRs to `main`  | Main PRs |
| `audit`              | `npm audit --audit-level high --production`     | Yes      |
| `ci-gate`            | Aggregates all results — blocks merge if any fail| Yes      |

**Concurrency**: `ci-${{ github.ref }}` — cancels previous runs on the same branch.

### 2. `build.yml` — Build & Push Docker Image

**Triggers**: Push to `main`/`develop` + callable from `deploy.yml`

| Step             | What it does                                        |
|------------------|-----------------------------------------------------|
| Docker Buildx    | Multi-platform build with layer caching (GHA cache) |
| GHCR login       | Authenticates with `GITHUB_TOKEN`                   |
| Metadata         | Generates tags (branch, SHA, semver, custom)        |
| Build & push     | Pushes to `ghcr.io` with SBOM and provenance        |
| Cosign           | Signs image with keyless cosign (OIDC)              |
| Trivy scan       | Scans for CRITICAL/HIGH vulnerabilities             |

### 3. `deploy.yml` — Label-Based Deployment

**Triggers**: 
- `pull_request` with `labeled` event
- `push` to `develop` (auto-deploy to dev)

**Flow**:

```
1. resolve    → Reads label, determines environment
2. friday-gate → (prod only) Checks if today is Friday
3. build      → Calls build.yml to create image
4. deploy-*   → Applies Kustomize overlay to K8s cluster
5. comment    → Posts deployment URL on the PR
```

### 4. `security.yml` — Security Scanning

**Triggers**: Push to `main`/`develop` + weekly Monday cron

| Job               | Tool                  | What it catches                    |
|-------------------|-----------------------|------------------------------------|
| `codeql`          | GitHub CodeQL         | Code vulnerabilities (SAST)        |
| `semgrep`         | Semgrep               | Security anti-patterns (SAST)      |
| `dependency-scan` | npm audit             | Known CVEs in dependencies         |
| `secrets`         | TruffleHog            | Leaked API keys, passwords in code |
| `container-scan`  | Trivy                 | OS + library CVEs in Docker image  |
| `license`         | license-checker       | GPL/AGPL contamination             |
| `dependency-review`| GitHub Dep Review    | New vulnerable deps in PRs         |

---

## Label Reference

| Label              | Environment | Gate        | Auto-comment |
|--------------------|-------------|-------------|--------------|
| `READY TO DEV`     | dev         | None        | Yes          |
| `READY FOR QA`     | qa          | CI must pass| Yes          |
| `READY TO RELEASE` | prod        | Friday only | Yes          |

### Adding labels

1. Go to your GitHub repo → **Settings → Labels**
2. Click **New label**
3. Create all three labels with descriptive colors

---

## Branch Strategy

```
main ─────────────────────────────────────── (production)
  │                                    ▲
  │                                    │ PR (READY TO RELEASE)
  ▼                                    │
develop ─────────────────────────────── (integration)
  │           ▲     │          ▲
  │           │     │          │
  ▼           │     ▼          │
feat/x ───────┘   feat/y ─────┘
```

- `main` = production-ready code
- `develop` = integration branch, auto-deploys to dev
- `feat/*` = feature branches, merged to develop via PR
- `release/*` = optional release branches for staged rollouts
- `hotfix/*` = emergency fixes, PR directly to main

---

## Branch Protection Rules

### `main`

- [x] Require PR reviews (1 minimum)
- [x] Require status checks: `ci-gate`
- [x] Require branches to be up to date
- [x] Require signed commits (optional)
- [x] Do not allow force pushes
- [x] Do not allow deletions

### `develop`

- [x] Require status checks: `ci-gate`
- [x] Require branches to be up to date

---

## Adding a New Secret

1. Add the secret in **GitHub → Settings → Secrets → Actions**
2. If per-environment: add it under the specific Environment (dev/qa/production)
3. Update `k8s/base/secret.yaml` with the new key (placeholder value)
4. Reference it in `k8s/base/deployment.yaml` via `envFrom` (already done — `crm-app-secrets`)
5. Update the deploy step if using CI/CD injection for secrets

---

## Troubleshooting

### CI is stuck / not triggering

- Check **Actions** tab for queued runs
- Verify branch protection rules match the workflow triggers
- Check concurrency groups — a previous run might be holding the slot

### Label added but no deployment

- Verify the label name exactly matches: `READY TO DEV`, `READY FOR QA`, `READY TO RELEASE`
- Labels are case-sensitive
- Only the `labeled` event triggers deployment — not `unlabeled`
- Check the `resolve` job output in the workflow run

### Prod deploy blocked (not Friday)

- The `friday-gate` job checks UTC day. Friday in your timezone might be Thursday/Saturday UTC
- To override: a repo admin can re-run the `friday-gate` job
- For emergencies: temporarily edit the gate or use hotfix branch

### Build cache miss

- GHA cache has a 10GB limit per repo
- Old caches auto-evict after 7 days
- First build after cache eviction will be slower
