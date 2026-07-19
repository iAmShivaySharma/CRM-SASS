FROM node:18-alpine AS deps

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci --ignore-scripts && npm cache clean --force

FROM node:18-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV MONGODB_URI="mongodb://placeholder:27017/placeholder" \
    JWT_SECRET="build-time-placeholder-not-real" \
    CORS_ORIGINS="http://localhost:3000" \
    N8N_BASE_URL="http://placeholder:5678" \
    N8N_API_KEY="placeholder" \
    DODO_API_KEY="placeholder" \
    DODO_WEBHOOK_SECRET="placeholder" \
    REDIS_URL="" \
    NEXT_PUBLIC_APP_URL="" \
    NEXT_TELEMETRY_DISABLED=1

RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build:unix

FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

USER nextjs

EXPOSE 8080

CMD ["node", "server.js"]
