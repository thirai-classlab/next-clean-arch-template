// src/app/(admin)/admin/_lib/admin-data.spec.ts
// Tests the env-deferred degradation: every loader returns a placeholder
// (empty list / zeroed metrics) when the underlying UseCase errors or throws.
// Also tests the globalThis store fallback for loadAuditLogs (task-35 read path).
import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('@/lib/infrastructure/container', () => ({
  // Repository tokens are NOT registered on this branch → resolve throws.
  container: {
    resolve: () => {
      throw new Error('token not registered')
    },
  },
  ensureContainer: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/infrastructure/logger', () => ({
  logger: { warn: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}))

import {
  __testing,
  loadUsers,
  loadPendingUsers,
  loadAllowList,
  loadAuditLogs,
  loadOrgSettings,
  loadDashboardMetrics,
} from './admin-data'
import { ok, err } from '@/lib/application/result'
import { ExternalServiceError } from '@/lib/domain/errors'
import type { AuditLog, AllowedUser } from '@/lib/domain/entities'

const AUDIT_LOG_GLOBAL_KEY = '__recall_poc_auditLogStore__' as const
const ALLOWED_USER_GLOBAL_KEY = '__recall_poc_allowedUserStore__' as const

describe('safeRun', () => {
  it('returns the value on ok Result', async () => {
    const value = await __testing.safeRun('t', async () => ok(42))
    expect(value).toBe(42)
  })

  it('returns null on err Result (env-deferred)', async () => {
    const value = await __testing.safeRun('t', async () =>
      err(new ExternalServiceError('not implemented: Step 3', null)),
    )
    expect(value).toBeNull()
  })

  it('returns null when the runner throws', async () => {
    const value = await __testing.safeRun('t', async () => {
      throw new Error('boom')
    })
    expect(value).toBeNull()
  })
})

describe('loaders degrade to placeholders when UseCases are unwired', () => {
  afterEach(() => {
    // Reset globalThis stores so they do not bleed into other tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[AUDIT_LOG_GLOBAL_KEY] = undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[ALLOWED_USER_GLOBAL_KEY] = undefined
  })

  it('loadUsers → MOCK_SEED_USERS + placeholder (MOCK_MODE=true)', async () => {
    // When MOCK_MODE=true (the vitest run env), loadUsers returns MOCK_SEED_USERS
    // (2 seed rows) with placeholder:true instead of an empty array.
    // This ensures E2E specs can find at least one user-row without a real DB.
    const result = await loadUsers()
    expect(result.placeholder).toBe(true)
    expect(result.data.length).toBeGreaterThanOrEqual(1)
    expect(result.data[0]).toMatchObject({ email: 'admin@example.com', role: 'admin' })
  })

  it('loadPendingUsers → empty + placeholder', async () => {
    expect(await loadPendingUsers()).toEqual({ data: [], placeholder: true })
  })

  it('loadAllowList → empty + placeholder', async () => {
    expect(await loadAllowList()).toEqual({ data: [], placeholder: true })
  })

  it('loadAuditLogs → empty + placeholder when globalThis store is empty', async () => {
    expect(await loadAuditLogs()).toEqual({ data: [], placeholder: true })
  })

  it('loadOrgSettings → default settings + placeholder', async () => {
    const result = await loadOrgSettings()
    expect(result.placeholder).toBe(true)
    expect(result.data.allowedDomains).toEqual(['classlab.co.jp'])
    expect(result.data.sessionTimeoutMinutes).toBe(60)
  })

  it('loadDashboardMetrics → placeholder with MOCK_SEED_USERS count (MOCK_MODE=true)', async () => {
    // When MOCK_MODE=true, loadUsers returns MOCK_SEED_USERS (2 rows, placeholder:true).
    // loadDashboardMetrics derives totalUsers from loadUsers.data, so totalUsers=2.
    // roleDistribution uses EMPTY_ROLE_DISTRIBUTION because users.placeholder=true.
    const result = await loadDashboardMetrics()
    expect(result.placeholder).toBe(true)
    expect(result.data.totalUsers).toBe(2)
    expect(result.data.pendingUsers).toBe(0)
    expect(result.data.recentAuditCount).toBe(0)
    expect(result.data.roleDistribution).toEqual({ admin: 0, member: 0, viewer: 0 })
  })
})

describe('loadAuditLogs — globalThis store fallback (task-35 read path)', () => {
  afterEach(() => {
    // Reset the process-global store after each test.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[AUDIT_LOG_GLOBAL_KEY] = undefined
  })

  it('returns rows from globalThis store when container path fails', async () => {
    // Seed the globalThis store (simulates a Server Action write in MOCK_MODE).
    const now = new Date()
    const entry: AuditLog = {
      id: 'audit-test-1',
      actorId: 'actor-1',
      action: 'allow_list.add',
      targetType: 'allowed_user',
      targetId: null,
      metadata: { email: 'test@example.com' },
      createdAt: now,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[AUDIT_LOG_GLOBAL_KEY] = new Map([[entry.id, entry]])

    const result = await loadAuditLogs()

    expect(result.placeholder).toBe(false)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toMatchObject({
      id: 'audit-test-1',
      actorId: 'actor-1',
      action: 'allow_list.add',
    })
  })

  it('returns placeholder when globalThis store has entries older than 30 days', async () => {
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000)
    const entry: AuditLog = {
      id: 'audit-old-1',
      actorId: 'actor-1',
      action: 'user.approve',
      targetType: 'user',
      targetId: 'user-1',
      metadata: {},
      createdAt: oldDate,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[AUDIT_LOG_GLOBAL_KEY] = new Map([[entry.id, entry]])

    const result = await loadAuditLogs()

    // sinceDate filter excludes entries older than 30 days; store has entries but
    // they are all filtered out, so readGlobalAuditLogs returns [] not null.
    // The implementation returns placeholder: true only when store is empty/null.
    // With a non-empty store but filtered-out entries, readGlobalAuditLogs returns [].
    // In that case globalLogs.length === 0 → falls through to placeholder.
    expect(result.data).toHaveLength(0)
    expect(result.placeholder).toBe(true)
  })
})

describe('loadAllowList — globalThis store fallback (task-35 read path)', () => {
  afterEach(() => {
    // Reset the process-global allowed-user store after each test.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[ALLOWED_USER_GLOBAL_KEY] = undefined
  })

  it('returns rows from globalThis store when container path fails', async () => {
    // Seed the globalThis store (simulates a Server Action write in MOCK_MODE).
    const addedAt = new Date('2024-03-01T12:00:00Z')
    const entry: AllowedUser = {
      id: 'allowed-test-1',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      email: { _brand: 'Email', value: 'new@example.com' } as any,
      addedBy: 'admin-1',
      addedAt,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[ALLOWED_USER_GLOBAL_KEY] = new Map([[entry.id, entry]])

    const result = await loadAllowList()

    expect(result.placeholder).toBe(false)
    expect(result.data).toHaveLength(1)
    expect(result.data[0]).toEqual({
      id: 'allowed-test-1',
      email: 'new@example.com',
      addedBy: 'admin-1',
      addedAt: addedAt.toISOString(),
    })
  })

  it('returns placeholder when globalThis store is empty', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(globalThis as any)[ALLOWED_USER_GLOBAL_KEY] = new Map()

    const result = await loadAllowList()

    expect(result.data).toHaveLength(0)
    expect(result.placeholder).toBe(true)
  })
})
