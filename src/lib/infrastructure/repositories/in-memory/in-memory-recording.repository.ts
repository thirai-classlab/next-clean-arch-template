// src/lib/infrastructure/repositories/in-memory/in-memory-recording.repository.ts
// In-memory RecordingRepository — draft 06 §3 minimal Profile persistence.
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { RecordingRepository } from '@/lib/application/repositories'
import { ok, err, type Result } from '@/lib/application/result'
import type { Recording } from '@/lib/domain/entities'
import { ExternalServiceError, NotFoundError } from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

@injectable()
export class InMemoryRecordingRepository
  extends InMemoryRepositoryBase<Recording>
  implements RecordingRepository
{
  async findById(id: string): Promise<Result<Recording, NotFoundError>> {
    const found = this.getById(id)
    return found ? ok(found) : err(new NotFoundError('Recording', id))
  }

  async findByBotId(botId: string): Promise<ReadonlyArray<Recording>> {
    return Object.freeze(
      Array.from(this.store.values()).filter((r) => r.botId === botId),
    )
  }

  async save(
    recording: Recording,
  ): Promise<Result<Recording, ExternalServiceError>> {
    return ok(this.putById(recording))
  }
}
