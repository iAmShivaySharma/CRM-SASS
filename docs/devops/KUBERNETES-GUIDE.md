# Kubernetes Guide — CRM SaaS

## Overview

We use **Kustomize** (built into kubectl) for managing Kubernetes manifests with a base + overlay pattern. No Helm required.

```
k8s/
├── base/                    # Shared manifests (all environments)
│   ├── kustomization.yaml
│   ├── namespace.yaml
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   ├── secret.yaml          # Template — real values injected externally
│   ├── hpa.yaml
│   ├── serviceaccount.yaml
│   ├── networkpolicy.yaml
│   └── pdb.yaml
└── overlays/
    ├── dev/
    │   ├── kustomization.yaml
    │   └── patches/         # Dev-specific overrides
    ├── qa/
    │   ├── kustomization.yaml
    │   └── patches/
    └── prod/
        ├── kustomization.yaml
        └── patches/
```

---

## Base Manifests

### `deployment.yaml`

- **Rolling update**: `maxSurge: 1`, `maxUnavailable: 0` (zero-downtime)
- **Security context**: `runAsNonRoot: true`, `runAsUser: 1001`, drop all capabilities
- **Probes**: startup (fails after 60s), liveness (every 30s), readiness (every 10s)
- **Topology spread**: distributes pods across nodes

### `service.yaml`

- ClusterIP (internal only, exposed via Ingress)
- Port 80 → container port 3000

### `ingress.yaml`

- nginx ingress controller
- TLS termination
- Rate limiting: 100 req/min (200 for prod)
- Force SSL redirect
- Proxy body size: 10MB

### `configmap.yaml`

Non-secret configuration. Each overlay patches environment-specific values:

| Key                   | Dev                         | QA                         | Prod                  |
|-----------------------|-----------------------------|----------------------------|-----------------------|
| `NODE_ENV`            | development                 | production                 | production            |
| `CORS_ORIGINS`        | https://dev.crm.example.com | https://qa.crm.example.com | https://crm.example.com |
| `NEXT_PUBLIC_APP_URL` | https://dev.crm.example.com | https://qa.crm.example.com | https://crm.example.com |

### `secret.yaml`

**Template only** — contains placeholder values. Real secrets are managed via one of:

1. **Sealed Secrets** (recommended for GitOps)
2. **External Secrets Operator** (pulls from AWS SM, GCP SM, or Vault)
3. **CI/CD injection** (kubectl create secret from GitHub Secrets)

### `hpa.yaml` (HorizontalPodAutoscaler)

| Environment | Min | Max | CPU Target | Memory Target |
|-------------|-----|-----|------------|---------------|
| Dev         | 1   | 2   | 75%        | 80%           |
| QA          | 2   | 4   | 75%        | 80%           |
| Prod        | 3   | 10  | 75%        | 80%           |

Scale-down stabilization: 5 minutes (prevents flapping).

### `networkpolicy.yaml`

- **Ingress**: only from `ingress-nginx` namespace on port 3000
- **Egress**: DNS (port 53) + HTTPS (port 443) + MongoDB Atlas (port 27017) to external IPs only
- Internal cluster traffic blocked by default (pod-to-pod isolation)

### `pdb.yaml` (PodDisruptionBudget)

`minAvailable: 1` — at least 1 pod must stay running during voluntary disruptions (node drain, rolling updates).

### `serviceaccount.yaml`

- `automountServiceAccountToken: false` — pods don't get K8s API access unless explicitly needed

---

## Overlays

Each overlay patches the base with environment-specific values.

### What each overlay changes

| Resource    | What's patched                          |
|-------------|-----------------------------------------|
| Deployment  | Image tag, replicas, resource limits    |
| Ingress     | Hostname, TLS secret name              |
| HPA         | Min/max replicas                       |
| ConfigMap   | NODE_ENV, CORS_ORIGINS, APP_URL        |

### Preview an overlay

```bash
# See the full rendered YAML for an environment
kustomize build k8s/overlays/dev
kustomize build k8s/overlays/qa
kustomize build k8s/overlays/prod
```

---

## Manual Deployment

These are done automatically by CI/CD, but for reference:

```bash
# Deploy to dev
kubectl apply -k k8s/overlays/dev

# Deploy to QA
kubectl apply -k k8s/overlays/qa

# Deploy to prod
kubectl apply -k k8s/overlays/prod

# Check status
kubectl get pods -n crm-saas-dev
kubectl get pods -n crm-saas-qa
kubectl get pods -n crm-saas-prod
```

### Update image manually

```bash
cd k8s/overlays/dev
kustomize edit set image ghcr.io/OWNER/crm-saas=ghcr.io/OWNER/crm-saas:dev-abc1234
kubectl apply -k .
```

---

## Secrets Management

### Option 1: Sealed Secrets (recommended)

```bash
# Install kubeseal
brew install kubeseal

# Seal a secret
kubectl create secret generic crm-app-secrets \
  --from-literal=MONGODB_URI="mongodb+srv://..." \
  --from-literal=JWT_SECRET="..." \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > k8s/overlays/prod/sealed-secret.yaml
```

Sealed secrets are safe to commit to git — only the cluster can decrypt them.

### Option 2: External Secrets Operator

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: crm-app-secrets
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-manager
    kind: ClusterSecretStore
  target:
    name: crm-app-secrets
  data:
    - secretKey: MONGODB_URI
      remoteRef:
        key: crm-saas/prod/mongodb-uri
```

### Option 3: CI/CD injection

The deploy workflow creates secrets from GitHub Secrets:

```bash
kubectl create secret generic crm-app-secrets \
  --from-literal=MONGODB_URI="${{ secrets.MONGODB_URI_PROD }}" \
  -n crm-saas-prod \
  --dry-run=client -o yaml | kubectl apply -f -
```

---

## Debugging

```bash
# Pod logs
kubectl logs -f deployment/prod-crm-app -n crm-saas-prod

# Exec into pod
kubectl exec -it deployment/prod-crm-app -n crm-saas-prod -- sh

# Describe pod (events, probe failures)
kubectl describe pod -l app.kubernetes.io/name=crm-app -n crm-saas-prod

# Check HPA status
kubectl get hpa -n crm-saas-prod

# Check network policy
kubectl describe networkpolicy crm-app -n crm-saas-prod
```

---

## Customization Checklist

Before first deployment, replace these placeholders:

- [ ] `ghcr.io/OWNER/crm-saas` → your actual GHCR image path
- [ ] `crm.example.com` / `dev.crm.example.com` / `qa.crm.example.com` → your real domains
- [ ] `crm-tls-*` → your TLS certificate secret names
- [ ] `ingress-nginx` namespace selector → match your ingress controller's namespace
- [ ] Resource limits → tune based on your actual workload
