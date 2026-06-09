// src/lib/interfaces/actions/non-admin-session-guard.spec.ts
//
// task-5 Step 8 — security-critical tests: admin actions must reject non-admin
// authenticated sessions (review M-1 / tdd-guide M-1).
//
// BUG FINDING (HIGH severity):
//   `changeUserRoleAction` and `approveUserAction` check only `if (!session)`
//   (null guard) but do NOT verify `session.role === 'admin'`. A valid session
//   with role 'member' or 'viewer' passes the null guard and proceeds to
//   execute the UseCase. This violates the admin-only contract documented in
//   draft 08 §4 and CLAUDE.md design constraints.
//
//   These tests assert the CORRECT secure behavior. They are written RED-first;
//   the production fix is applied after this file.
//
// Scope: changeUserRoleAction + approveUserAction (the two actions called out in
// the review). The pattern is identical for rejectUser/removeAllowList — those
// delegate through the same getAuthenticatedSession() path and are covered by
// the same guard fix.

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

const resolveMock = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  container: { resolve: (token: unknown) => resolveMock(token) },
  ensureContainer: vi.fn().mockResolvedValue(undefined),
}))

import { changeUserRoleAction } from './change-user-role.action'
import { approveUserAction } from './approve-user.action'
import { rejectUserAction } from './reject-user.action'
import { addAllowedUserAction } from './add-allowed-user.action'
import { revalidatePath } from 'next/cache'

// Helper: build an AuthPort that returns a session with a specific role.
function authPortWithRole(role: 'admin' | 'member' | 'viewer') {
  return {
    getSession: vi.fn().mockResolvedValue({
      ok: true as const,
      value: { userId: 'user-authenticated', role },
    }),
  }
}

function authPortWithNoSession() {
  return {
    getSession: vi.fn().mockResolvedValue({ ok: true as const, value: null }),
  }
}

describe('changeUserRoleAction — non-admin session guard (M-1)', () => {
  beforeEach(() => {
    resolveMock.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns Forbidden when authenticated session has role "member"', async () => {
    const authPort = authPortWithRole('member')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await changeUserRoleAction('target-user', 'admin')

    // A member must NOT be allowed to change roles — must be Forbidden/Unauthorized.
    expect(result).toMatchObject({ error: expect.any(String) })
    // Must not have executed any UseCase or revalidated paths.
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Forbidden when authenticated session has role "viewer"', async () => {
    const authPort = authPortWithRole('viewer')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await changeUserRoleAction('target-user', 'member')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Unauthorized when session is null (existing baseline preserved)', async () => {
    const authPort = authPortWithNoSession()
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await changeUserRoleAction('target-user', 'admin')

    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('approveUserAction — non-admin session guard (M-1)', () => {
  beforeEach(() => {
    resolveMock.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns Forbidden when authenticated session has role "member"', async () => {
    const authPort = authPortWithRole('member')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await approveUserAction('pending-user-id')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Forbidden when authenticated session has role "viewer"', async () => {
    const authPort = authPortWithRole('viewer')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await approveUserAction('pending-user-id')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Unauthorized when session is null (existing baseline preserved)', async () => {
    const authPort = authPortWithNoSession()
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await approveUserAction('pending-user-id')

    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('rejectUserAction — non-admin session guard (SEC-2)', () => {
  beforeEach(() => {
    resolveMock.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns Forbidden when authenticated session has role "member"', async () => {
    const authPort = authPortWithRole('member')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await rejectUserAction('pending-user-id', 'spam')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Forbidden when authenticated session has role "viewer"', async () => {
    const authPort = authPortWithRole('viewer')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await rejectUserAction('pending-user-id', 'spam')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Unauthorized when session is null (existing baseline preserved)', async () => {
    const authPort = authPortWithNoSession()
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await rejectUserAction('pending-user-id', 'spam')

    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})

describe('addAllowedUserAction — non-admin session guard (SEC-2)', () => {
  beforeEach(() => {
    resolveMock.mockReset()
    vi.mocked(revalidatePath).mockClear()
  })

  it('returns Forbidden when authenticated session has role "member"', async () => {
    const authPort = authPortWithRole('member')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await addAllowedUserAction('new@example.com')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Forbidden when authenticated session has role "viewer"', async () => {
    const authPort = authPortWithRole('viewer')
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await addAllowedUserAction('new@example.com')

    expect(result).toMatchObject({ error: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it('returns Unauthorized when session is null (existing baseline preserved)', async () => {
    const authPort = authPortWithNoSession()
    resolveMock.mockImplementation((token: unknown) => {
      if (token === 'AuthPort') return authPort
      throw new Error(`unexpected token: ${String(token)}`)
    })

    const result = await addAllowedUserAction('new@example.com')

    expect(result).toEqual({ error: 'Unauthorized' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
