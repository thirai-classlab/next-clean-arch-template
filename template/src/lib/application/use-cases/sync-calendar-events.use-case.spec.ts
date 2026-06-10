import { describe, it, expect } from 'vitest'
import { SyncCalendarEventsUseCase } from './sync-calendar-events.use-case'
import type { CalendarPort } from '../ports/calendar.port'
import type { CalendarEventRepository } from '../repositories/calendar-event.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('SyncCalendarEventsUseCase (signature)', () => {
  const calendarPort = {} as CalendarPort
  const calendarEventRepo = {} as CalendarEventRepository

  it('is constructible with CalendarPort + CalendarEventRepository', () => {
    const uc = new SyncCalendarEventsUseCase(calendarPort, calendarEventRepo)
    expect(uc).toBeInstanceOf(SyncCalendarEventsUseCase)
  })

  it('exposes execute()', () => {
    const uc = new SyncCalendarEventsUseCase(calendarPort, calendarEventRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new SyncCalendarEventsUseCase(calendarPort, calendarEventRepo)
    const r = await uc.execute()
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
