import { describe, it, expect } from 'vitest'
import { ListCalendarEventsUseCase } from './list-calendar-events.use-case'
import type { CalendarEventRepository } from '../repositories/calendar-event.repository'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('ListCalendarEventsUseCase (signature)', () => {
  const calendarEventRepo = {} as CalendarEventRepository

  it('is constructible with CalendarEventRepository', () => {
    const uc = new ListCalendarEventsUseCase(calendarEventRepo)
    expect(uc).toBeInstanceOf(ListCalendarEventsUseCase)
  })

  it('exposes execute()', () => {
    const uc = new ListCalendarEventsUseCase(calendarEventRepo)
    expect(typeof uc.execute).toBe('function')
  })

  it('returns Result.err(ExternalServiceError) "not implemented: Step 3"', async () => {
    const uc = new ListCalendarEventsUseCase(calendarEventRepo)
    const r = await uc.execute({ from: new Date(), to: new Date() })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(r.error).toBeInstanceOf(ExternalServiceError)
      expect(r.error.message).toContain('not implemented: Step 3')
    }
  })
})
