// src/lib/auth/require-role-db-fetch.spec.ts
//
// task-5 Step 8 — security-critical unit tests for the async DB-fetch path of
// `requireRole` (review H-REQROLE / security-reviewer C3).
//
// The existing role-guard.spec.ts only covers `evaluateRoleAccess` (pure function).
// These tests cover the async `requireRole` function which calls Supabase.
//
// Design decisions:
//   - Mock `@/lib/supabase/server` so `createClient()` returns a controlled stub.
//   - Assert `getUser()` is called and `getSession()` is NEVER called
//     (anti-JWT-forgery invariant NEW-N-01).
//   - No live Supabase connection required; all tests run in vitest / Node.

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock setup ────────────────────────────────────────────────────────
// We intercept `@/lib/supabase/server` before importing `requireRole` so the
// module under test picks up the mock.
//
// `createClientMock` is a vi.fn() so individual tests can override its
// implementation (e.g., to simulate a synchronous throw from the factory).

const getUserMock = vi.fn()
const getSessionMock = vi.fn()
const fromMock = vi.fn()

const createClientMock = vi.fn(async () => ({
  auth: {
    getUser: getUserMock,
    // getSession must NEVER be called — we expose it only to be able to
    // assert it stays un-called (NEW-N-01 invariant).
    getSession: getSessionMock,
  },
  from: fromMock,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => createClientMock(),
}))

import { requireRole, assertAdmin } from './role-guard'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Shorthand to make `from('users').select('role').eq(...).single()` resolve. */
function mockDbRoleQuery(role: string | null, error: null | object = null) {
  const chainEnd = {
    single: vi.fn().mockResolvedValue({
      data: role !== null ? { role } : null,
      error,
    }),
  }
  const chainEq = { eq: vi.fn().mockReturnValue(chainEnd) }
  const chainSelect = { select: vi.fn().mockReturnValue(chainEq) }
  fromMock.mockReturnValue(chainSelect)
  return { chainEnd, chainEq, chainSelect }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('requireRole — async DB-fetch path', () => {
  beforeEach(() => {
    createClientMock.mockClear()
    getUserMock.mockReset()
    getSessionMock.mockReset()
    fromMock.mockReset()
    // Restore default implementation (returns the stub client).
    createClientMock.mockImplementation(async () => ({
      auth: { getUser: getUserMock, getSession: getSessionMock },
      from: fromMock,
    }))
  })

  // NEW-N-01: server-side role resolution MUST use getUser(), not getSession().
  // getSession() returns the cookie value verbatim without server validation,
  // making JWT forgery / replay attacks viable.
  describe('NEW-N-01: anti-JWT-forgery invariant — getUser() not getSession()', () => {
    it('calls getUser() to resolve the session', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-1' } } })
      mockDbRoleQuery('admin')

      await requireRole(['admin'])

      expect(getUserMock).toHaveBeenCalledOnce()
    })

    it('NEVER calls getSession() — the insecure cookie-value shortcut', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-1' } } })
      mockDbRoleQuery('admin')

      await requireRole(['admin'])

      // If this assertion fails it means the implementation switched to
      // getSession() which bypasses server-side JWT validation.
      expect(getSessionMock).not.toHaveBeenCalled()
    })
  })

  describe('admin DB role → allowed', () => {
    it('returns { kind: "allowed" } when Supabase resolves admin role', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
      mockDbRoleQuery('admin')

      const result = await requireRole(['admin'])

      expect(result).toEqual({ kind: 'allowed', userId: 'u-admin', role: 'admin' })
    })

    it('assertAdmin() convenience wrapper also returns allowed for admin', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-admin' } } })
      mockDbRoleQuery('admin')

      const result = await assertAdmin()

      expect(result).toEqual({ kind: 'allowed', userId: 'u-admin', role: 'admin' })
    })
  })

  describe('non-admin roles → forbidden', () => {
    it('returns { kind: "forbidden", role: "member" } for a member session', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-member' } } })
      mockDbRoleQuery('member')

      const result = await requireRole(['admin'])

      expect(result).toEqual({ kind: 'forbidden', role: 'member' })
    })

    it('returns { kind: "forbidden", role: "viewer" } for a viewer session', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-viewer' } } })
      mockDbRoleQuery('viewer')

      const result = await requireRole(['admin'])

      expect(result).toEqual({ kind: 'forbidden', role: 'viewer' })
    })
  })

  describe('unauthenticated / missing session → unauthorized (fail-closed)', () => {
    it('returns unauthorized when getUser() returns user: null (no session)', async () => {
      getUserMock.mockResolvedValue({ data: { user: null } })

      const result = await requireRole(['admin'])

      // No DB query should be attempted when user is absent.
      expect(fromMock).not.toHaveBeenCalled()
      expect(result).toEqual({ kind: 'unauthorized' })
    })

    it('returns unauthorized when getUser() returns undefined user', async () => {
      getUserMock.mockResolvedValue({ data: { user: undefined } })

      const result = await requireRole(['admin'])

      expect(result).toEqual({ kind: 'unauthorized' })
    })
  })

  describe('DB query error → fail-closed (safe-by-default)', () => {
    it('returns unauthorized when the public.users SELECT fails (network/RLS error)', async () => {
      getUserMock.mockResolvedValue({ data: { user: { id: 'u-1' } } })
      // Simulate a Supabase error response from the users table query.
      mockDbRoleQuery(null, { message: 'connection refused', code: 'PGRST' })

      const result = await requireRole(['admin'])

      // Fail-closed: a DB error must not grant access — must return unauthorized
      // (or forbidden with null role treated as unauthorized by evaluateRoleAccess).
      expect(result.kind).toBe('unauthorized')
    })

    it('returns unauthorized when createClient() throws (env unset / network failure)', async () => {
      // Override createClient to throw synchronously, simulating env-unset path.
      // We control this via createClientMock which is the backing fn of the mock.
      createClientMock.mockImplementationOnce(() => {
        throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
      })

      const result = await requireRole(['admin'])

      // The catch block in requireRole must keep userId/role null → unauthorized.
      expect(result).toEqual({ kind: 'unauthorized' })
    })
  })
})
