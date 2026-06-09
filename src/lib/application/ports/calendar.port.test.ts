import { describe, it, expectTypeOf } from 'vitest'
import type { CalendarPort } from './calendar.port'
import type { Result } from '../result'
import type { CalendarEvent } from '../../domain/entities/calendar-event'
import type { ExternalServiceError } from '../../domain/errors'

describe('CalendarPort (type-level)', () => {
  it('syncEvents: (params) => Promise<Result<{events,nextSyncToken}, ExternalServiceError>>', () => {
    expectTypeOf<CalendarPort['syncEvents']>().toEqualTypeOf<
      (params: { since?: Date }) => Promise<
        Result<
          { events: ReadonlyArray<CalendarEvent>; nextSyncToken: string | null },
          ExternalServiceError
        >
      >
    >()
  })
})
