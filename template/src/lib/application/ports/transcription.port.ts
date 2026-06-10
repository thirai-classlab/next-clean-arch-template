// src/lib/application/ports/transcription.port.ts
// TranscriptionPort — abstracts transcription provider (Recall.ai / Deepgram / etc).

import type { Result } from '../result'
import type { Transcript } from '../../domain/entities/transcript'
import type { ExternalServiceError, NotFoundError } from '../../domain/errors'

export interface TranscriptionPort {
  requestTranscription(
    botId: string,
  ): Promise<Result<{ jobId: string }, ExternalServiceError>>

  getTranscript(
    botId: string,
  ): Promise<Result<ReadonlyArray<Transcript>, NotFoundError | ExternalServiceError>>
}
