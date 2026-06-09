// src/lib/application/use-cases/sync-calendar-events.use-case.ts
// Draft 06 §1.4 Calendar#3 — pull calendar deltas from external provider into repo.

import type { CalendarPort } from '../ports/calendar.port'
import type { CalendarEventRepository } from '../repositories/calendar-event.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface SyncCalendarEventsOutput {
  readonly added: number
  readonly updated: number
}

export class SyncCalendarEventsUseCase {
  constructor(
    private readonly calendarPort: CalendarPort,
    private readonly calendarEventRepo: CalendarEventRepository,
  ) {}

  async execute(): Promise<Result<SyncCalendarEventsOutput, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
