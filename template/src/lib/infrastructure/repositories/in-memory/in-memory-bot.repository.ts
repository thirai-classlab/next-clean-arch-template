// src/lib/infrastructure/repositories/in-memory/in-memory-bot.repository.ts
// In-memory BotRepository — draft 06 §3 minimal Profile persistence.
// `save` returns ExternalServiceError only on infrastructure failures (never
// thrown by the in-memory variant); duplicate ids upsert by design.
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { BotRepository } from '@/lib/application/repositories'
import { ok, err, type Result } from '@/lib/application/result'
import type { Bot } from '@/lib/domain/entities'
import type { BotStatus } from '@/lib/domain/value-objects/bot-status'
import { ExternalServiceError, NotFoundError } from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

@injectable()
export class InMemoryBotRepository
  extends InMemoryRepositoryBase<Bot>
  implements BotRepository
{
  async findById(id: string): Promise<Result<Bot, NotFoundError>> {
    const found = this.getById(id)
    return found ? ok(found) : err(new NotFoundError('Bot', id))
  }

  async findByStatus(status: BotStatus): Promise<ReadonlyArray<Bot>> {
    return Object.freeze(
      Array.from(this.store.values()).filter((b) => b.status === status),
    )
  }

  async save(bot: Bot): Promise<Result<Bot, ExternalServiceError>> {
    return ok(this.putById(bot))
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    return this.removeById(id)
      ? ok(undefined)
      : err(new NotFoundError('Bot', id))
  }
}
