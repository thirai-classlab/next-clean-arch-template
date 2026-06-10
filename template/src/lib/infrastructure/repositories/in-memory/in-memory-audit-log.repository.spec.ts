// in-memory-audit-log.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAuditLogRepository } from './in-memory-audit-log.repository'
import type { AuditLog } from '@/lib/domain/entities'

function build(over: Partial<AuditLog> = {}): AuditLog {
  return {
    id: 'log-1',
    actorId: 'actor-1',
    action: 'user.approved',
    targetId: 'user-99',
    targetType: 'User',
    metadata: { ip: '127.0.0.1' },
    createdAt: new Date('2026-05-26T00:00:00Z'),
    ...over,
  }
}

describe('InMemoryAuditLogRepository', () => {
  let repo: InMemoryAuditLogRepository
  beforeEach(() => {
    // Reset the process-global store so tests start with an empty state.
    // Required because InMemoryAuditLogRepository uses a globalThis-backed
    // Map to survive Next.js App Router module isolation (task-35 Step 2d).
    InMemoryAuditLogRepository.resetStore()
    repo = new InMemoryAuditLogRepository()
  })

  it('findByActorId returns [] on empty store', async () => {
    const r = await repo.findByActorId('actor-1', new Date(0))
    expect(r).toEqual([])
  })

  it('save then findByActorId returns the log', async () => {
    await repo.save(build())
    const r = await repo.findByActorId('actor-1', new Date('2026-05-01T00:00:00Z'))
    expect(r).toHaveLength(1)
  })

  it('findByActorId filters by actorId AND sinceDate', async () => {
    await repo.save(build({ id: 'l1', actorId: 'a', createdAt: new Date('2026-05-01T00:00:00Z') }))
    await repo.save(build({ id: 'l2', actorId: 'a', createdAt: new Date('2026-05-26T00:00:00Z') }))
    await repo.save(build({ id: 'l3', actorId: 'b', createdAt: new Date('2026-05-26T00:00:00Z') }))
    const got = await repo.findByActorId('a', new Date('2026-05-20T00:00:00Z'))
    expect(got).toHaveLength(1)
    expect(got[0].id).toBe('l2')
  })

  it('save returns ok with the persisted entity', async () => {
    const r = await repo.save(build())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.action).toBe('user.approved')
  })

  it('deleteOlderThan prunes entries with createdAt < date and returns the count', async () => {
    await repo.save(build({ id: 'l1', createdAt: new Date('2026-01-01T00:00:00Z') }))
    await repo.save(build({ id: 'l2', createdAt: new Date('2026-02-01T00:00:00Z') }))
    await repo.save(build({ id: 'l3', createdAt: new Date('2026-06-01T00:00:00Z') }))
    const r = await repo.deleteOlderThan(new Date('2026-03-01T00:00:00Z'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value).toBe(2)
    const remaining = await repo.findByActorId('actor-1', new Date(0))
    expect(remaining).toHaveLength(1)
    expect(remaining[0].id).toBe('l3')
  })

  it('deleteOlderThan returns 0 when nothing matches', async () => {
    await repo.save(build({ createdAt: new Date('2026-06-01T00:00:00Z') }))
    const r = await repo.deleteOlderThan(new Date('2026-01-01T00:00:00Z'))
    if (r.ok) expect(r.value).toBe(0)
  })

  it('findSince returns all logs with createdAt >= sinceDate', async () => {
    await repo.save(build({ id: 'l1', actorId: 'a', createdAt: new Date('2026-04-01T00:00:00Z') }))
    await repo.save(build({ id: 'l2', actorId: 'b', createdAt: new Date('2026-05-26T00:00:00Z') }))
    await repo.save(build({ id: 'l3', actorId: 'c', createdAt: new Date('2026-06-01T00:00:00Z') }))
    const got = await repo.findSince(new Date('2026-05-01T00:00:00Z'))
    expect(got).toHaveLength(2)
    const ids = got.map((l) => l.id).sort()
    expect(ids).toEqual(['l2', 'l3'])
  })

  it('findSince returns [] when no entries match', async () => {
    await repo.save(build({ createdAt: new Date('2026-01-01T00:00:00Z') }))
    const got = await repo.findSince(new Date('2026-06-01T00:00:00Z'))
    expect(got).toHaveLength(0)
  })
})
