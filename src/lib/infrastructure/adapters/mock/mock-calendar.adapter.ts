// src/lib/infrastructure/adapters/mock/mock-calendar.adapter.ts
// In-memory CalendarPort with a seeded fixture event.

import { injectable } from 'tsyringe'
import type { CalendarPort } from '../../../application/ports/calendar.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'
import type { CalendarEvent } from '../../../domain/entities/calendar-event'
import { createEmail } from '../../../domain/value-objects/email'

function seedEvents(): ReadonlyArray<CalendarEvent> {
  const emailRes = createEmail('organizer@example.com')
  if (!emailRes.ok) throw new Error('mock seed: invalid email')
  const now = Date.now()
  return [
    {
      id: 'mock-evt-1',
      externalId: 'gcal-1',
      platform: 'google_meet',
      meetingUrl: 'https://meet.google.com/mock-1',
      startAt: new Date(now + 60_000),
      endAt: new Date(now + 60 * 60_000),
      autoJoin: true,
      organizerEmail: emailRes.value,
    },
  ]
}

@injectable()
export class MockCalendarAdapter implements CalendarPort {
  private readonly events = seedEvents()

  async syncEvents(params: {
    since?: Date
  }): Promise<
    Result<
      { events: ReadonlyArray<CalendarEvent>; nextSyncToken: string | null },
      ExternalServiceError
    >
  > {
    const filtered = params.since
      ? this.events.filter((e) => e.startAt >= params.since!)
      : this.events
    return ok({ events: filtered, nextSyncToken: 'mock-sync-token-1' })
  }
}
