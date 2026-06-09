// src/lib/application/use-cases/create-bot.use-case.ts
// Draft 06 §1.4 Bot#1 — provision a Recall.ai Bot, persist + enqueue side-effects.

import type { BotOrchestratorPort } from '../ports/bot-orchestrator.port'
import type { QueuePort } from '../ports/queue.port'
import type { BotRepository } from '../repositories/bot.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Bot } from '@/lib/domain/entities'
import type { Region } from '@/lib/domain/value-objects/region'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface CreateBotInput {
  readonly meetingUrl: string
  readonly region?: Region
}

export class CreateBotUseCase {
  constructor(
    private readonly botOrchestratorPort: BotOrchestratorPort,
    private readonly botRepo: BotRepository,
    private readonly queuePort: QueuePort,
  ) {}

  async execute(input: CreateBotInput): Promise<Result<Bot, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
