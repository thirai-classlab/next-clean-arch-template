// src/lib/application/repositories/bot.repository.ts
// BotRepository — persistence boundary for the Bot aggregate root (draft 06 §1.4).

import type { Bot } from '@/lib/domain/entities'
import type { BotStatus } from '@/lib/domain/value-objects/bot-status'
import type {
  NotFoundError,
  ExternalServiceError,
} from '@/lib/domain/errors'
import type { Result } from '../result'

export interface BotRepository {
  findById(id: string): Promise<Result<Bot, NotFoundError>>
  findByStatus(status: BotStatus): Promise<ReadonlyArray<Bot>>
  save(bot: Bot): Promise<Result<Bot, ExternalServiceError>>
  delete(id: string): Promise<Result<void, NotFoundError>>
}
