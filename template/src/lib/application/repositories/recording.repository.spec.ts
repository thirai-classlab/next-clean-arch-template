// src/lib/application/repositories/recording.repository.spec.ts
// Type-level test for RecordingRepository interface shape (draft 06 §1.4 L481-486).

import { describe, it, expectTypeOf } from 'vitest'
import type { RecordingRepository } from './recording.repository'
import type { Recording } from '@/lib/domain/entities'
import type { Result } from '../result'
import type {
  NotFoundError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('RecordingRepository (interface shape)', () => {
  it('exposes findById(id) -> Promise<Result<Recording, NotFoundError>>', () => {
    expectTypeOf<RecordingRepository['findById']>().toEqualTypeOf<
      (id: string) => Promise<Result<Recording, NotFoundError>>
    >()
  })

  it('exposes findByBotId(botId) -> Promise<ReadonlyArray<Recording>>', () => {
    expectTypeOf<RecordingRepository['findByBotId']>().toEqualTypeOf<
      (botId: string) => Promise<ReadonlyArray<Recording>>
    >()
  })

  it('exposes save(recording) -> Promise<Result<Recording, ExternalServiceError>>', () => {
    expectTypeOf<RecordingRepository['save']>().toEqualTypeOf<
      (recording: Recording) => Promise<Result<Recording, ExternalServiceError>>
    >()
  })
})
