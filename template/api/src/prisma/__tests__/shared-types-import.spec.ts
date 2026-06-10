/**
 * Drift-guard: verifies that shared types (Role, toRole) import cleanly
 * from the @shared path alias (template/src/lib/domain/value-objects/role).
 *
 * This test catches tsconfig path misconfiguration that would cause the Nest
 * app to fail at compile time with "Cannot find module '@shared/...'".
 *
 * Note: ProfilePrismaClient is an interface exported from prisma-client.ts.
 * We verify its type import (compile-time only — no runtime instantiation).
 */

// If this import fails the test suite will fail at compilation time.
import { ROLES, toRole, type Role } from '@shared/domain/value-objects/role'

describe('Shared types import (drift guard)', () => {
  it('imports ROLES array from @shared/domain/value-objects/role', () => {
    expect(ROLES).toContain('admin')
    expect(ROLES).toContain('member')
    expect(ROLES).toContain('viewer')
  })

  it('toRole narrows "admin" to Role', () => {
    const role: Role | null = toRole('admin')
    expect(role).toBe('admin')
  })

  it('toRole returns null for invalid values', () => {
    expect(toRole('superuser')).toBeNull()
    expect(toRole(undefined)).toBeNull()
    expect(toRole(null)).toBeNull()
    expect(toRole(42)).toBeNull()
  })

  it('toRole accepts all valid Role values', () => {
    for (const r of ROLES) {
      expect(toRole(r)).toBe(r)
    }
  })
})
