// src/lib/infrastructure/prisma-client.ts
// Profile-aware PrismaClient resolver (CRITICAL fix: postgres-singleton hardcode).
//
// Both vps-next-postgres and vps-next-mariadb share the same Prisma-backed
// code paths (NextAuthAdapter, PrismaUserRepository), but each profile MUST
// talk to its own generated Prisma client:
//
//   - vps-next-postgres → @prisma/client            (prisma/schema.prisma, postgresql)
//   - vps-next-mariadb  → prisma/mariadb/.prisma/client (mysql provider, custom output)
//
// Previously NextAuthAdapter and PrismaUserRepository statically imported the
// postgres singleton (prisma.ts), so under DEPLOY_PROFILE=vps-next-mariadb the
// postgresql-provider client received a mysql:// DATABASE_URL and failed at
// connect time. This resolver performs the same runtime dispatch that
// src/auth.ts already uses, in one shared place (DRY).
//
// Webpack note: both import() calls below use literal string paths so webpack
// statically traces them into the Server Action / Route Handler bundle.
//
// Edge runtime constraint: MUST NOT be imported from middleware / Edge code
// (Prisma Client uses Node.js native modules).

/**
 * Shared compile-time contract for profile-agnostic Prisma consumers
 * (PrismaUserRepository, NextAuthAdapter, src/auth.ts).
 *
 * This type is defined WITHOUT importing from '@prisma/client' so that
 * profiles that do not generate the postgres schema (vercel/pro, which prunes
 * the entire prisma/ directory) can still compile this file cleanly. The type
 * is structural: any generated Prisma client that satisfies this shape can be
 * used at runtime, including the mariadb-provider client.
 *
 * Provider-specific surfaces ($transaction isolation-level options,
 * RETURNING-based delegate methods `createManyAndReturn` /
 * `updateManyAndReturn`, etc.) legitimately differ between the postgresql and
 * mysql generated clients and are deliberately EXCLUDED — code shared across
 * both profiles must not use them.
 *
 * Compile-time drift guarding between the two generated clients (postgres vs
 * mariadb) is performed in prisma-mariadb.ts via mutual-assignability checks
 * on the model ROW types; the full schema text is enforced by
 * `pnpm check:schema-drift` (CI gate).
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
 * Resolve the PrismaClient singleton for the active deploy profile.
 *
 * @param profile - explicit profile (e.g. from resolveDeployProfile()).
 *   Falls back to process.env.DEPLOY_PROFILE when omitted.
 */
export async function getProfilePrismaClient(
  profile?: string,
): Promise<ProfilePrismaClient> {
  const active = profile ?? process.env.DEPLOY_PROFILE
  if (active === 'vps-next-mariadb' || active === 'vps-nest-mariadb') {
    // webpackIgnore: true tells webpack NOT to statically trace and bundle this
    // module path. For non-mariadb profiles the CLI post-clone step prunes
    // prisma-mariadb.ts, so webpack must not attempt to resolve it at build time
    // (MODULE_NOT_FOUND). The import is safe at runtime because this branch is
    // only reached when DEPLOY_PROFILE is a mariadb variant, i.e. the file
    // is always present when this code actually executes.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const mod = await import(/* webpackIgnore: true */ './prisma-mariadb')
    // SAFETY: the mariadb-generated client cannot be ASSIGNED to the
    // postgres-typed contract because provider-specific filter surfaces
    // differ by design (StringFilter.mode / QueryMode is postgres-only and
    // appears in nested where/include inputs). The MODEL surfaces are
    // guaranteed identical by (1) the row-type mutual-assignability drift
    // guards in prisma-mariadb.ts — a compile error on any field
    // add/remove/rename/type change — and (2) `pnpm check:schema-drift`
    // (CI gate over the full schema text). Shared code must stay within the
    // ProfilePrismaClient surface (provider-only members are excluded above).
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return (mod as { prismaMariadb: unknown }).prismaMariadb as unknown as ProfilePrismaClient
  }
  const { prisma } = await import('./prisma')
  return prisma
}
