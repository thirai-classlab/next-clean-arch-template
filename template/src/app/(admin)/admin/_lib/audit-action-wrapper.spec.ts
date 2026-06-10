// src/app/(admin)/admin/_lib/audit-action-wrapper.spec.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the container + logger so the recorder path is observable without DI/pino.
const saveMock = vi.fn()
const resolveMock = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  container: { resolve: (token: unknown) => resolveMock(token) },
  ensureContainer: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/infrastructure/logger', () => ({
  logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  shouldAudit,
  buildAuditEntry,
  recordAuditEvent,
  withAudit,
  type ActionResult,
  type AuditDescriptor,
} from './audit-action-wrapper'

const descriptor: AuditDescriptor = {
  action: 'user.role_change',
  targetType: 'user',
  targetId: 'user-1',
  metadata: { newRole: 'admin' },
}

describe('shouldAudit', () => {
  it('audits only successful mutations', () => {
    expect(shouldAudit({ success: true })).toBe(true)
    expect(shouldAudit({ error: 'nope' } as ActionResult)).toBe(false)
  })
})

describe('buildAuditEntry', () => {
  it('builds an AuditLog from descriptor + actor', () => {
    const now = new Date('2026-05-27T00:00:00.000Z')
    const entry = buildAuditEntry('admin-9', descriptor, now)
    expect(entry).toMatchObject({
      actorId: 'admin-9',
      action: 'user.role_change',
      targetType: 'user',
      targetId: 'user-1',
      metadata: { newRole: 'admin' },
      createdAt: now,
    })
    expect(entry.id).toContain('audit_')
  })

  it('defaults metadata to {} when omitted', () => {
    const entry = buildAuditEntry('a', {
      action: 'x',
      targetType: 't',
      targetId: null,
    })
    expect(entry.metadata).toEqual({})
  })
})

describe('recordAuditEvent', () => {
  beforeEach(() => {
    saveMock.mockReset()
    resolveMock.mockReset()
  })

  it('resolves AuditLogRepository and saves the entry', async () => {
    saveMock.mockResolvedValue({ ok: true, value: {} })
    resolveMock.mockReturnValue({ save: saveMock })

    await recordAuditEvent('admin-1', descriptor)

    expect(resolveMock).toHaveBeenCalledWith('AuditLogRepository')
    expect(saveMock).toHaveBeenCalledTimes(1)
    const saved = saveMock.mock.calls[0][0]
    expect(saved).toMatchObject({ actorId: 'admin-1', action: 'user.role_change' })
  })

  it('swallows resolve failure (env-deferred, non-fatal)', async () => {
    resolveMock.mockImplementation(() => {
      throw new Error('token not registered')
    })
    // Must not throw.
    await expect(recordAuditEvent('admin-1', descriptor)).resolves.toBeUndefined()
  })

  it('swallows a failed repo.save Result without throwing', async () => {
    saveMock.mockResolvedValue({ ok: false, error: { message: 'db down' } })
    resolveMock.mockReturnValue({ save: saveMock })
    await expect(recordAuditEvent('admin-1', descriptor)).resolves.toBeUndefined()
  })
})

describe('withAudit', () => {
  beforeEach(() => {
    saveMock.mockReset()
    resolveMock.mockReset()
    saveMock.mockResolvedValue({ ok: true, value: {} })
    resolveMock.mockReturnValue({ save: saveMock })
  })

  it('records an audit entry on success', async () => {
    const action = vi.fn().mockResolvedValue({ success: true } as ActionResult)
    const wrapped = withAudit(
      action,
      (args) => ({ action: 'allow_list.add', targetType: 'allowed_user', targetId: null, metadata: { email: args[0] } }),
      async () => 'admin-7',
    )

    const result = await wrapped('a@b.com')

    expect(result).toEqual({ success: true })
    expect(action).toHaveBeenCalledWith('a@b.com')
    expect(saveMock).toHaveBeenCalledTimes(1)
    expect(saveMock.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-7',
      action: 'allow_list.add',
      metadata: { email: 'a@b.com' },
    })
  })

  it('does NOT record an audit entry on failure', async () => {
    const action = vi.fn().mockResolvedValue({ error: 'boom' } as ActionResult)
    const wrapped = withAudit(
      action,
      () => descriptor,
      async () => 'admin-7',
    )

    const result = await wrapped()

    expect(result).toEqual({ error: 'boom' })
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('skips audit (but preserves success) when actor unresolved', async () => {
    const action = vi.fn().mockResolvedValue({ success: true } as ActionResult)
    const wrapped = withAudit(
      action,
      () => descriptor,
      async () => null,
    )

    const result = await wrapped()

    expect(result).toEqual({ success: true })
    expect(saveMock).not.toHaveBeenCalled()
  })
})
