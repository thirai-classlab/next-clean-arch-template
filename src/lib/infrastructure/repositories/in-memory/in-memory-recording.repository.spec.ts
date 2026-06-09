// in-memory-recording.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryRecordingRepository } from './in-memory-recording.repository'
import type { Recording } from '@/lib/domain/entities'
import { NotFoundError } from '@/lib/domain/errors'

function build(over: Partial<Recording> = {}): Recording {
  return {
    id: 'rec-1',
    botId: 'bot-1',
    durationSecs: 3600,
    signedUrl: null,
    signedUrlExpiresAt: null,
    createdAt: new Date('2026-05-26T00:00:00Z'),
    ...over,
  }
}

describe('InMemoryRecordingRepository', () => {
  let repo: InMemoryRecordingRepository
  beforeEach(() => {
    repo = new InMemoryRecordingRepository()
  })

  it('findById returns NotFoundError on empty store', async () => {
    const r = await repo.findById('rec-x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('save then findById returns the recording', async () => {
    await repo.save(build())
    const r = await repo.findById('rec-1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.durationSecs).toBe(3600)
  })

  it('findByBotId returns only recordings for the matching bot', async () => {
    await repo.save(build({ id: 'r1', botId: 'bot-a' }))
    await repo.save(build({ id: 'r2', botId: 'bot-b' }))
    await repo.save(build({ id: 'r3', botId: 'bot-a' }))
    const got = await repo.findByBotId('bot-a')
    expect(got).toHaveLength(2)
  })

  it('save with same id upserts the signed URL', async () => {
    await repo.save(build())
    await repo.save(
      build({
        signedUrl: 'https://cdn/.../rec-1',
        signedUrlExpiresAt: new Date('2026-06-01T00:00:00Z'),
      }),
    )
    const r = await repo.findById('rec-1')
    if (r.ok) expect(r.value.signedUrl).toMatch(/^https:\/\//)
  })
})
