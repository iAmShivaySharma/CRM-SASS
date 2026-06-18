# Security Guide — CRM SaaS

## Security Layers

```
┌─────────────────────────────────────────┐
│           CI/CD Security                │
│  CodeQL · Semgrep · npm audit · Trivy   │
│  TruffleHog · License Check             │
├─────────────────────────────────────────┤
│           Container Security            │
│  Multi-stage build · Non-root user      │
│  Minimal image · Image signing (cosign) │
│  SBOM generation                        │
├─────────────────────────────────────────┤
│           Kubernetes Security           │
│  NetworkPolicy · PDB · RBAC            │
│  SecurityContext · No SA token mount    │
├─────────────────────────────────────────┤
│           Application Security          │
│  JWT auth · CORS · Rate limiting        │
│  CSP headers · Input validation         │
├─────────────────────────────────────────┤
│           Data Security                 │
│  MongoDB Atlas TLS · Encryption at rest │
│  Secrets in Vault/Sealed Secrets        │
│  No credentials in code                 │
└─────────────────────────────────────────┘
```

---

## Automated Security Scanning

### What runs and when

| Scanner        | Trigger                    | Severity Gate    | Results                   |
|----------------|----------------------------|------------------|---------------------------|
| CodeQL         | Push + PR + weekly cron    | security-extended| GitHub Security tab       |
| Semgrep        | Push + PR + weekly cron    | ERROR            | Fails workflow            |
| npm audit      | Every PR (ci.yml)          | high             | Fails CI gate             |
| TruffleHog     | Push + PR + weekly cron    | verified only    | Fails workflow            |
| Trivy (image)  | Every image build          | CRITICAL, HIGH   | GitHub Security tab       |
| Trivy (fs)     | Push to main/develop       | SARIF upload     | GitHub Security tab       |
| License check  | Push + PR + weekly cron    | GPL/AGPL         | Fails workflow            |
| Dependency Review | Every PR                | high             | PR comment + block merge  |

### Viewing results

- **GitHub Security tab**: Security → Code scanning alerts
- **PR checks**: failed security jobs block merge via `ci-gate`
- **Artifacts**: scan results uploaded as workflow artifacts (7-day retention)

---

## Secrets Management

### Rules

1. **Never commit secrets to code** — use GitHub Secrets + K8s Secrets
2. **No secrets in Dockerfiles** — build-time vars are placeholders
3. **No secrets in docker-compose** — use `env_file` pointing to `.env` (gitignored)
4. **No secrets in ConfigMaps** — use K8s Secrets or external secret stores
5. **Rotate secrets quarterly** — especially JWT_SECRET and API keys

### Where secrets live

| Secret type      | Storage                              | Injected via           |
|------------------|--------------------------------------|------------------------|
| CI test secrets  | GitHub Actions Secrets               | `${{ secrets.* }}`     |
| App secrets (K8s)| Sealed Secrets / External Secrets    | K8s Secret → envFrom   |
| MongoDB URI      | Per-environment GitHub Env Secrets   | K8s Secret             |
| API keys         | GitHub Secrets → K8s Secrets         | K8s Secret → envFrom   |

### Secret rotation checklist

- [ ] `JWT_SECRET` — rotate, then allow old tokens to expire (7d)
- [ ] `API_KEY_ENCRYPTION_SECRET` — rotate, re-encrypt stored keys
- [ ] `MONGODB_URI` — update Atlas user password, update secret
- [ ] Third-party API keys — rotate via provider dashboard
- [ ] TLS certificates — auto-renew via cert-manager / Let's Encrypt

---

## Container Security

### Production Dockerfile hardening

| Practice                        | Status | How                                    |
|---------------------------------|--------|----------------------------------------|
| Multi-stage build               | Done   | 3 stages: deps → builder → runner     |
| Non-root user                   | Done   | `runAsUser: 1001` (nextjs)            |
| Minimal base image              | Done   | `node:18-alpine`                      |
| No dev dependencies in prod     | Done   | `npm prune --production`              |
| Health check                    | Done   | `HEALTHCHECK` in Dockerfile           |
| Image signing                   | Done   | cosign (keyless via OIDC)             |
| SBOM                            | Done   | Generated during build                |
| Vulnerability scanning          | Done   | Trivy on every build                  |

### Kubernetes pod security

| Practice                        | Status | Manifest                              |
|---------------------------------|--------|---------------------------------------|
| `runAsNonRoot: true`            | Done   | deployment.yaml                       |
| `allowPrivilegeEscalation: false`| Done  | deployment.yaml                       |
| Drop ALL capabilities           | Done   | deployment.yaml                       |
| `automountServiceAccountToken: false` | Done | serviceaccount.yaml             |
| NetworkPolicy (ingress+egress)  | Done   | networkpolicy.yaml                    |
| PodDisruptionBudget             | Done   | pdb.yaml                              |

---

## Network Security

### NetworkPolicy rules

```
INGRESS:
  Allow: ingress-nginx namespace → port 3000
  Deny:  everything else

EGRESS:
  Allow: DNS (UDP/TCP 53)
  Allow: HTTPS (TCP 443) to external IPs  → MongoDB Atlas, APIs
  Allow: MongoDB (TCP 27017) to external IPs → Atlas
  Deny:  internal cluster traffic (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
```

### MongoDB Atlas network security

- IP Access List: only K8s cluster egress IPs
- Use `mongodb+srv://` with TLS
- Prod: use VPC peering or Private Link (no public internet)
- Dedicated cluster users per environment with minimal roles

### Ingress security

- Force SSL redirect
- Rate limiting: 100 req/min (dev/qa), 200 req/min (prod)
- Proxy body size limit: 10MB
- TLS termination at ingress

---

## Application Security Headers

Ensure your Next.js app sets these headers (in `next.config.js` or middleware):

| Header                      | Value                                                |
|-----------------------------|------------------------------------------------------|
| `X-Frame-Options`           | `DENY`                                               |
| `X-Content-Type-Options`    | `nosniff`                                            |
| `X-XSS-Protection`          | `1; mode=block`                                      |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                    |
| `Content-Security-Policy`   | Strict CSP tailored to your app                      |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains`                |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=()`           |

---

## OWASP Top 10 Checklist

| Risk                           | Mitigation                                          |
|--------------------------------|-----------------------------------------------------|
| A01: Broken Access Control     | JWT auth, RBAC, API route protection                |
| A02: Cryptographic Failures    | TLS everywhere, encryption at rest (Atlas)          |
| A03: Injection                 | Mongoose ODM (parameterized), input validation      |
| A04: Insecure Design           | Security review in PR process                       |
| A05: Security Misconfiguration | Automated scanning, security headers, non-root pods |
| A06: Vulnerable Components     | npm audit, Trivy, Dependency Review                 |
| A07: Auth Failures             | JWT with expiry, secure secret rotation             |
| A08: Data Integrity Failures   | Image signing (cosign), SBOM, provenance            |
| A09: Logging Failures          | Structured logging, audit trail                     |
| A10: SSRF                      | NetworkPolicy egress rules, URL validation          |

---

## Incident: Secret Leaked

If a secret is accidentally committed:

1. **Immediately rotate** the compromised credential
2. Remove from git history: `git filter-branch` or BFG Repo-Cleaner
3. Force push the cleaned history
4. Check TruffleHog scan results for other leaks
5. Review access logs for unauthorized use
6. Post-mortem: add pre-commit hook to prevent future leaks

### Pre-commit hook (recommended)

```bash
# .git/hooks/pre-commit
#!/bin/sh
# Block commits containing potential secrets
if git diff --cached --diff-filter=d | grep -iE '(api_key|secret|password|token)\s*=\s*["\x27][^"\x27]{8,}'; then
  echo "Potential secret detected. Use environment variables instead."
  exit 1
fi
```

---

## Compliance & Auditing

- **License compliance**: automated GPL/AGPL detection via `license-checker`
- **Dependency auditing**: weekly cron job scans for new CVEs
- **Image provenance**: SBOM + cosign attestation on every build
- **Access control**: GitHub Environments with required reviewers for prod
- **Audit trail**: GitHub Actions logs retained for 90 days
