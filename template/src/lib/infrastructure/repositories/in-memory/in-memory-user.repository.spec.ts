// in-memory-user.repository.spec.ts — behavior tests for InMemoryUserRepository.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryUserRepository } from './in-memory-user.repository'
import { createEmail, type Email } from '@/lib/domain/value-objects/email'
import type { User } from '@/lib/domain/entities'
import { ConflictError, NotFoundError } from '@/lib/domain/errors'

function email(raw: string): Email {
  const r = createEmail(raw)
  if (!r.ok) throw new Error(`bad fixture email: ${raw}`)
  return r.value
}

function buildUser(over: Partial<User> = {}): User {
  const now = new Date('2026-05-26T00:00:00Z')
  return {
    id: 'user-1',
    email: email('user1@example.com'),
    role: 'member',
    status: 'pending',
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

describe('InMemoryUserRepository', () => {
  let repo: InMemoryUserRepository

  beforeEach(() => {
    // Reset the process-global store so tests start with an empty state.
    // Required because InMemoryUserRepository uses a globalThis-backed
    // Map to survive Next.js App Router module isolation (task-35 Step 2d).
    InMemoryUserRepository.resetStore()
    repo = new InMemoryUserRepository()
  })

  it('findById returns NotFoundError when nothing has been saved', async () => {
    const r = await repo.findById('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('save then findById returns the same entity', async () => {
    const u = buildUser()
    const saved = await repo.save(u)
    expect(saved.ok).toBe(true)
    const found = await repo.findById('user-1')
    expect(found.ok).toBe(true)
    if (found.ok) expect(found.value.email.value).toBe('user1@example.com')
  })

  it('findByEmail locates the user by Email VO', async () => {
    await repo.save(buildUser())
    const r = await repo.findByEmail(email('USER1@example.com'))
    expect(r.ok).toBe(true)
  })

  it('findByEmail returns NotFoundError for unknown email', async () => {
    const r = await repo.findByEmail(email('nobody@example.com'))
    expect(r.ok).toBe(false)
  })

  it('findPending returns only users with status=pending', async () => {
    await repo.save(buildUser({ id: 'u1', email: email('a@x.com'), status: 'pending' }))
    await repo.save(buildUser({ id: 'u2', email: email('b@x.com'), status: 'approved' }))
    const pending = await repo.findPending()
    expect(pending).toHaveLength(1)
    expect(pending[0].id).toBe('u1')
  })

  it('save with same id is an upsert (no ConflictError)', async () => {
    await repo.save(buildUser({ status: 'pending' }))
    const updated = await repo.save(buildUser({ status: 'approved' }))
    expect(updated.ok).toBe(true)
    const found = await repo.findById('user-1')
    if (found.ok) expect(found.value.status).toBe('approved')
  })

  it('save returns ConflictError when a different id reuses the email', async () => {
    await repo.save(buildUser({ id: 'u1', email: email('dup@x.com') }))
    const r = await repo.save(buildUser({ id: 'u2', email: email('dup@x.com') }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ConflictError)
  })

  it('delete removes the user and is idempotent on the second call', async () => {
    await repo.save(buildUser())
    const first = await repo.delete('user-1')
    expect(first.ok).toBe(true)
    const second = await repo.delete('user-1')
    expect(second.ok).toBe(false)
    if (!second.ok) expect(second.error).toBeInstanceOf(NotFoundError)
  })

  it('findAll returns all saved users', async () => {
    await repo.save(buildUser({ id: 'u1', email: email('a@x.com') }))
    await repo.save(buildUser({ id: 'u2', email: email('b@x.com') }))
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
    const ids = all.map((u) => u.id).sort()
    expect(ids).toEqual(['u1', 'u2'])
  })

  it('findAll returns [] on empty store', async () => {
    const all = await repo.findAll()
    expect(all).toHaveLength(0)
  })
})
