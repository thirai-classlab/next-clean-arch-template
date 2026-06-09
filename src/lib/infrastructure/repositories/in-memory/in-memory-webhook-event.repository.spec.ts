// in-memory-webhook-event.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryWebhookEventRepository } from './in-memory-webhook-event.repository'
import type { WebhookEvent } from '@/lib/domain/entities'
import { ConflictError, NotFoundError } from '@/lib/domain/errors'

function build(over: Partial<WebhookEvent> = {}): WebhookEvent {
  return {
    id: 'wh-1',
    eventType: 'bot.status_change',
    payload: { status: 'ready' },
    processedAt: null,
    idempotencyKey: 'k-1',
    ...over,
  }
}

describe('InMemoryWebhookEventRepository', () => {
  let repo: InMemoryWebhookEventRepository
  beforeEach(() => {
    repo = new InMemoryWebhookEventRepository()
  })

  it('findByIdempotencyKey returns NotFoundError when unknown', async () => {
    const r = await repo.findByIdempotencyKey('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('save then findByIdempotencyKey returns the event', async () => {
    await repo.save(build())
    const r = await repo.findByIdempotencyKey('k-1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.id).toBe('wh-1')
  })

  it('save returns ConflictError for a different id with the same idempotencyKey', async () => {
    await repo.save(build({ id: 'wh-1', idempotencyKey: 'dup' }))
    const r = await repo.save(build({ id: 'wh-2', idempotencyKey: 'dup' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(ConflictError)
  })

  it('save with same id upserts (no ConflictError)', async () => {
    await repo.save(build({ payload: { status: 'ready' } }))
    const r = await repo.save(build({ payload: { status: 'in_call_recording' } }))
    expect(r.ok).toBe(true)
  })

  it('markProcessed sets processedAt and is idempotent on date update', async () => {
    await repo.save(build({ processedAt: null }))
    const r = await repo.markProcessed('wh-1')
    expect(r.ok).toBe(true)
    const got = await repo.findByIdempotencyKey('k-1')
    if (got.ok) expect(got.value.processedAt).toBeInstanceOf(Date)
  })

  it('markProcessed returns NotFoundError for unknown id', async () => {
    const r = await repo.markProcessed('nope')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })
})
