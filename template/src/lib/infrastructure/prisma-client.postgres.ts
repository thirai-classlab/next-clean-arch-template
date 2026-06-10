// src/lib/infrastructure/prisma-client.postgres.ts
// Variant: PostgreSQL-only PrismaClient resolver.
//
// This file is used by the CLI post-clone step for profiles that target
// PostgreSQL exclusively (vps-next-postgres, vps-nest-postgres). It is
// copied to prisma-client.ts during scaffolding, replacing the "both"
// variant (prisma-client.ts) that uses webpackIgnore tricks.
//
// No webpackIgnore, no dynamic `as string` casts — webpack can statically
// trace this file cleanly. The mariadb branch simply does not exist, so
// there is nothing for webpack to accidentally bundle.
//
// Edge runtime constraint: MUST NOT be imported from middleware / Edge code.

/**
 * Shared compile-time contract for profile-agnostic Prisma consumers.
 * Identical to the "both" variant's ProfilePrismaClient — consumers that
 * import from prisma-client.ts do not need to change between variants.
 */
export type ProfilePrismaClient = {
  $connect(): Promise<void>
  $disconnect(): Promise<void>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: { findUnique: (...args: any[]) => any; upsert: (...args: any[]) => any; create: (...args: any[]) => any; update: (...args: any[]) => any; delete: (...args: any[]) => any; findMany: (...args: any[]) => any }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  account: { create: (...args: any[]) => any; findFirst: (...args: any[]) => any; delete: (...args: any[]) => any; deleteMany: (...args: any[]) => any }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  auditLog: { create: (...args: any[]) => any; findMany: (...args: any[]) => any; count: (...args: any[]) => any }
}

/**
 * Resolve the PrismaClient singleton for PostgreSQL profiles.
 *
 * Always uses the postgres-provider client (@prisma/client).
 * The mariadb branch is intentionally absent — webpack statically traces
 * the single './prisma' import and bundles only the postgres client.
 */
export async function getProfilePrismaClient(
  _profile?: string,
): Promise<ProfilePrismaClient> {
  const { prisma } = await import('./prisma')
  return prisma as unknown as ProfilePrismaClient
}
