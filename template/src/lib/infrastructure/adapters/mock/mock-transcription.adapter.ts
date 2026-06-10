// src/lib/infrastructure/adapters/mock/mock-transcription.adapter.ts
// In-memory transcription fake. requestTranscription seeds 1 transcript.

import { injectable } from 'tsyringe'
import type { TranscriptionPort } from '../../../application/ports/transcription.port'
import { ok, err, type Result } from '../../../application/result'
import {
  NotFoundError,
  type ExternalServiceError,
} from '../../../domain/errors'
import type { Transcript } from '../../../domain/entities/transcript'

@injectable()
export class MockTranscriptionAdapter implements TranscriptionPort {
  private transcripts = new Map<string, Transcript[]>()
  private counter = 0

  async requestTranscription(
    botId: string,
  ): Promise<Result<{ jobId: string }, ExternalServiceError>> {
    const list = this.transcripts.get(botId) ?? []
    list.push({
      id: `mock-transcript-${++this.counter}`,
      botId,
      speakerId: 'mock-speaker-1',
      words: [
        { word: 'hello', startMs: 0, endMs: 500 },
        { word: 'world', startMs: 500, endMs: 1000 },
      ],
      confidence: 0.95,
      createdAt: new Date(),
    })
    this.transcripts.set(botId, list)
    return ok({ jobId: `mock-job-${this.counter}` })
  }

  async getTranscript(
    botId: string,
  ): Promise<Result<ReadonlyArray<Transcript>, NotFoundError | ExternalServiceError>> {
    const list = this.transcripts.get(botId)
    if (!list) return err(new NotFoundError('transcript', botId))
    return ok(list)
  }
}
