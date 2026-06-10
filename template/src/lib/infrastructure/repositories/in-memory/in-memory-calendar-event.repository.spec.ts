// in-memory-calendar-event.repository.spec.ts — behavior tests.
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { InMemoryCalendarEventRepository } from './in-memory-calendar-event.repository'
import { createEmail, type Email } from '@/lib/domain/value-objects/email'
import type { CalendarEvent } from '@/lib/domain/entities'
import { NotFoundError } from '@/lib/domain/errors'

function email(raw: string): Email {
  const r = createEmail(raw)
  if (!r.ok) throw new Error('bad fixture')
  return r.value
}

function build(over: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'ev-1',
    externalId: 'g-cal-1',
    platform: 'google_meet',
    meetingUrl: 'https://meet.google.com/abc-defg-hij',
    startAt: new Date('2026-06-01T10:00:00Z'),
    endAt: new Date('2026-06-01T11:00:00Z'),
    autoJoin: true,
    organizerEmail: email('org@example.com'),
    ...over,
  }
}

describe('InMemoryCalendarEventRepository', () => {
  let repo: InMemoryCalendarEventRepository
  beforeEach(() => {
    repo = new InMemoryCalendarEventRepository()
  })

  it('findById returns NotFoundError when missing', async () => {
    const r = await repo.findById('ev-x')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(NotFoundError)
  })

  it('save then findById returns the event', async () => {
    await repo.save(build())
    const r = await repo.findById('ev-1')
    expect(r.ok).toBe(true)
  })

  it('findUpcoming returns events whose startAt falls in [from, to)', async () => {
    await repo.save(build({ id: 'ev-1', startAt: new Date('2026-06-01T10:00:00Z') }))
    await repo.save(build({ id: 'ev-2', startAt: new Date('2026-06-02T10:00:00Z') }))
    await repo.save(build({ id: 'ev-3', startAt: new Date('2026-06-10T10:00:00Z') }))
    const got = await repo.findUpcoming(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-03T00:00:00Z'),
    )
    expect(got).toHaveLength(2)
  })

  it('findUpcoming excludes the `to` boundary (half-open interval)', async () => {
    await repo.save(build({ id: 'ev-1', startAt: new Date('2026-06-03T00:00:00Z') }))
    const got = await repo.findUpcoming(
      new Date('2026-06-01T00:00:00Z'),
      new Date('2026-06-03T00:00:00Z'),
    )
    expect(got).toHaveLength(0)
  })

  it('save with same id updates autoJoin', async () => {
    await repo.save(build({ autoJoin: true }))
    await repo.save(build({ autoJoin: false }))
    const r = await repo.findById('ev-1')
    if (r.ok) expect(r.value.autoJoin).toBe(false)
  })

  it('delete removes the event; second delete is NotFoundError', async () => {
    await repo.save(build())
    expect((await repo.delete('ev-1')).ok).toBe(true)
    expect((await repo.delete('ev-1')).ok).toBe(false)
  })
})
