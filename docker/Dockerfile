# =============================================================================
# Stage 1: Dependencies
# =============================================================================
FROM node:18-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

# Install all dependencies (need devDeps for build)
RUN npm ci --ignore-scripts && npm cache clean --force

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build-time placeholders — real values injected at runtime via env/secrets
ENV MONGODB_URI="mongodb://placeholder:27017/placeholder" \
    JWT_SECRET="build-time-placeholder-not-real" \
    CORS_ORIGINS="http://localhost:3000" \
    N8N_BASE_URL="http://placeholder:5678" \
    N8N_API_KEY="placeholder" \
    DODO_API_KEY="placeholder" \
    DODO_WEBHOOK_SECRET="placeholder" \
    NEXT_PUBLIC_APP_URL="http://localhost:3000" \
    NEXT_TELEMETRY_DISABLED=1

RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Remove devDependencies
RUN npm prune --production && npm cache clean --force

# =============================================================================
# Stage 3: Production runner
# =============================================================================
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Security: non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy only what's needed
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# Next.js standalone output (if enabled) or full build
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

USER nextjs

EXPOSE 3000

CMD ["node_modules/.bin/next", "start"]
