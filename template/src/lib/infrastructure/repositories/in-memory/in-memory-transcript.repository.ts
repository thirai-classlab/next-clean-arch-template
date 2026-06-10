// src/lib/infrastructure/repositories/in-memory/in-memory-transcript.repository.ts
// In-memory TranscriptRepository — draft 06 §3 minimal Profile persistence.
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { TranscriptRepository } from '@/lib/application/repositories'
import { ok, type Result } from '@/lib/application/result'
import type { Transcript } from '@/lib/domain/entities'
import type { ExternalServiceError } from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

@injectable()
export class InMemoryTranscriptRepository
  extends InMemoryRepositoryBase<Transcript>
  implements TranscriptRepository
{
  async findByBotId(botId: string): Promise<ReadonlyArray<Transcript>> {
    return Object.freeze(
      Array.from(this.store.values()).filter((t) => t.botId === botId),
    )
  }

  async save(
    transcript: Transcript,
  ): Promise<Result<Transcript, ExternalServiceError>> {
    return ok(this.putById(transcript))
  }
}
