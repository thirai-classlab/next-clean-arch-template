// src/lib/application/repositories/calendar-event.repository.spec.ts
// Type-level test for CalendarEventRepository interface shape (draft 06 §1.4 L494-500).

import { describe, it, expectTypeOf } from 'vitest'
import type { CalendarEventRepository } from './calendar-event.repository'
import type { CalendarEvent } from '@/lib/domain/entities'
import type { Result } from '../result'
import type {
  NotFoundError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('CalendarEventRepository (interface shape)', () => {
  it('exposes findById(id) -> Promise<Result<CalendarEvent, NotFoundError>>', () => {
    expectTypeOf<CalendarEventRepository['findById']>().toEqualTypeOf<
      (id: string) => Promise<Result<CalendarEvent, NotFoundError>>
    >()
  })

  it('exposes findUpcoming(from, to) -> Promise<ReadonlyArray<CalendarEvent>>', () => {
    expectTypeOf<CalendarEventRepository['findUpcoming']>().toEqualTypeOf<
      (from: Date, to: Date) => Promise<ReadonlyArray<CalendarEvent>>
    >()
  })

  it('exposes save(event) -> Promise<Result<CalendarEvent, ExternalServiceError>>', () => {
    expectTypeOf<CalendarEventRepository['save']>().toEqualTypeOf<
      (event: CalendarEvent) => Promise<Result<CalendarEvent, ExternalServiceError>>
    >()
  })

  it('exposes delete(id) -> Promise<Result<void, NotFoundError>>', () => {
    expectTypeOf<CalendarEventRepository['delete']>().toEqualTypeOf<
      (id: string) => Promise<Result<void, NotFoundError>>
    >()
  })
})
