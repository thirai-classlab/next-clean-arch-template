// src/lib/application/use-cases/list-bots.use-case.ts
// Draft 06 §1.4 Bot#2 — paginated Bot listing, optionally filtered by status.

import type { BotRepository } from '../repositories/bot.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Bot } from '@/lib/domain/entities'
import type { BotStatus } from '@/lib/domain/value-objects/bot-status'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface ListBotsInput {
  readonly status?: BotStatus
  readonly page: number
}

export interface ListBotsOutput {
  readonly bots: ReadonlyArray<Bot>
  readonly total: number
}

export class ListBotsUseCase {
  constructor(private readonly botRepo: BotRepository) {}

  async execute(
    input: ListBotsInput,
  ): Promise<Result<ListBotsOutput, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
