# CRM SaaS — GCP Deployment Guide

## Architecture

```
                    ┌──────────────────┐
                    │   Cloud DNS /    │
                    │   Custom Domain  │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │    Cloud Run     │
                    │   (Next.js App)  │
                    │   Port 8080      │
                    └──┬─────┬─────┬───┘
                       │     │     │
          ┌────────────┘     │     └────────────┐
          ▼                  ▼                  ▼
   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐
   │   MongoDB   │  │  Cloud Run   │  │ GCS Bucket   │
   │  (External) │  │    (n8n)     │  │  (Storage)   │
   └─────────────┘  └──────────────┘  └──────────────┘
```

| Component     | Service             | Details                           |
| ------------- | ------------------- | --------------------------------- |
| Next.js app   | Cloud Run           | Auto-scaling, standalone build    |
| MongoDB       | External            | Already hosted at 178.236.183.178 |
| n8n           | Cloud Run           | Workflow engine                   |
| File Storage  | Cloud Storage (GCS) | Replaces MinIO                    |
| Secrets       | Secret Manager      | All sensitive env vars            |
| Docker images | Artifact Registry   | Private container repo            |

---

## Prerequisites

- Google Cloud account with billing enabled
- `gcloud` CLI installed ([install guide](https://cloud.google.com/sdk/docs/install))
- Docker installed locally
- Git repository pushed to GitHub/GitLab (for CI/CD later)

---

## Step 1: Authenticate & Create Project

```bash
# Login to GCP
gcloud auth login

# Create a new project (or use existing)
gcloud projects create crm-saas-prod --name="CRM SaaS"

# Set as active project
gcloud config set project crm-saas-prod

# Link billing account (required for Cloud Run)
# Go to: https://console.cloud.google.com/billing
# Link your billing account to the project
```

---

## Step 2: Enable Required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  storage.googleapis.com
```

---

## Step 3: Set Region

```bash
# Use Mumbai region (closest for India)
gcloud config set run/region asia-south1
```

---

## Step 4: Create Artifact Registry

```bash
gcloud artifacts repositories create crm-saas \
  --repository-format=docker \
  --location=asia-south1 \
  --description="CRM SaaS Docker images"

# Configure Docker to push to this registry
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

---

## Step 5: Create GCS Bucket for File Storage

```bash
# Create bucket
gcloud storage buckets create gs://crm-saas-files \
  --location=asia-south1 \
  --uniform-bucket-level-access

# Make uploaded files publicly readable
gcloud storage buckets add-iam-policy-binding gs://crm-saas-files \
  --member=allUsers \
  --role=roles/storage.objectViewer
```

---

## Step 6: Store Secrets in Secret Manager

Replace the placeholder values below with your actual secrets.

```bash
# MongoDB connection string
printf "mongodb://root:OGvzfNi0Sg6ulYRmLjfCyCaqA2FCZ6jlTA7OotGLY5JMEjL6vIQ6cPxeHsKunPRb@178.236.183.178:27202/?directConnection=true" | \
  gcloud secrets create MONGODB_URI --data-file=-

# JWT secret (generate a strong one)
printf "%s" "$(openssl rand -base64 48)" | \
  gcloud secrets create JWT_SECRET --data-file=-

# Resend API key (email service)
printf "re_LBwDKaFm_74QiC3eJDZSeWidSucUvERyK" | \
  gcloud secrets create RESEND_API_KEY --data-file=-

# n8n API key
printf "YOUR_N8N_API_KEY_HERE" | \
  gcloud secrets create N8N_API_KEY --data-file=-

# OpenRouter API key (for AI workflows)
printf "sk-or-v1-YOUR_KEY_HERE" | \
  gcloud secrets create PLATFORM_OPENROUTER_API_KEY --data-file=-

# Encryption secret for customer API keys
printf "%s" "$(openssl rand -hex 32)" | \
  gcloud secrets create API_KEY_ENCRYPTION_SECRET --data-file=-
```

Grant Cloud Run access to secrets:

```bash
PROJECT_NUMBER=$(gcloud projects describe crm-saas-prod --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding MONGODB_URI \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding JWT_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding RESEND_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding N8N_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding PLATFORM_OPENROUTER_API_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding API_KEY_ENCRYPTION_SECRET \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Step 7: Deploy n8n to Cloud Run

```bash
gcloud run deploy n8n \
  --image=n8nio/n8n:latest \
  --region=asia-south1 \
  --platform=managed \
  --port=5678 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=1 \
  --max-instances=2 \
  --allow-unauthenticated \
  --set-env-vars="N8N_PROTOCOL=https,GENERIC_TIMEZONE=Asia/Kolkata,N8N_SECURE_COOKIE=false"
```

After deployment, note the URL:

```bash
N8N_URL=$(gcloud run services describe n8n --region=asia-south1 --format="value(status.url)")
echo "n8n URL: $N8N_URL"
```

Update the n8n secret with the actual API key from n8n:

1. Open `$N8N_URL` in browser
2. Create admin account
3. Go to Settings > API > Create API Key
4. Update the secret:

```bash
printf "YOUR_ACTUAL_N8N_API_KEY" | \
  gcloud secrets versions add N8N_API_KEY --data-file=-
```

---

## Step 8: Build & Push the App Docker Image

Run from the project root directory:

```bash
# Set your project ID
PROJECT_ID=crm-saas-prod

# Build the Docker image
docker build \
  -f docker/Dockerfile \
  -t asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest \
  .

# Push to Artifact Registry
docker push asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest
```

If building on Windows/Mac with ARM chip, add `--platform linux/amd64`:

```bash
docker build \
  --platform linux/amd64 \
  -f docker/Dockerfile \
  -t asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest \
  .
```

---

## Step 9: Deploy the App to Cloud Run

```bash
PROJECT_ID=crm-saas-prod
N8N_URL=$(gcloud run services describe n8n --region=asia-south1 --format="value(status.url)")

gcloud run deploy crm-saas \
  --image=asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest \
  --region=asia-south1 \
  --platform=managed \
  --port=8080 \
  --memory=1Gi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --allow-unauthenticated \
  --set-secrets="\
MONGODB_URI=MONGODB_URI:latest,\
JWT_SECRET=JWT_SECRET:latest,\
RESEND_API_KEY=RESEND_API_KEY:latest,\
N8N_API_KEY=N8N_API_KEY:latest,\
PLATFORM_OPENROUTER_API_KEY=PLATFORM_OPENROUTER_API_KEY:latest,\
API_KEY_ENCRYPTION_SECRET=API_KEY_ENCRYPTION_SECRET:latest" \
  --set-env-vars="\
JWT_EXPIRES_IN=7d,\
STORAGE_PROVIDER=gcs,\
GCS_PROJECT_ID=${PROJECT_ID},\
GCS_BUCKET_NAME=crm-saas-files,\
EMAIL_FROM_ADDRESS=onboarding@resend.dev,\
N8N_BASE_URL=${N8N_URL},\
NEXT_PUBLIC_APP_URL=https://YOUR_DOMAIN.com,\
CORS_ORIGINS=https://YOUR_DOMAIN.com"
```

After deployment:

```bash
APP_URL=$(gcloud run services describe crm-saas --region=asia-south1 --format="value(status.url)")
echo "App URL: $APP_URL"
```

---

## Step 10: Map Custom Domain (Optional)

```bash
# Map your domain
gcloud run domain-mappings create \
  --service=crm-saas \
  --domain=app.yourdomain.com \
  --region=asia-south1
```

GCP will show DNS records to add. Go to your domain registrar and add:

| Type  | Name | Value                |
| ----- | ---- | -------------------- |
| CNAME | app  | ghs.googlehosted.com |

Wait 5-15 minutes for SSL provisioning.

Then update NEXT_PUBLIC_APP_URL and CORS_ORIGINS:

```bash
gcloud run services update crm-saas \
  --region=asia-south1 \
  --update-env-vars="\
NEXT_PUBLIC_APP_URL=https://app.yourdomain.com,\
CORS_ORIGINS=https://app.yourdomain.com"
```

---

## Step 11: Verify Deployment

```bash
# Check service status
gcloud run services describe crm-saas --region=asia-south1

# Check logs
gcloud run services logs read crm-saas --region=asia-south1 --limit=50

# Test health endpoint
curl -s ${APP_URL}/api/health

# Check n8n is running
curl -s ${N8N_URL}
```

---

## Updating the App (Re-deploy)

Whenever you push new code:

```bash
PROJECT_ID=crm-saas-prod

# Build new image
docker build \
  -f docker/Dockerfile \
  -t asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest \
  .

# Push
docker push asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest

# Deploy (Cloud Run picks up the new image)
gcloud run services update crm-saas \
  --region=asia-south1 \
  --image=asia-south1-docker.pkg.dev/${PROJECT_ID}/crm-saas/app:latest
```

---

## Updating Secrets

```bash
# Example: rotate JWT secret
printf "%s" "$(openssl rand -base64 48)" | \
  gcloud secrets versions add JWT_SECRET --data-file=-

# Redeploy to pick up new secret version
gcloud run services update crm-saas --region=asia-south1
```

---

## Monitoring & Logs

```bash
# Live logs
gcloud run services logs tail crm-saas --region=asia-south1

# Error logs only
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=crm-saas AND severity>=ERROR" --limit=20 --format="table(timestamp,textPayload)"

# n8n logs
gcloud run services logs tail n8n --region=asia-south1
```

Cloud Console dashboards:

- **Cloud Run**: https://console.cloud.google.com/run
- **Logs**: https://console.cloud.google.com/logs
- **Storage**: https://console.cloud.google.com/storage

---

## Cost Estimate (Monthly)

| Service           | Estimate     | Notes                        |
| ----------------- | ------------ | ---------------------------- |
| Cloud Run (app)   | $0 - $15     | Free tier: 2M requests/month |
| Cloud Run (n8n)   | $5 - $15     | Always-on (min 1 instance)   |
| Artifact Registry | $0.10/GB     | ~$0.50 for images            |
| Cloud Storage     | $0.02/GB     | Pay for what you store       |
| Secret Manager    | Free         | 10K access calls/month free  |
| **Total**         | **$5 - $30** | Scales with usage            |

---

## Troubleshooting

**Build fails with OOM**

```bash
# Increase Docker memory or use Cloud Build
gcloud builds submit \
  --config=cloudbuild.yaml \
  --timeout=30m
```

**App can't connect to MongoDB**

- Ensure MongoDB allows connections from GCP IPs
- Or whitelist `0.0.0.0/0` temporarily for testing
- Check: `gcloud run services logs read crm-saas --region=asia-south1 --limit=10`

**n8n webhooks not working**

- n8n on Cloud Run needs `--min-instances=1` (webhooks need an always-on instance)
- Set `N8N_SECURE_COOKIE=false` (Cloud Run terminates SSL)

**GCS upload permission denied**

```bash
# Grant the Cloud Run service account storage access
PROJECT_NUMBER=$(gcloud projects describe crm-saas-prod --format="value(projectNumber)")
gcloud projects add-iam-policy-binding crm-saas-prod \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"
```

**Custom domain SSL pending**

- DNS propagation takes 5-15 minutes
- Verify DNS: `dig app.yourdomain.com CNAME`
- SSL provisioning can take up to 24 hours in rare cases
