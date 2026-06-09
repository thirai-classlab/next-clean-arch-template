// in-memory-transcript.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryTranscriptRepository } from './in-memory-transcript.repository'
import type { Transcript } from '@/lib/domain/entities'

function build(over: Partial<Transcript> = {}): Transcript {
  return {
    id: 't-1',
    botId: 'bot-1',
    speakerId: 'spk-1',
    words: [{ word: 'hello', startMs: 0, endMs: 500 }],
    confidence: 0.93,
    createdAt: new Date('2026-05-26T00:00:00Z'),
    ...over,
  }
}

describe('InMemoryTranscriptRepository', () => {
  let repo: InMemoryTranscriptRepository
  beforeEach(() => {
    repo = new InMemoryTranscriptRepository()
  })

  it('findByBotId returns [] on empty store', async () => {
    const r = await repo.findByBotId('bot-x')
    expect(r).toEqual([])
  })

  it('save then findByBotId returns the transcript', async () => {
    await repo.save(build())
    const r = await repo.findByBotId('bot-1')
    expect(r).toHaveLength(1)
    expect(r[0].confidence).toBeCloseTo(0.93)
  })

  it('findByBotId filters by botId', async () => {
    await repo.save(build({ id: 't1', botId: 'bot-a' }))
    await repo.save(build({ id: 't2', botId: 'bot-b' }))
    expect(await repo.findByBotId('bot-a')).toHaveLength(1)
    expect(await repo.findByBotId('bot-b')).toHaveLength(1)
  })

  it('save with same id replaces the words array', async () => {
    await repo.save(build({ words: [{ word: 'hi', startMs: 0, endMs: 100 }] }))
    await repo.save(
      build({ words: [{ word: 'updated', startMs: 0, endMs: 200 }] }),
    )
    const r = await repo.findByBotId('bot-1')
    expect(r[0].words[0].word).toBe('updated')
  })

  it('save returns ok with the persisted entity', async () => {
    const r = await repo.save(build())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.id).toBe('t-1')
  })
})
