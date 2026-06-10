# Dockerfile — production image for the vps-next-postgres profile.
# Referenced by docker-compose.vps.yml (service: app).
#
# Multi-stage build:
#   deps    — install all dependencies (postinstall runs `prisma generate`
#             with a dummy DATABASE_URL; the generated client is URL-agnostic).
#   builder — `next build` with DEPLOY_PROFILE=vps-next-postgres + MOCK_MODE=true.
#             env-schema refinement 4 explicitly permits this combination for
#             build-time verification only — no DB/secrets are needed to build.
#             The REAL runtime env (MOCK_MODE=false, DATABASE_URL, NEXTAUTH_*)
#             is injected by docker-compose at container start, NOT baked here.
#   runner  — minimal runtime: NODE_ENV=production + MOCK_MODE=false defaults.
#             src/instrumentation.ts fail-fasts if MOCK_MODE=true ever reaches
#             a NODE_ENV=production runtime (mock auth bypass guard).
#
# Build:  docker compose -f docker-compose.vps.yml build
# Run:    docker compose -f docker-compose.vps.yml up -d

# ── Base ────────────────────────────────────────────────────────────
FROM node:20-alpine AS base
# openssl / libc6-compat: required by Prisma engines on alpine (musl).
RUN apk add --no-cache libc6-compat openssl
RUN npm install -g pnpm@9
WORKDIR /app

# ── Dependencies ────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# prisma/ must be present before install: the postinstall hook runs
# `prisma generate` against prisma/schema.prisma.
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# ── Build ───────────────────────────────────────────────────────────
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time only env (see header comment). NEXTAUTH_SECRET et al. are NOT
# required at build time; prebuild env:validate passes via refinement 4.
ENV DEPLOY_PROFILE=vps-next-postgres
ENV MOCK_MODE=true
RUN pnpm exec prisma generate && pnpm build

# ── Runtime ─────────────────────────────────────────────────────────
FROM base AS runner
ENV NODE_ENV=production
# Safe defaults — docker-compose.vps.yml sets these explicitly, but a bare
# `docker run` of this image must never boot in mock mode.
ENV DEPLOY_PROFILE=vps-next-postgres
ENV MOCK_MODE=false
COPY --from=builder /app ./
EXPOSE 3000
CMD ["pnpm", "start"]
