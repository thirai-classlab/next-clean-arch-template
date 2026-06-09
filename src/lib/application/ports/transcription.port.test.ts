import { describe, it, expectTypeOf } from 'vitest'
import type { TranscriptionPort } from './transcription.port'
import type { Result } from '../result'
import type { Transcript } from '../../domain/entities/transcript'
import type { ExternalServiceError, NotFoundError } from '../../domain/errors'

describe('TranscriptionPort (type-level)', () => {
  it('requestTranscription: (botId) => Promise<Result<{jobId}, ExternalServiceError>>', () => {
    expectTypeOf<TranscriptionPort['requestTranscription']>().toEqualTypeOf<
      (botId: string) => Promise<Result<{ jobId: string }, ExternalServiceError>>
    >()
  })

  it('getTranscript: (botId) => Promise<Result<ReadonlyArray<Transcript>, NotFoundError|ExternalServiceError>>', () => {
    expectTypeOf<TranscriptionPort['getTranscript']>().toEqualTypeOf<
      (
        botId: string,
      ) => Promise<
        Result<ReadonlyArray<Transcript>, NotFoundError | ExternalServiceError>
      >
    >()
  })
})
