// src/app/(admin)/admin/_lib/audit-action-wrapper-throw.spec.ts
//
// task-5 Step 8 — withAudit throw-propagation test (tdd-guide H-3).
//
// The existing audit-action-wrapper.spec.ts covers the case where the wrapped
// action returns `{ error: string }`. This file covers the case where the
// wrapped action THROWS an exception: withAudit must re-throw without writing
// a spurious audit row.
//
// If `withAudit` swallows the exception and returns silently, mutations that
// throw would be incorrectly treated as "succeeded", potentially emitting a
// false audit entry or hiding the error from the caller.

import { describe, it, expect, vi, beforeEach } from 'vitest'

const saveMock = vi.fn()
const resolveMock = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  container: { resolve: (token: unknown) => resolveMock(token) },
  ensureContainer: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/infrastructure/logger', () => ({
  logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import { withAudit, type ActionResult, type AuditDescriptor } from './audit-action-wrapper'

const descriptor: AuditDescriptor = {
  action: 'user.role_change',
  targetType: 'user',
  targetId: 'user-1',
}

describe('withAudit — throw propagation (tdd-guide H-3)', () => {
  beforeEach(() => {
    saveMock.mockReset()
    resolveMock.mockReset()
    // Wire up the repository in case the wrapper incorrectly tries to audit.
    saveMock.mockResolvedValue({ ok: true, value: {} })
    resolveMock.mockReturnValue({ save: saveMock })
  })

  it('re-throws when the wrapped action throws a plain Error', async () => {
    const boom = new Error('database connection lost')
    const action = vi.fn().mockRejectedValue(boom)
    const describeAudit = vi.fn().mockReturnValue(descriptor)
    const resolveActor = vi.fn().mockResolvedValue('admin-1')

    const wrapped = withAudit(action as (...args: readonly unknown[]) => Promise<ActionResult>, describeAudit, resolveActor)

    await expect(wrapped()).rejects.toThrow('database connection lost')
  })

  it('does NOT write an audit entry when the wrapped action throws', async () => {
    const action = vi.fn().mockRejectedValue(new Error('use case exploded'))
    const describeAudit = vi.fn().mockReturnValue(descriptor)
    const resolveActor = vi.fn().mockResolvedValue('admin-1')

    const wrapped = withAudit(action as (...args: readonly unknown[]) => Promise<ActionResult>, describeAudit, resolveActor)

    // Swallow the re-thrown error to continue asserting.
    await wrapped().catch(() => undefined)

    // The audit save must NOT have been called — no spurious audit row.
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('does NOT invoke the descriptor builder when the wrapped action throws', async () => {
    const action = vi.fn().mockRejectedValue(new Error('unexpected'))
    const describeAudit = vi.fn().mockReturnValue(descriptor)
    const resolveActor = vi.fn().mockResolvedValue('admin-1')

    const wrapped = withAudit(action as (...args: readonly unknown[]) => Promise<ActionResult>, describeAudit, resolveActor)

    await wrapped().catch(() => undefined)

    // The descriptor builder should not be called because we never reach the
    // "action succeeded" branch.
    expect(describeAudit).not.toHaveBeenCalled()
  })

  it('re-throws when the wrapped action throws a non-Error value (string)', async () => {
    // Some code throws strings or other non-Error values.
    const action = vi.fn().mockRejectedValue('hard-coded string rejection')

    const wrapped = withAudit(action as (...args: readonly unknown[]) => Promise<ActionResult>, () => descriptor, async () => 'admin-1')

    await expect(wrapped()).rejects.toBe('hard-coded string rejection')
    expect(saveMock).not.toHaveBeenCalled()
  })
})
