// scripts/seed-users.ts
// Prisma seed for vps-next-postgres profile.
// Run via: pnpm prisma db seed
// package.json: { "prisma": { "seed": "tsx scripts/seed-users.ts" } }
//
// Creates 3 seed users for local development and integration testing:
//   - admin@example.com  (role: admin, status: approved)
//   - member@example.com (role: member, status: approved)
//   - evil@other.com     (role: member, status: approved)
//     ^ This user exists to verify AUTH_ALLOWED_EMAIL_DOMAIN blocks cross-domain login.
//       When AUTH_ALLOWED_EMAIL_DOMAIN=example.com, evil@other.com is rejected by the
//       NextAuth signIn callback even though the DB row exists.
//
// All users share SEED_PASSWORD (from env, default 'changeme-local-only').
// Upsert semantics: idempotent — safe to re-run.

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_SEED_PASSWORD = 'changeme-local-only'
const SEED_PASSWORD = process.env.SEED_PASSWORD ?? DEFAULT_SEED_PASSWORD
const SALT_ROUNDS = 12

// ── Production guard ────────────────────────────────────────────────
// Refuse to seed well-known credentials into a production database.
// Without this, running `prisma db seed` against a production DB with
// SEED_PASSWORD unset (or left at the default) creates accounts with a
// password that is committed to this repository.
//
// Heuristics (either one trips the guard):
//   - NODE_ENV=production
//   - DATABASE_URL points at a non-local host (not localhost/127.0.0.1/
//     ::1/postgres — 'postgres' is the docker-compose service name)
function isLocalDatabaseUrl(url: string | undefined): boolean {
  if (!url) return true // absent → Prisma will fail anyway; don't block here
  try {
    const host = new URL(url).hostname
    return ['localhost', '127.0.0.1', '::1', 'postgres'].includes(host)
  } catch {
    return false // unparsable URL → be conservative, treat as non-local
  }
}

const isDefaultPassword = SEED_PASSWORD === DEFAULT_SEED_PASSWORD
const isProductionTarget =
  process.env.NODE_ENV === 'production' || !isLocalDatabaseUrl(process.env.DATABASE_URL)

if (isDefaultPassword && isProductionTarget) {
  console.error(
    '[seed-users] FATAL: SEED_PASSWORD is unset or equals the default ' +
      `'${DEFAULT_SEED_PASSWORD}' while targeting a production environment ` +
      '(NODE_ENV=production or non-local DATABASE_URL). ' +
      'Set a strong SEED_PASSWORD in .env before seeding, or skip seeding in production.',
  )
  process.exit(1)
}

// NOTE (idempotency): upserts below use `update: {}` — re-running seed with a
// NEW SEED_PASSWORD does NOT change the password of already-existing users.
// To rotate a seed user's password, delete the row (or update passwordHash
// manually) and re-run the seed.

async function main() {
  const hash = await bcrypt.hash(SEED_PASSWORD, SALT_ROUNDS)

  // admin@example.com — role: admin, status: approved
  await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: hash,
      role: 'admin',
      status: 'approved',
      name: 'Admin User',
    },
  })

  // member@example.com — role: member, status: approved
  await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      passwordHash: hash,
      role: 'member',
      status: 'approved',
      name: 'Member User',
    },
  })

  // evil@other.com — role: member, status: approved
  // Exists to verify AUTH_ALLOWED_EMAIL_DOMAIN blocks cross-domain login.
  // When AUTH_ALLOWED_EMAIL_DOMAIN=example.com, this user's sign-in attempt
  // will be rejected by the NextAuth signIn callback even though the DB row exists.
  await prisma.user.upsert({
    where: { email: 'evil@other.com' },
    update: {},
    create: {
      email: 'evil@other.com',
      passwordHash: hash,
      role: 'member',
      status: 'approved',
      name: 'Evil User',
    },
  })

  console.log('Seed complete: admin@example.com, member@example.com, evil@other.com')
  console.log(`Password for all users: SEED_PASSWORD env (default: changeme-local-only)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
