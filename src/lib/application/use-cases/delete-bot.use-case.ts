// src/lib/application/use-cases/delete-bot.use-case.ts
// Draft 06 §1.4 Bot#4 — tear down a Bot (Recall.ai + local persistence).

import type { BotOrchestratorPort } from '../ports/bot-orchestrator.port'
import type { BotRepository } from '../repositories/bot.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface DeleteBotInput {
  readonly botId: string
}

export class DeleteBotUseCase {
  constructor(
    private readonly botOrchestratorPort: BotOrchestratorPort,
    private readonly botRepo: BotRepository,
  ) {}

  async execute(input: DeleteBotInput): Promise<Result<void, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
