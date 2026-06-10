// src/lib/application/use-cases/get-recordings.use-case.ts
// Draft 06 §1.4 Recording#1 — list recordings for a given Bot.

import type { RecordingRepository } from '../repositories/recording.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Recording } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface GetRecordingsInput {
  readonly botId: string
}

export class GetRecordingsUseCase {
  constructor(private readonly recordingRepo: RecordingRepository) {}

  async execute(
    input: GetRecordingsInput,
  ): Promise<Result<ReadonlyArray<Recording>, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
