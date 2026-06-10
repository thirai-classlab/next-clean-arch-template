// src/lib/application/ports/calendar.port.ts
// CalendarPort — abstracts Google Calendar / Microsoft Graph.
// `syncEvents` performs incremental pull keyed by sync token (vendor-specific).

import type { Result } from '../result'
import type { CalendarEvent } from '../../domain/entities/calendar-event'
import type { ExternalServiceError } from '../../domain/errors'

export interface CalendarPort {
  syncEvents(params: {
    since?: Date
  }): Promise<
    Result<
      { events: ReadonlyArray<CalendarEvent>; nextSyncToken: string | null },
      ExternalServiceError
    >
  >
}
