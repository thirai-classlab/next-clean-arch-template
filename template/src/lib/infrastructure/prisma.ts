// src/lib/infrastructure/prisma.ts
// Prisma Client singleton for vps-next-postgres profile.
//
// ## Next.js dev hot-reload pattern
// In development, Next.js module HMR can instantiate new PrismaClient instances
// on each hot-reload, exhausting the database connection pool quickly.
// The globalThis.__prisma__ pattern persists the client across module reloads
// by storing it on the Node.js global object, which survives HMR.
//
// ## Edge runtime constraint
// This module MUST NOT be imported in Edge runtime code (src/middleware.ts or
// any file executed in the Edge context). Prisma Client uses Node.js native
// modules incompatible with the Edge runtime.
// Use next-auth/jwt getToken() for role resolution in middleware instead.
//
// ## Usage
// import { prisma } from '@/lib/infrastructure/prisma'
// const user = await prisma.user.findUnique({ where: { email } })

import { PrismaClient } from '@prisma/client'

declare global {
  // eslint-disable-next-line no-var
  var __prisma__: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  })
}

// In production: always create a fresh client (no module re-evaluation risk).
// In development: reuse the global instance to survive HMR.
export const prisma: PrismaClient =
  globalThis.__prisma__ ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma__ = prisma
}
