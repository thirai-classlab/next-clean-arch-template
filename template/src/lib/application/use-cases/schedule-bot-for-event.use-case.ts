// src/lib/application/use-cases/schedule-bot-for-event.use-case.ts
// Draft 06 §1.4 Calendar#2 — dispatch a Bot to attend a scheduled CalendarEvent.

import type { CalendarEventRepository } from '../repositories/calendar-event.repository'
import type { BotOrchestratorPort } from '../ports/bot-orchestrator.port'
import type { BotRepository } from '../repositories/bot.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Bot } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface ScheduleBotForEventInput {
  readonly calendarEventId: string
}

export class ScheduleBotForEventUseCase {
  constructor(
    private readonly calendarEventRepo: CalendarEventRepository,
    private readonly botOrchestratorPort: BotOrchestratorPort,
    private readonly botRepo: BotRepository,
  ) {}

  async execute(
    input: ScheduleBotForEventInput,
  ): Promise<Result<Bot, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
