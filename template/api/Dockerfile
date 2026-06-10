# Multi-stage Dockerfile for the Nest API
# Build: docker build -f api/Dockerfile -t nest-api .
# (context must be template/ root so shared prisma schemas are accessible)

# ── Stage 1: Build ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy root-level pnpm lockfile and workspace config (needed for install)
COPY pnpm-lock.yaml package.json ./
COPY prisma ./prisma/

# Copy the api package
COPY api ./api/

# Install dependencies (standalone npm package; package-lock.json is committed)
WORKDIR /app/api
RUN npm ci --ignore-scripts 2>/dev/null || npm install --legacy-peer-deps --ignore-scripts

# Generate BOTH Prisma clients (HIGH fix: the mariadb client was never
# generated, so the vps-nest-mariadb profile silently fell back to the
# postgresql-provider client at runtime).
#   - postgres schema → /app/api/node_modules/.prisma/client (+ @prisma/client)
#   - mariadb schema  → /app/prisma/mariadb/.prisma/client (custom output path)
RUN npx prisma generate --schema ../prisma/schema.prisma
RUN npx prisma generate --schema ../prisma/mariadb/schema.prisma

# Build the Nest application
# NOTE: the @shared path mapping pulls ../src/lib into the program, so tsc
# widens the rootDir to template/ and emits dist/api/src/** (not dist/src/**).
# The shared template src/ must be present for @shared/* imports to compile.
COPY src /app/src/
RUN npx nest build || npx tsc -p tsconfig.json

# ── Stage 2: Runtime ──────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

WORKDIR /app

# Copy only necessary runtime artifacts
COPY --from=builder --chown=nestjs:nodejs /app/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/api/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/api/package.json ./package.json

# Copy the generated mariadb Prisma client (custom output path). The
# PrismaService locates it by walking up from dist/api/src/prisma/ —
# /app/prisma/mariadb/.prisma/client is found from /app/dist/api/src/prisma.
# (The postgres client already lives in node_modules/.prisma via the copy above.)
COPY --from=builder --chown=nestjs:nodejs /app/prisma/mariadb/.prisma ./prisma/mariadb/.prisma

USER nestjs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=10s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/api/src/main"]
