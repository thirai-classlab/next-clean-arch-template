// src/lib/application/repositories/transcript.repository.ts
// TranscriptRepository — persistence boundary for Transcript entities (draft 06 §1.4).

import type { Transcript } from '@/lib/domain/entities'
import type { ExternalServiceError } from '@/lib/domain/errors'
import type { Result } from '../result'

export interface TranscriptRepository {
  findByBotId(botId: string): Promise<ReadonlyArray<Transcript>>
  save(transcript: Transcript): Promise<Result<Transcript, ExternalServiceError>>
}
