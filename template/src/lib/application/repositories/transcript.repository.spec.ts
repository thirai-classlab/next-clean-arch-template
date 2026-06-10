// src/lib/application/repositories/transcript.repository.spec.ts
// Type-level test for TranscriptRepository interface shape (draft 06 §1.4 L488-492).

import { describe, it, expectTypeOf } from 'vitest'
import type { TranscriptRepository } from './transcript.repository'
import type { Transcript } from '@/lib/domain/entities'
import type { Result } from '../result'
import type { ExternalServiceError } from '@/lib/domain/errors'

describe('TranscriptRepository (interface shape)', () => {
  it('exposes findByBotId(botId) -> Promise<ReadonlyArray<Transcript>>', () => {
    expectTypeOf<TranscriptRepository['findByBotId']>().toEqualTypeOf<
      (botId: string) => Promise<ReadonlyArray<Transcript>>
    >()
  })

  it('exposes save(transcript) -> Promise<Result<Transcript, ExternalServiceError>>', () => {
    expectTypeOf<TranscriptRepository['save']>().toEqualTypeOf<
      (transcript: Transcript) => Promise<Result<Transcript, ExternalServiceError>>
    >()
  })
})
