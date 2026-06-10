// src/lib/application/repositories/calendar-event.repository.ts
// CalendarEventRepository — persistence boundary for CalendarEvent entities (draft 06 §1.4).

import type { CalendarEvent } from '@/lib/domain/entities'
import type {
  NotFoundError,
  ExternalServiceError,
} from '@/lib/domain/errors'
import type { Result } from '../result'

export interface CalendarEventRepository {
  findById(id: string): Promise<Result<CalendarEvent, NotFoundError>>
  findUpcoming(from: Date, to: Date): Promise<ReadonlyArray<CalendarEvent>>
  save(event: CalendarEvent): Promise<Result<CalendarEvent, ExternalServiceError>>
  delete(id: string): Promise<Result<void, NotFoundError>>
}
