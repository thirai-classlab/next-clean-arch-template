// src/lib/application/use-cases/handle-bot-webhook.use-case.ts
// Draft 06 §1.4 Bot#5 — verify + dedupe inbound Recall.ai webhook, update Bot state.

import type { WebhookVerifierPort } from '../ports/webhook-verifier.port'
import type { WebhookEventRepository } from '../repositories/webhook-event.repository'
import type { BotRepository } from '../repositories/bot.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface HandleBotWebhookInput {
  readonly rawBody: string
  readonly signature: string
  readonly payload: unknown
}

export class HandleBotWebhookUseCase {
  constructor(
    private readonly webhookVerifierPort: WebhookVerifierPort,
    private readonly webhookEventRepo: WebhookEventRepository,
    private readonly botRepo: BotRepository,
  ) {}

  async execute(
    input: HandleBotWebhookInput,
  ): Promise<Result<void, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
