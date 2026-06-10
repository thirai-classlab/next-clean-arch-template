// src/lib/application/use-cases/refresh-recording-url.use-case.ts
// Draft 06 §1.4 Recording#3 — re-sign the storage URL when the previous one expired.

import type { StoragePort } from '../ports/storage.port'
import type { RecordingRepository } from '../repositories/recording.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Recording } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface RefreshRecordingUrlInput {
  readonly recordingId: string
}

export class RefreshRecordingUrlUseCase {
  constructor(
    private readonly recordingRepo: RecordingRepository,
    private readonly storagePort: StoragePort,
  ) {}

  async execute(
    input: RefreshRecordingUrlInput,
  ): Promise<Result<Recording, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
