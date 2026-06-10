// globalThis-store-sharing.spec.ts — task-35 Step 2d
//
// Verifies that the three process-global repositories (AllowedUser, User, AuditLog)
// share state across multiple instances created in the same process — the
// scenario that arises in Next.js 14 App Router where Server Actions and Server
// Components import the same module but end up with different tsyringe Singleton
// containers.
//
// Each test:
//   1. Resets the global store (clean slate)
//   2. Writes via instance A (simulates Server Action context)
//   3. Reads via instance B (simulates Server Component context)
//   4. Asserts that B sees what A wrote

import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAllowedUserRepository } from './in-memory-allowed-user.repository'
import { InMemoryUserRepository } from './in-memory-user.repository'
import { InMemoryAuditLogRepository } from './in-memory-audit-log.repository'
import { createEmail } from '@/lib/domain/value-objects/email'
import type { AllowedUser, User, AuditLog } from '@/lib/domain/entities'

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeEmail(raw: string) {
  const r = createEmail(raw)
  if (!r.ok) throw new Error(`invalid fixture email: ${raw}`)
  return r.value
}

const NOW = new Date('2026-05-30T00:00:00Z')

function allowedUserFixture(over: Partial<AllowedUser> = {}): AllowedUser {
  return {
    id: 'au-1',
    email: makeEmail('invite@example.com'),
    addedBy: 'admin-id',
    addedAt: NOW,
    ...over,
  }
}

function userFixture(over: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: makeEmail('user@example.com'),
    role: 'member',
    status: 'pending',
    createdAt: NOW,
    updatedAt: NOW,
    ...over,
  }
}

function auditLogFixture(over: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    actorId: 'admin-id',
    action: 'allow_list.add',
    targetType: 'allowed_user',
    targetId: null,
    metadata: { email: 'invite@example.com' },
    createdAt: NOW,
    ...over,
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('globalThis-backed store sharing across instances (task-35 Step 2d)', () => {
  beforeEach(() => {
    // Clean slate for each test to prevent order-dependence.
    InMemoryAllowedUserRepository.resetStore()
    InMemoryUserRepository.resetStore()
    InMemoryAuditLogRepository.resetStore()
  })

  it('AllowedUser: write via instanceA is visible to instanceB', async () => {
    const instanceA = new InMemoryAllowedUserRepository() // simulates Server Action
    const instanceB = new InMemoryAllowedUserRepository() // simulates Server Component

    // Write via A
    await instanceA.save(allowedUserFixture())

    // Read via B — must see the entry written by A
    const all = await instanceB.findAll()
    expect(all).toHaveLength(1)
    expect(all[0].id).toBe('au-1')
  })

  it('AllowedUser: resetStore clears both instances', async () => {
    const instanceA = new InMemoryAllowedUserRepository()
    await instanceA.save(allowedUserFixture())

    InMemoryAllowedUserRepository.resetStore()

    const instanceB = new InMemoryAllowedUserRepository()
    const all = await instanceB.findAll()
    expect(all).toHaveLength(0)
  })

  it('User: write via instanceA is visible to instanceB', async () => {
    const instanceA = new InMemoryUserRepository()
    const instanceB = new InMemoryUserRepository()

    await instanceA.save(userFixture())

    const found = await instanceB.findById('user-1')
    expect(found.ok).toBe(true)
    if (found.ok) expect(found.value.email.value).toBe('user@example.com')
  })

  it('User: resetStore clears state', async () => {
    const instanceA = new InMemoryUserRepository()
    await instanceA.save(userFixture())
    InMemoryUserRepository.resetStore()
    const instanceB = new InMemoryUserRepository()
    const found = await instanceB.findById('user-1')
    expect(found.ok).toBe(false)
  })

  it('AuditLog: write via instanceA is visible to instanceB (core cross-context scenario)', async () => {
    const instanceA = new InMemoryAuditLogRepository() // Server Action writes here
    const instanceB = new InMemoryAuditLogRepository() // Server Component reads here

    // Simulate allow_list.add audit entry written by Server Action
    await instanceA.save(auditLogFixture())

    // Server Component reads last 30 days
    const since = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000)
    const logs = await instanceB.findSince(since)
    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe('allow_list.add')
  })

  it('AuditLog: multiple entries from A are all visible to B', async () => {
    const instanceA = new InMemoryAuditLogRepository()
    const instanceB = new InMemoryAuditLogRepository()

    await instanceA.save(auditLogFixture({ id: 'l1', action: 'allow_list.add' }))
    await instanceA.save(auditLogFixture({ id: 'l2', action: 'user.role_change' }))

    const since = new Date(0)
    const logs = await instanceB.findSince(since)
    expect(logs).toHaveLength(2)
    const actions = logs.map((l) => l.action).sort()
    expect(actions).toEqual(['allow_list.add', 'user.role_change'])
  })

  it('AuditLog: resetStore clears state', async () => {
    const instanceA = new InMemoryAuditLogRepository()
    await instanceA.save(auditLogFixture())
    InMemoryAuditLogRepository.resetStore()
    const instanceB = new InMemoryAuditLogRepository()
    const logs = await instanceB.findSince(new Date(0))
    expect(logs).toHaveLength(0)
  })
})
