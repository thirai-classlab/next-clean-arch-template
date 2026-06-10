// src/lib/infrastructure/repositories/in-memory/in-memory-calendar-event.repository.ts
// In-memory CalendarEventRepository — draft 06 §3 minimal Profile persistence.
// `findUpcoming(from, to)` returns events whose startAt falls in [from, to).
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { CalendarEventRepository } from '@/lib/application/repositories'
import { ok, err, type Result } from '@/lib/application/result'
import type { CalendarEvent } from '@/lib/domain/entities'
import { ExternalServiceError, NotFoundError } from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

@injectable()
export class InMemoryCalendarEventRepository
  extends InMemoryRepositoryBase<CalendarEvent>
  implements CalendarEventRepository
{
  async findById(id: string): Promise<Result<CalendarEvent, NotFoundError>> {
    const found = this.getById(id)
    return found ? ok(found) : err(new NotFoundError('CalendarEvent', id))
  }

  async findUpcoming(
    from: Date,
    to: Date,
  ): Promise<ReadonlyArray<CalendarEvent>> {
    const fromMs = from.getTime()
    const toMs = to.getTime()
    return Object.freeze(
      Array.from(this.store.values()).filter((e) => {
        const s = e.startAt.getTime()
        return s >= fromMs && s < toMs
      }),
    )
  }

  async save(
    event: CalendarEvent,
  ): Promise<Result<CalendarEvent, ExternalServiceError>> {
    return ok(this.putById(event))
  }

  async delete(id: string): Promise<Result<void, NotFoundError>> {
    return this.removeById(id)
      ? ok(undefined)
      : err(new NotFoundError('CalendarEvent', id))
  }
}
