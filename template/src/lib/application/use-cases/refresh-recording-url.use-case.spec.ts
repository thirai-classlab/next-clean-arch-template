import { describe, it, expect } from 'vitest'
import { RefreshRecordingUrlUseCase } from './refresh-recording-url.use-case'
import type { RecordingRepository } from '../repositories/recording.repository'
import type { StoragePort } from '../ports/storage.port'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('RefreshRecordingUrlUseCase (signature)', () => {
  const recordingRepo = {} as RecordingRepository
  const storagePort = {} as StoragePort

  it('is constructible with RecordingRepository + StoragePort', () => {
    const uc = new RefreshRecordingUrlUseCase(recordingRepo, storagePort)
    expect(uc).toBeInstanceOf(RefreshRecordingUrlUseCase)
  })

  it('exposes execute()', () => {
    const uc = new RefreshRecordingUrlUseCase(recordingRepo, storagePort)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new RefreshRecordingUrlUseCase(recordingRepo, storagePort)
    const r = await uc.execute({ recordingId: 'r1' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
