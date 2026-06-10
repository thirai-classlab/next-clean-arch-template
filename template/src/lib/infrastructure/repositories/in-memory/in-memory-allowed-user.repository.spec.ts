// in-memory-allowed-user.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryAllowedUserRepository } from './in-memory-allowed-user.repository'
import { createEmail, type Email } from '@/lib/domain/value-objects/email'
import type { AllowedUser } from '@/lib/domain/entities'
import { ConflictError, NotFoundError } from '@/lib/domain/errors'

function email(raw: string): Email {
  const r = createEmail(raw)
  if (!r.ok) throw new Error('bad fixture')
  return r.value
}

function build(over: Partial<AllowedUser> = {}): AllowedUser {
  return {
    id: 'allow-1',
    email: email('allow1@example.com'),
    addedBy: 'admin-1',
    addedAt: new Date('2026-05-26T00:00:00Z'),
    ...over,
  }
}

describe('InMemoryAllowedUserRepository', () => {
  let repo: InMemoryAllowedUserRepository
  beforeEach(() => {
    // Reset the process-global store so tests start with an empty state.
    // Required because InMemoryAllowedUserRepository uses a globalThis-backed
    // Map to survive Next.js App Router module isolation (task-35 Step 2d).
    InMemoryAllowedUserRepository.resetStore()
    repo = new InMemoryAllowedUserRepository()
  })

  it('findByEmail returns NotFoundError on empty store', async () => {
    const r = await repo.findByEmail(email('x@y.com'))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('save then findByEmail returns the saved entry', async () => {
    await repo.save(build())
    const r = await repo.findByEmail(email('ALLOW1@example.com'))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.id).toBe('allow-1')
  })

  it('findAll lists every saved entry', async () => {
    await repo.save(build({ id: 'a1', email: email('a@x.com') }))
    await repo.save(build({ id: 'a2', email: email('b@x.com') }))
    const all = await repo.findAll()
    expect(all).toHaveLength(2)
  })

  it('save with same id upserts (no ConflictError)', async () => {
    await repo.save(build({ addedBy: 'admin-1' }))
    const second = await repo.save(build({ addedBy: 'admin-2' }))
    expect(second.ok).toBe(true)
    const got = await repo.findByEmail(email('allow1@example.com'))
    if (got.ok) expect(got.value.addedBy).toBe('admin-2')
  })

  it('save returns ConflictError when a different id reuses the email', async () => {
    await repo.save(build({ id: 'a1', email: email('dup@x.com') }))
    const r = await repo.save(build({ id: 'a2', email: email('dup@x.com') }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ConflictError)
  })

  it('delete removes the entry; second delete is NotFoundError', async () => {
    await repo.save(build())
    expect((await repo.delete('allow-1')).ok).toBe(true)
    const again = await repo.delete('allow-1')
    expect(again.ok).toBe(false)
  })
})
