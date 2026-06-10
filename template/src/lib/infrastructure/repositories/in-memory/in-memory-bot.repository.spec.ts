// in-memory-bot.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryBotRepository } from './in-memory-bot.repository'
import type { Bot } from '@/lib/domain/entities'
import { NotFoundError } from '@/lib/domain/errors'

function build(over: Partial<Bot> = {}): Bot {
  const now = new Date('2026-05-26T00:00:00Z')
  return {
    id: 'bot-1',
    meetingUrl: 'https://zoom.us/j/123',
    platform: 'zoom',
    status: 'ready',
    region: 'us-east-1',
    createdAt: now,
    statusUpdatedAt: now,
    ...over,
  }
}

describe('InMemoryBotRepository', () => {
  let repo: InMemoryBotRepository
  beforeEach(() => {
    repo = new InMemoryBotRepository()
  })

  it('findById returns NotFoundError when missing', async () => {
    const r = await repo.findById('nope')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('save and findById round-trips a bot', async () => {
    await repo.save(build())
    const r = await repo.findById('bot-1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.platform).toBe('zoom')
  })

  it('save with the same id updates the status', async () => {
    await repo.save(build({ status: 'ready' }))
    await repo.save(build({ status: 'in_call_recording' }))
    const r = await repo.findById('bot-1')
    if (r.ok) expect(r.value.status).toBe('in_call_recording')
  })

  it('findByStatus only returns bots in the requested status', async () => {
    await repo.save(build({ id: 'b1', status: 'ready' }))
    await repo.save(build({ id: 'b2', status: 'in_call_recording' }))
    await repo.save(build({ id: 'b3', status: 'in_call_recording' }))
    const recording = await repo.findByStatus('in_call_recording')
    expect(recording).toHaveLength(2)
  })

  it('delete removes and second delete is NotFoundError', async () => {
    await repo.save(build())
    expect((await repo.delete('bot-1')).ok).toBe(true)
    expect((await repo.delete('bot-1')).ok).toBe(false)
  })
})
