// src/lib/application/use-cases/get-bot.use-case.ts
// Draft 06 §1.4 Bot#3 — fetch single Bot by id.

import type { BotRepository } from '../repositories/bot.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Bot } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface GetBotInput {
  readonly botId: string
}

export class GetBotUseCase {
  constructor(private readonly botRepo: BotRepository) {}

  async execute(input: GetBotInput): Promise<Result<Bot, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
