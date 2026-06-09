import { describe, it, expect } from 'vitest'
import { GetTranscriptsUseCase } from './get-transcripts.use-case'
import type { TranscriptRepository } from '../repositories/transcript.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('GetTranscriptsUseCase (signature)', () => {
  const transcriptRepo = {} as TranscriptRepository

  it('is constructible with TranscriptRepository', () => {
    const uc = new GetTranscriptsUseCase(transcriptRepo)
    expect(uc).toBeInstanceOf(GetTranscriptsUseCase)
  })

  it('exposes execute()', () => {
    const uc = new GetTranscriptsUseCase(transcriptRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new GetTranscriptsUseCase(transcriptRepo)
    const r = await uc.execute({ botId: 'b1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
