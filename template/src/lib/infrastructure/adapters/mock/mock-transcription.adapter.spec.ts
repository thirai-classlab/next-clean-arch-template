// src/lib/infrastructure/adapters/mock/mock-transcription.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockTranscriptionAdapter } from './mock-transcription.adapter'
import { NotFoundError } from '../../../domain/errors'

describe('MockTranscriptionAdapter', () => {
  let adapter: MockTranscriptionAdapter

  beforeEach(() => {
    adapter = new MockTranscriptionAdapter()
  })

  it('requestTranscription returns a jobId and seeds transcripts', async () => {
    const r = await adapter.requestTranscription('bot-1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.value.jobId).toBeTruthy()
  })

  it('getTranscript returns transcripts after request', async () => {
    await adapter.requestTranscription('bot-1')
    const r = await adapter.getTranscript('bot-1')
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.length).toBeGreaterThan(0)
      expect(r.value[0]?.botId).toBe('bot-1')
    }
  })

  it('getTranscript returns NotFoundError when no transcription requested', async () => {
    const r = await adapter.getTranscript('unknown')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })
})
