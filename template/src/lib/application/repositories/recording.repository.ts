// src/lib/application/repositories/recording.repository.ts
// RecordingRepository — persistence boundary for Recording entities (draft 06 §1.4).

import type { Recording } from '@/lib/domain/entities'
import type {
  NotFoundError,
  ExternalServiceError,
} from '@/lib/domain/errors'
import type { Result } from '../result'

export interface RecordingRepository {
  findById(id: string): Promise<Result<Recording, NotFoundError>>
  findByBotId(botId: string): Promise<ReadonlyArray<Recording>>
  save(recording: Recording): Promise<Result<Recording, ExternalServiceError>>
}
