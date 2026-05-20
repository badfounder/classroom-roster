# syntax=docker/dockerfile:1.6
#
# Production image for the classroom roster app.
#
# Three stages so the runner is lean (no dev dependencies, no source maps)
# while still carrying everything Next.js, pg, and the migrate script need:
#
#   deps     -> production-only npm install (used by the runner)
#   builder  -> full install + `next build`
#   runner   -> the actual deployed image
#
# Run locally with:
#   docker build -t classroom-roster .
#   docker run --rm -p 3000:3000 \
#       -e DATABASE_URL=postgresql://… -e NEXTAUTH_URL=https://… \
#       -e NEXTAUTH_SECRET=… \
#       -v /srv/roster-uploads:/app/uploads \
#       classroom-roster

# ---- deps (production only, copied into the runner) ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---- builder (full install + next build) ----
FROM node:20-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Default location for student / classroom photos. Mount a persistent
# volume here when deploying (Coolify, Docker, k8s); otherwise uploads
# are wiped on every container restart.
ENV UPLOAD_DIR=/app/uploads

# Run as an unprivileged user.
RUN groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=deps    --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next         ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public        ./public
COPY --from=builder --chown=nextjs:nodejs /app/db            ./db
COPY --from=builder --chown=nextjs:nodejs /app/scripts       ./scripts
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/package-lock.json /app/next.config.ts ./

RUN mkdir -p /app/uploads && chown -R nextjs:nodejs /app/uploads

USER nextjs
EXPOSE 3000

# `npm start` runs `next start` which binds to $HOSTNAME:$PORT.
CMD ["npm", "run", "start"]
