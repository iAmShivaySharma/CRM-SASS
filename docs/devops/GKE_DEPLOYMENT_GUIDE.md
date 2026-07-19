# GKE Deployment Guide — CRM SaaS

A complete, production-grade guide for deploying this Next.js CRM SaaS application to a new GCP account using GKE Autopilot. Follow each section in order.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [GCP Project Setup](#2-gcp-project-setup)
3. [Artifact Registry](#3-artifact-registry)
4. [GCS Bucket for File Storage](#4-gcs-bucket-for-file-storage)
5. [GKE Autopilot Cluster](#5-gke-autopilot-cluster)
6. [Kubernetes Namespaces & Secrets](#6-kubernetes-namespaces--secrets)
7. [GitHub Actions — Workload Identity Federation](#7-github-actions--workload-identity-federation)
8. [First Manual Deploy](#8-first-manual-deploy)
9. [CI/CD Flow](#9-cicd-flow)
10. [Adding a Custom Domain with HTTPS](#10-adding-a-custom-domain-with-https)
11. [Monitoring with Prometheus & Grafana](#11-monitoring-with-prometheus--grafana)
12. [Troubleshooting](#12-troubleshooting)
13. [Cost Estimate](#13-cost-estimate)

---

## Architecture

```
GitHub Push / PR Label
         │
         ▼
  GitHub Actions (WIF)
         │
   ┌─────┴──────┐
   │  Build &   │
   │  Push to   │
   │    GAR     │
   └─────┬──────┘
         │
         ▼
  GKE Autopilot (asia-south1)
  ┌──────────────────────────────────────┐
  │  Namespace: crm-saas-prod            │
  │  ┌────────────────────────────────┐  │
  │  │  Deployment: prod-crm-app      │  │
  │  │  Replicas: 3 (HPA: 3-10)       │  │
  │  │  Port: 8080                    │  │
  │  └───────────────┬────────────────┘  │
  │                  │                   │
  │  ┌───────────────▼────────────────┐  │
  │  │  Service (LoadBalancer :80)    │  │
  │  └────────────────────────────────┘  │
  └──────────────────────────────────────┘
         │
         ▼
  External Traffic (Custom Domain)
```

| Component     | Service                      | Details                          |
| ------------- | ---------------------------- | -------------------------------- |
| Next.js app   | GKE Autopilot                | 3 replicas, HPA enabled          |
| Docker images | Artifact Registry            | asia-south1, repo: crm-saas-prod |
| File storage  | GCS                          | Bucket: crm-saas-prod-assets     |
| Secrets       | Kubernetes Secrets           | Per-namespace, per-environment   |
| CI/CD auth    | Workload Identity Federation | No JSON keys ever                |
| Region        | asia-south1 (Mumbai)         | Lowest latency for India         |

---

## 1. Prerequisites

Before starting, ensure you have the following installed and available:

### Tools

```bash
# Verify gcloud CLI
gcloud version

# Verify kubectl
kubectl version --client

# Verify helm (for monitoring section)
helm version

# Verify kustomize
kustomize version
```

Install guides:

- **gcloud CLI**: https://cloud.google.com/sdk/docs/install
- **kubectl**: https://kubernetes.io/docs/tasks/tools/
- **helm**: https://helm.sh/docs/intro/install/
- **kustomize**: https://kubectl.docs.kubernetes.io/installation/kustomize/

### Requirements

- GCP account with billing enabled
- GitHub repository with the CRM SaaS code
- A MongoDB instance (external — Atlas or self-hosted)
- Domain name (optional, for custom domain setup)

---

## 2. GCP Project Setup

### 2.1 Authenticate and select project

```bash
gcloud auth login

gcloud config set project YOUR_PROJECT_ID
```

To create a new project:

```bash
gcloud projects create YOUR_PROJECT_ID --name="CRM SaaS"
gcloud config set project YOUR_PROJECT_ID
```

Link billing at: https://console.cloud.google.com/billing

### 2.2 Enable required APIs

```bash
gcloud services enable \
  container.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com
```

### 2.3 Set default region

```bash
gcloud config set compute/region asia-south1
gcloud config set compute/zone asia-south1-a
```

### 2.4 Store your project ID in a shell variable

Use this throughout the guide to avoid repetition:

```bash
export PROJECT_ID=$(gcloud config get-value project)
echo "Project ID: $PROJECT_ID"
```

---

## 3. Artifact Registry

Artifact Registry is where Docker images are stored. GKE pulls images from here during deployments.

### 3.1 Create the Docker repository

```bash
gcloud artifacts repositories create crm-saas-prod \
  --repository-format=docker \
  --location=asia-south1 \
  --description="CRM SaaS production Docker images"
```

### 3.2 Verify it was created

```bash
gcloud artifacts repositories list --location=asia-south1
```

### 3.3 Configure Docker authentication

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

Your full image path will be:

```
asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/crm-saas-prod/crm-saas-app:latest
```

---

## 4. GCS Bucket for File Storage

The app uses GCS for user file uploads (replaces MinIO).

### 4.1 Create the bucket

```bash
gcloud storage buckets create gs://crm-saas-prod-assets \
  --location=asia-south1 \
  --uniform-bucket-level-access
```

### 4.2 Set public read access for uploaded files

```bash
gcloud storage buckets add-iam-policy-binding gs://crm-saas-prod-assets \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

### 4.3 Grant GKE workload access to the bucket

The app's Kubernetes service account needs write access:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

---

## 5. GKE Autopilot Cluster

GKE Autopilot manages node provisioning automatically — you only pay for pod resources, not idle nodes.

### 5.1 Create the cluster

```bash
gcloud container clusters create-auto crm-saas-cluster \
  --location=asia-south1 \
  --project=$PROJECT_ID
```

This takes 5-10 minutes.

### 5.2 Get credentials

```bash
gcloud container clusters get-credentials crm-saas-cluster \
  --location=asia-south1 \
  --project=$PROJECT_ID
```

### 5.3 Verify connection

```bash
kubectl cluster-info
kubectl get nodes
```

---

## 6. Kubernetes Namespaces & Secrets

Each environment (dev, qa, prod) runs in its own namespace with its own secrets.

### 6.1 Create namespaces

```bash
kubectl create namespace crm-saas-dev
kubectl create namespace crm-saas-qa
kubectl create namespace crm-saas-prod
```

### 6.2 Create secrets for each environment

Repeat the block below for each namespace, substituting the correct values.

> **Important:** Write the MongoDB URI to a file first. Terminal line-wrapping can silently corrupt long connection strings if you paste them directly into commands.

```bash
printf "mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority&family=4&connectTimeoutMS=30000&serverSelectionTimeoutMS=30000" > /tmp/mongo_uri.txt
```

Then create the secret:

```bash
NAMESPACE=crm-saas-prod

kubectl create secret generic crm-app-secrets \
  --namespace=$NAMESPACE \
  --from-file=MONGODB_URI=/tmp/mongo_uri.txt \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=RESEND_API_KEY="re_YOUR_KEY_HERE" \
  --from-literal=N8N_API_KEY="YOUR_N8N_API_KEY" \
  --from-literal=API_KEY_ENCRYPTION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=PLATFORM_OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"
```

Repeat for the other namespaces:

```bash
NAMESPACE=crm-saas-qa
kubectl create secret generic crm-app-secrets \
  --namespace=$NAMESPACE \
  --from-file=MONGODB_URI=/tmp/mongo_uri_qa.txt \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=RESEND_API_KEY="re_YOUR_KEY_HERE" \
  --from-literal=N8N_API_KEY="YOUR_N8N_API_KEY" \
  --from-literal=API_KEY_ENCRYPTION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=PLATFORM_OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"

NAMESPACE=crm-saas-dev
kubectl create secret generic crm-app-secrets \
  --namespace=$NAMESPACE \
  --from-file=MONGODB_URI=/tmp/mongo_uri_dev.txt \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --from-literal=RESEND_API_KEY="re_YOUR_KEY_HERE" \
  --from-literal=N8N_API_KEY="YOUR_N8N_API_KEY" \
  --from-literal=API_KEY_ENCRYPTION_SECRET="$(openssl rand -hex 32)" \
  --from-literal=PLATFORM_OPENROUTER_API_KEY="sk-or-v1-YOUR_KEY_HERE"
```

Clean up the temp file after:

```bash
rm /tmp/mongo_uri.txt
```

### 6.3 Verify secrets were created

```bash
kubectl get secrets -n crm-saas-prod
kubectl describe secret crm-app-secrets -n crm-saas-prod
```

### 6.4 Update a secret value (rotation)

```bash
kubectl create secret generic crm-app-secrets \
  --namespace=crm-saas-prod \
  --from-literal=JWT_SECRET="$(openssl rand -base64 48)" \
  --dry-run=client -o yaml | kubectl apply -f -
```

After rotating, restart the deployment to pick up the new value:

```bash
kubectl rollout restart deployment/prod-crm-app -n crm-saas-prod
```

---

## 7. GitHub Actions — Workload Identity Federation

Workload Identity Federation (WIF) allows GitHub Actions to authenticate to GCP without storing any JSON key files. This is the recommended, secure approach.

### 7.1 Create the Workload Identity Pool

```bash
gcloud iam workload-identity-pools create github-pool \
  --project=$PROJECT_ID \
  --location=global \
  --display-name="GitHub Actions Pool"
```

### 7.2 Create the OIDC provider

Replace `YOUR_GITHUB_ORG_OR_USER/YOUR_REPO` with your actual GitHub repository path.

```bash
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github-pool \
  --display-name="GitHub OIDC Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --attribute-condition="assertion.repository=='YOUR_GITHUB_ORG_OR_USER/YOUR_REPO'" \
  --issuer-uri="https://token.actions.githubusercontent.com"
```

### 7.3 Create a service account for deployments

```bash
gcloud iam service-accounts create github-deploy \
  --project=$PROJECT_ID \
  --display-name="GitHub Actions Deploy SA"
```

### 7.4 Grant required IAM roles

```bash
SA_EMAIL="github-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/container.developer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/storage.admin"
```

### 7.5 Bind the service account to the WIF pool

```bash
POOL_ID=$(gcloud iam workload-identity-pools describe github-pool \
  --project=$PROJECT_ID \
  --location=global \
  --format="value(name)")

gcloud iam service-accounts add-iam-policy-binding "${SA_EMAIL}" \
  --project=$PROJECT_ID \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/YOUR_GITHUB_ORG_OR_USER/YOUR_REPO"
```

### 7.6 Get the provider resource name

You need this for the GitHub secret:

```bash
gcloud iam workload-identity-pools providers describe github-provider \
  --project=$PROJECT_ID \
  --location=global \
  --workload-identity-pool=github-pool \
  --format="value(name)"
```

Copy the output — it looks like:

```
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider
```

### 7.7 Add GitHub Secrets

Go to your GitHub repository: **Settings → Secrets and variables → Actions → Secrets**

| Secret Name                      | Value                                                   |
| -------------------------------- | ------------------------------------------------------- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | The provider resource name from step 7.6                |
| `GCP_SERVICE_ACCOUNT`            | `github-deploy@YOUR_PROJECT_ID.iam.gserviceaccount.com` |

### 7.8 Add GitHub Variables

Go to: **Settings → Secrets and variables → Actions → Variables**

| Variable Name      | Value               |
| ------------------ | ------------------- |
| `GCP_PROJECT_ID`   | Your GCP project ID |
| `GCP_REGION`       | `asia-south1`       |
| `GKE_CLUSTER_NAME` | `crm-saas-cluster`  |
| `GAR_REPOSITORY`   | `crm-saas-prod`     |
| `IMAGE_NAME`       | `crm-saas-app`      |

---

## 8. First Manual Deploy

The first deploy must be done manually to establish the base state. After this, all subsequent deployments happen automatically via GitHub Actions.

### 8.1 Build the image using Cloud Build

Cloud Build runs the Docker build on GCP infrastructure — no need for a powerful local machine. This avoids OOM issues when building locally.

From the project root:

```bash
gcloud builds submit \
  --config=cloudbuild.yaml \
  --timeout=30m \
  --project=$PROJECT_ID
```

If you don't have a `cloudbuild.yaml` yet, create one:

```yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-f'
      - 'docker/Dockerfile'
      - '-t'
      - 'asia-south1-docker.pkg.dev/$PROJECT_ID/crm-saas-prod/crm-saas-app:latest'
      - '.'
images:
  - 'asia-south1-docker.pkg.dev/$PROJECT_ID/crm-saas-prod/crm-saas-app:latest'
options:
  machineType: 'E2_HIGHCPU_8'
  logging: CLOUD_LOGGING_ONLY
```

### 8.2 Update the image reference in the base deployment

```bash
IMAGE="asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas-prod/crm-saas-app:latest"

cd k8s/base
kustomize edit set image "asia-south1-docker.pkg.dev/project-id/crm-saas-prod/crm-saas-app=${IMAGE}"
```

Or manually edit `k8s/base/deployment.yaml` to set the correct image path.

### 8.3 Apply the prod overlay

```bash
kubectl apply -k k8s/overlays/prod
```

### 8.4 Watch the rollout

```bash
kubectl rollout status deployment/prod-crm-app -n crm-saas-prod --timeout=300s
```

### 8.5 Verify pods are running

```bash
kubectl get pods -n crm-saas-prod
kubectl get svc -n crm-saas-prod
```

### 8.6 Expose via LoadBalancer (if not using Ingress)

For quick access before setting up a custom domain, patch the service to use a LoadBalancer:

```bash
kubectl patch svc prod-crm-app -n crm-saas-prod \
  -p '{"spec": {"type": "LoadBalancer", "ports": [{"port": 80, "targetPort": 8080}]}}'
```

Get the external IP:

```bash
kubectl get svc prod-crm-app -n crm-saas-prod --watch
```

Wait for `EXTERNAL-IP` to be assigned (may take 1-2 minutes). Then test:

```bash
EXTERNAL_IP=$(kubectl get svc prod-crm-app -n crm-saas-prod -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -s http://$EXTERNAL_IP/api/health
```

---

## 9. CI/CD Flow

All subsequent deployments are fully automated via `.github/workflows/deploy.yml`.

### 9.1 How it works

The workflow uses Workload Identity Federation to authenticate to GCP, builds a Docker image tagged with the commit SHA, pushes it to Artifact Registry, updates the Kustomize overlay, and applies it to the target namespace.

```
Trigger → Resolve Environment → Build & Push Image → Get GKE Creds → Apply Kustomize Overlay → Rollout Status
```

### 9.2 Deployment triggers

| Trigger                      | Target Environment | Namespace     |
| ---------------------------- | ------------------ | ------------- |
| Push to `main`               | prod               | crm-saas-prod |
| PR label: `READY TO DEV`     | dev                | crm-saas-dev  |
| PR label: `READY FOR QA`     | qa                 | crm-saas-qa   |
| PR label: `READY TO RELEASE` | prod               | crm-saas-prod |
| `workflow_dispatch`          | prod               | crm-saas-prod |

### 9.3 Create the PR labels in GitHub

Go to your GitHub repository: **Issues → Labels → New label**

| Label name         | Color     | Description                       |
| ------------------ | --------- | --------------------------------- |
| `READY TO DEV`     | `#0E8A16` | Deploy to development environment |
| `READY FOR QA`     | `#FBCA04` | Deploy to QA environment          |
| `READY TO RELEASE` | `#D93F0B` | Deploy to production              |

### 9.4 Manual rollback

```bash
kubectl rollout undo deployment/prod-crm-app -n crm-saas-prod

kubectl rollout history deployment/prod-crm-app -n crm-saas-prod

kubectl rollout undo deployment/prod-crm-app -n crm-saas-prod --to-revision=2
```

### 9.5 Check deployment status

```bash
kubectl rollout status deployment/prod-crm-app -n crm-saas-prod

kubectl get pods -n crm-saas-prod

kubectl describe pod -n crm-saas-prod -l app.kubernetes.io/name=crm-app
```

---

## 10. Adding a Custom Domain with HTTPS

GKE Autopilot supports Google-managed SSL certificates via Ingress. This gives you HTTPS with auto-renewal at no extra cost.

### 10.1 Reserve a static external IP

```bash
gcloud compute addresses create crm-saas-prod-ip \
  --global \
  --project=$PROJECT_ID

gcloud compute addresses describe crm-saas-prod-ip --global --format="value(address)"
```

Note the IP address — you'll need it for DNS.

### 10.2 Point your DNS A record to the IP

At your domain registrar or Cloud DNS, add:

| Type | Name | Value          |
| ---- | ---- | -------------- |
| A    | @    | YOUR_STATIC_IP |
| A    | www  | YOUR_STATIC_IP |

DNS propagation takes 5-30 minutes. You can verify with:

```bash
dig yourdomain.com A
```

### 10.3 Create a ManagedCertificate

Create `k8s/overlays/prod/patches/certificate.yaml`:

```yaml
apiVersion: networking.gke.io/v1
kind: ManagedCertificate
metadata:
  name: crm-saas-cert
  namespace: crm-saas-prod
spec:
  domains:
    - yourdomain.com
    - www.yourdomain.com
```

Apply it:

```bash
kubectl apply -f k8s/overlays/prod/patches/certificate.yaml
```

### 10.4 Update the Ingress to use the static IP and certificate

Patch your prod ingress (`k8s/overlays/prod/patches/ingress.yaml`) to include:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: crm-app
  annotations:
    kubernetes.io/ingress.global-static-ip-name: 'crm-saas-prod-ip'
    networking.gke.io/managed-certificates: 'crm-saas-cert'
    kubernetes.io/ingress.class: 'gce'
spec:
  rules:
    - host: yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: prod-crm-app
                port:
                  name: http
```

Apply:

```bash
kubectl apply -k k8s/overlays/prod
```

### 10.5 Wait for certificate provisioning

```bash
kubectl describe managedcertificate crm-saas-cert -n crm-saas-prod
```

The certificate status changes from `Provisioning` to `Active`. This can take 10-60 minutes depending on DNS propagation.

### 10.6 Update app configuration for the custom domain

Update the prod configmap (`k8s/overlays/prod/patches/configmap.yaml`):

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: crm-app-config
data:
  NEXT_PUBLIC_APP_URL: 'https://yourdomain.com'
  CORS_ORIGINS: 'https://yourdomain.com'
  COOKIE_SECURE: 'true'
```

Apply and restart:

```bash
kubectl apply -k k8s/overlays/prod
kubectl rollout restart deployment/prod-crm-app -n crm-saas-prod
```

---

## 11. Monitoring with Prometheus & Grafana

Install the full observability stack in the cluster using the `kube-prometheus-stack` Helm chart. This provides Prometheus, Grafana, AlertManager, and pre-built Kubernetes dashboards.

### 11.1 Add the Helm repo

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
```

### 11.2 Create a monitoring namespace

```bash
kubectl create namespace monitoring
```

### 11.3 Install kube-prometheus-stack

```bash
helm install kube-prometheus-stack prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set grafana.adminPassword="YOUR_GRAFANA_PASSWORD" \
  --set grafana.service.type=ClusterIP \
  --set prometheus.prometheusSpec.retention=30d \
  --set alertmanager.enabled=true
```

### 11.4 Verify the installation

```bash
kubectl get pods -n monitoring
kubectl get svc -n monitoring
```

### 11.5 Access Grafana

Use port-forwarding to access Grafana locally:

```bash
kubectl port-forward svc/kube-prometheus-stack-grafana 3001:80 -n monitoring
```

Open http://localhost:3001 in your browser. Login with:

- Username: `admin`
- Password: the value you set in step 11.3

### 11.6 Expose Grafana publicly (optional)

For persistent access, create an Ingress for Grafana:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: grafana
  namespace: monitoring
  annotations:
    kubernetes.io/ingress.class: 'gce'
spec:
  rules:
    - host: grafana.yourdomain.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: kube-prometheus-stack-grafana
                port:
                  number: 80
```

### 11.7 Default dashboards

The `kube-prometheus-stack` chart includes pre-built dashboards for:

- **Kubernetes / Nodes** — CPU, memory, disk per node
- **Kubernetes / Pods** — resource usage per pod and namespace
- **Kubernetes / Workloads** — deployment health, replicas
- **Kubernetes / API Server** — API latency and request rates

Find them in Grafana under **Dashboards → Browse → Kubernetes**.

### 11.8 Add Prometheus scraping for the CRM app

The app exposes metrics at `/api/metrics`. Create a `ServiceMonitor` to tell Prometheus to scrape it:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: crm-app-metrics
  namespace: crm-saas-prod
  labels:
    release: kube-prometheus-stack
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: crm-app
  endpoints:
    - port: http
      path: /api/metrics
      interval: 15s
```

```bash
kubectl apply -f crm-servicemonitor.yaml
```

### 11.9 AlertManager — Slack notifications

Get your Slack incoming webhook URL from: https://api.slack.com/messaging/webhooks

Create a secret with the webhook URL:

```bash
kubectl create secret generic alertmanager-slack \
  --namespace=monitoring \
  --from-literal=webhook-url="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

Create an AlertManager config:

```yaml
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: crm-slack-alerts
  namespace: monitoring
spec:
  route:
    groupBy: ['alertname', 'namespace']
    groupWait: 30s
    groupInterval: 5m
    repeatInterval: 12h
    receiver: slack
  receivers:
    - name: slack
      slackConfigs:
        - apiURL:
            name: alertmanager-slack
            key: webhook-url
          channel: '#crm-alerts'
          title: '[{{ .Status | toUpper }}] {{ .CommonLabels.alertname }}'
          text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
          sendResolved: true
```

```bash
kubectl apply -f crm-alertmanager-config.yaml
```

### 11.10 Custom CRM dashboards

Import these Grafana dashboard IDs for additional visibility:

| Dashboard          | Grafana ID | Use                                |
| ------------------ | ---------- | ---------------------------------- |
| Node Exporter Full | 1860       | Host-level CPU/memory/disk/network |
| Kubernetes Cluster | 7249       | Cluster-wide resource overview     |
| Pod Monitoring     | 10257      | Per-pod metrics                    |

To import: Grafana → **+** → **Import** → enter the dashboard ID.

For CRM-specific dashboards (HTTP latency, auth failures, queue depth), refer to `docs/devops/MONITORING_PLAN.md` which contains the full metric definitions, custom Prometheus rules, and dashboard specifications.

---

## 12. Troubleshooting

### MongoDB connection issues

**Symptom:** App crashes with `MongoServerSelectionError` or `ETIMEOUT`

**Fix 1 — Force IPv4:** Add `family=4` to the connection string to prevent IPv6 resolution failures:

```
mongodb+srv://user:pass@cluster.mongodb.net/db?retryWrites=true&w=majority&family=4
```

**Fix 2 — Increase timeouts:**

```
mongodb+srv://...?family=4&connectTimeoutMS=30000&serverSelectionTimeoutMS=30000&socketTimeoutMS=30000
```

**Fix 3 — Check the secret value:**

```bash
kubectl get secret crm-app-secrets -n crm-saas-prod -o jsonpath='{.data.MONGODB_URI}' | base64 -d
```

Look for any trailing newlines or spaces — these cause silent failures. Always use a temp file (see Section 6.2).

### Pod CrashLoopBackOff

```bash
kubectl get pods -n crm-saas-prod

kubectl logs -n crm-saas-prod <pod-name> --previous

kubectl describe pod -n crm-saas-prod <pod-name>
```

Common causes:

- Missing environment variable — check the secret and configmap names match
- MongoDB connection timeout — see above
- Wrong image tag — verify `kustomize edit set image` ran correctly

### Image push denied

**Symptom:** GitHub Actions fails with `denied: Permission "artifactregistry.repositories.uploadArtifacts" denied`

**Fix:** Ensure the service account has the correct roles:

```bash
SA_EMAIL="github-deploy@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"
```

Also verify the WIF attribute condition exactly matches the repository path (case-sensitive).

### Cloud Build permission denied

**Symptom:** `gcloud builds submit` fails with storage or registry errors

**Fix:** Grant the Cloud Build service account the required roles:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${CB_SA}" \
  --role="roles/artifactregistry.admin"
```

### COOKIE_SECURE / session issues

**Symptom:** Users get logged out immediately, or cookies are not being set

**Fix:** Ensure `COOKIE_SECURE=true` is set when running behind HTTPS. This env var must be set in the configmap:

```bash
kubectl patch configmap crm-app-config -n crm-saas-prod \
  --patch '{"data":{"COOKIE_SECURE":"true"}}'

kubectl rollout restart deployment/prod-crm-app -n crm-saas-prod
```

### ManagedCertificate stuck in Provisioning

**Symptom:** `kubectl describe managedcertificate` shows `Provisioning` for more than 1 hour

**Fix:**

1. Confirm DNS A record points to the correct static IP: `dig yourdomain.com A`
2. Confirm the static IP name annotation on the Ingress exactly matches the reserved IP name
3. Confirm the Ingress class is `gce` (not `nginx`)
4. Check certificate domain matches exactly what is in the ManagedCertificate spec

### Viewing logs

```bash
kubectl logs -n crm-saas-prod -l app.kubernetes.io/name=crm-app --tail=100 -f

kubectl logs -n crm-saas-prod -l app.kubernetes.io/name=crm-app --previous --tail=50
```

Using Cloud Logging:

```bash
gcloud logging read \
  "resource.type=k8s_container AND resource.labels.namespace_name=crm-saas-prod AND severity>=ERROR" \
  --project=$PROJECT_ID \
  --limit=50 \
  --format="table(timestamp,textPayload)"
```

---

## 13. Cost Estimate

All estimates are for the `asia-south1` region running a production workload with 3 replicas.

| Service                    | Pricing Model                     | Estimated Monthly Cost           |
| -------------------------- | --------------------------------- | -------------------------------- |
| GKE Autopilot              | $0.10/vCPU/hr, $0.01/GB RAM/hr    | $30-80 (3 pods × 500m CPU × 1Gi) |
| Artifact Registry          | $0.10/GB stored + egress          | ~$1-3                            |
| Cloud Build                | 120 min/day free, then $0.003/min | $0-10                            |
| GCS (crm-saas-prod-assets) | $0.020/GB + $0.004/10K ops        | ~$1-5                            |
| Cloud Load Balancer        | $0.025/hr per rule                | ~$18                             |
| Cloud DNS (optional)       | $0.40/zone/month                  | ~$1                              |
| **Estimated Total**        |                                   | **~$50-120/month**               |

**Cost optimization tips:**

- GKE Autopilot only charges for running pod resources — scale down dev/qa namespaces when not in use
- Set HPA `minReplicas: 1` on dev and qa to reduce idle costs
- Use `kubectl scale deployment dev-crm-app --replicas=0 -n crm-saas-dev` when dev is not needed
- Artifact Registry charges are typically negligible for a single app image
- Cloud Build's free tier (120 min/day) covers most CI/CD needs

---

## Quick Reference

### Common kubectl commands

```bash
kubectl get pods -n crm-saas-prod
kubectl get svc -n crm-saas-prod
kubectl get ingress -n crm-saas-prod
kubectl logs -n crm-saas-prod -l app.kubernetes.io/name=crm-app --tail=100
kubectl rollout status deployment/prod-crm-app -n crm-saas-prod
kubectl rollout undo deployment/prod-crm-app -n crm-saas-prod
kubectl rollout restart deployment/prod-crm-app -n crm-saas-prod
kubectl describe pod -n crm-saas-prod <pod-name>
kubectl exec -it -n crm-saas-prod <pod-name> -- sh
```

### Apply overlays

```bash
kubectl apply -k k8s/overlays/dev
kubectl apply -k k8s/overlays/qa
kubectl apply -k k8s/overlays/prod
```

### Scale replicas manually

```bash
kubectl scale deployment prod-crm-app --replicas=5 -n crm-saas-prod
kubectl scale deployment dev-crm-app --replicas=0 -n crm-saas-dev
```

### Check HPA status

```bash
kubectl get hpa -n crm-saas-prod
kubectl describe hpa prod-crm-app -n crm-saas-prod
```

### GCP console quick links

| Resource          | URL                                                                   |
| ----------------- | --------------------------------------------------------------------- |
| GKE Clusters      | https://console.cloud.google.com/kubernetes/list                      |
| Artifact Registry | https://console.cloud.google.com/artifacts                            |
| Cloud Build       | https://console.cloud.google.com/cloud-build/builds                   |
| Cloud Logging     | https://console.cloud.google.com/logs                                 |
| GCS Bucket        | https://console.cloud.google.com/storage/browser/crm-saas-prod-assets |
| IAM               | https://console.cloud.google.com/iam-admin/iam                        |

---

## Related Documentation

| Document                             | Path                             |
| ------------------------------------ | -------------------------------- |
| DevOps & CI/CD overview              | `docs/devops/DEVOPS-GUIDE.md`    |
| Monitoring plan & metric definitions | `docs/devops/MONITORING_PLAN.md` |
| Cloud Run deployment (legacy)        | `docs/GCP_DEPLOYMENT.md`         |
| Kubernetes manifests                 | `k8s/`                           |
| GitHub Actions workflows             | `.github/workflows/`             |
