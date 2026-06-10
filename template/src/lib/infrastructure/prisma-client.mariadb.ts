// src/lib/infrastructure/prisma-client.mariadb.ts
// Variant: MariaDB-only PrismaClient resolver.
//
// This file is used by the CLI post-clone step for profiles that target
// MariaDB exclusively (vps-next-mariadb, vps-nest-mariadb). It is
// copied to prisma-client.ts during scaffolding, replacing the "both"
// variant (prisma-client.ts) that uses webpackIgnore tricks.
//
// No webpackIgnore, no dynamic `as string` casts — webpack can statically
// trace this file cleanly. The postgres branch simply does not exist, so
// there is no MODULE_NOT_FOUND risk from accidentally bundling a pruned module.
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
 * Resolve the PrismaClient singleton for MariaDB profiles.
 *
 * Always uses the mariadb-provider client (prisma/mariadb/.prisma/client).
 * The postgres branch is intentionally absent — webpack statically traces
 * the single './prisma-mariadb' import and bundles only the mariadb client.
 * prisma-mariadb.ts must exist at this point (CLI does not prune it for
 * mariadb profiles).
 */
export async function getProfilePrismaClient(
  _profile?: string,
): Promise<ProfilePrismaClient> {
  // Direct static import — no webpackIgnore needed because prisma-mariadb.ts
  // is guaranteed to exist on mariadb profiles (CLI does not prune it).
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const mod = await import('./prisma-mariadb')
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return (mod as { prismaMariadb: unknown }).prismaMariadb as unknown as ProfilePrismaClient
}
