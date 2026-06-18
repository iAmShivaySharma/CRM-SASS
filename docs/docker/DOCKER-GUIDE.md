# Docker Guide — CRM SaaS

## File Structure

```
docker/
├── Dockerfile           # Production (multi-stage, ~3x smaller)
├── Dockerfile.dev       # Development (hot reload)
└── .dockerignore        # Files excluded from build context

docker-compose.yml       # Local prod-like run (root)
docker-compose.dev.yml   # Local dev with hot reload (root)
.dockerignore            # Root-level ignore for builds
```

---

## Production Dockerfile (`docker/Dockerfile`)

### 3-Stage Build

```
Stage 1: deps      — Install all npm dependencies (cached layer)
Stage 2: builder   — Copy source, run `npm run build`, prune devDeps
Stage 3: runner    — Minimal Alpine image with only production artifacts
```

### Security hardening

- **Non-root user**: runs as `nextjs` (UID 1001), not root
- **Minimal image**: Alpine-based, only production deps
- **Health check**: built-in `HEALTHCHECK` hitting `/api/health`
- **No secrets baked in**: build-time env vars are placeholders, real values injected at runtime

### Build locally

```bash
# From project root
docker build -f docker/Dockerfile -t crm-saas:local .

# Or use the npm script
npm run build:docker
```

### Run locally

```bash
docker run -p 3000:3000 \
  -e MONGODB_URI="your-atlas-uri" \
  -e JWT_SECRET="your-secret" \
  crm-saas:local
```

---

## Development Dockerfile (`docker/Dockerfile.dev`)

Single-stage, installs all dependencies including devDeps, runs `npm run dev` for hot reload.

### Run with docker-compose

```bash
# Start dev environment (app + local MongoDB)
docker-compose -f docker-compose.dev.yml up --build

# Stop
docker-compose -f docker-compose.dev.yml down

# Stop and remove volumes (reset DB)
docker-compose -f docker-compose.dev.yml down -v
```

### Volume mounts

The dev compose mounts your source code into the container for hot reload:

```yaml
volumes:
  - .:/app              # Source code (hot reload)
  - /app/node_modules   # Prevent overwrite by host node_modules
  - /app/.next          # Prevent overwrite by host .next
```

---

## Docker Compose Files

### `docker-compose.yml` (production-like)

- Uses `docker/Dockerfile` (multi-stage)
- Reads env from `.env` file
- Local MongoDB for testing prod builds
- No volume mounts (no hot reload)

### `docker-compose.dev.yml` (development)

- Uses `docker/Dockerfile.dev`
- Reads env from `.env.development`
- Local MongoDB with default dev credentials
- Volume mounts for hot reload

### Environment variables

Both compose files use `env_file` to load environment variables. **No hardcoded credentials in compose files.** Create your `.env` or `.env.development` from `.env.example`:

```bash
cp .env.example .env.development
# Edit .env.development with your values
```

---

## Image Tagging Strategy

Images pushed to GHCR follow this tagging:

| Tag Pattern        | When                  | Example                    |
|--------------------|-----------------------|----------------------------|
| `dev-{sha}`        | Deploy to dev         | `dev-abc1234`              |
| `qa-{sha}`         | Deploy to QA          | `qa-abc1234`               |
| `prod-{sha}`       | Deploy to prod        | `prod-abc1234`             |
| `sha-{full_sha}`   | Every build           | `sha-abc1234567890`        |
| `develop`          | Push to develop       | `develop`                  |
| `main` / `latest`  | Push to main          | `latest`                   |
| `v1.2.3`           | Semver tag            | `v1.2.3`                   |

---

## Image Signing

Production images are signed with [cosign](https://github.com/sigstore/cosign) (keyless, using GitHub OIDC). This ensures image integrity — you can verify before deploying:

```bash
cosign verify ghcr.io/OWNER/crm-saas:latest \
  --certificate-identity-regexp="https://github.com/OWNER/CRM-SASS" \
  --certificate-oidc-issuer="https://token.actions.githubusercontent.com"
```

---

## Troubleshooting

### Build fails with OOM

Increase Node.js memory in the Dockerfile builder stage:

```dockerfile
RUN NODE_OPTIONS="--max-old-space-size=8192" npm run build
```

### Image too large

Check image size:

```bash
docker images crm-saas:local
```

If >500MB, ensure:
- `.dockerignore` excludes `node_modules`, `.next`, `.git`
- `npm prune --production` runs in builder stage
- No unnecessary COPY in the runner stage

### Health check failing

The container expects `/api/health` endpoint. Ensure this route exists in your Next.js app and returns 200.
