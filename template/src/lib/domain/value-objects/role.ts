// src/lib/domain/value-objects/role.ts
// Role VO — closed union of admin / member / viewer.

export const ROLES = Object.freeze(['admin', 'member', 'viewer'] as const)
export type Role = (typeof ROLES)[number]

/**
 * Narrow an unknown value to a valid Role, or null.
 *
 * Shared by auth.ts, nextauth-auth.adapter.ts, prisma-user.repository.ts and
 * supabase-auth.adapter.ts so the JWT/DB-to-domain Role narrowing has a single
 * source of truth (a missed update in one copy would silently let unauthorized
 * role strings through the boundary).
 */
export function toRole(value: unknown): Role | null {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
    ? (value as Role)
    : null
}
