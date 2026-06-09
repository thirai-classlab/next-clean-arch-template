import { describe, it, expect } from 'vitest'
import { GetRecordingsUseCase } from './get-recordings.use-case'
import type { RecordingRepository } from '../repositories/recording.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('GetRecordingsUseCase (signature)', () => {
  const recordingRepo = {} as RecordingRepository

  it('is constructible with RecordingRepository', () => {
    const uc = new GetRecordingsUseCase(recordingRepo)
    expect(uc).toBeInstanceOf(GetRecordingsUseCase)
  })

  it('exposes execute()', () => {
    const uc = new GetRecordingsUseCase(recordingRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new GetRecordingsUseCase(recordingRepo)
    const r = await uc.execute({ botId: 'b1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
