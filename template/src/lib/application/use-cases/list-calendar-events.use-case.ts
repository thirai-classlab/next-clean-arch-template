// src/lib/application/use-cases/list-calendar-events.use-case.ts
// Draft 06 §1.4 Calendar#1 — list calendar events in [from, to] range.

import type { CalendarEventRepository } from '../repositories/calendar-event.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { CalendarEvent } from '@/lib/domain/entities'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface ListCalendarEventsInput {
  readonly from: Date
  readonly to: Date
}

export class ListCalendarEventsUseCase {
  constructor(private readonly calendarEventRepo: CalendarEventRepository) {}

  async execute(
    input: ListCalendarEventsInput,
  ): Promise<Result<ReadonlyArray<CalendarEvent>, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
