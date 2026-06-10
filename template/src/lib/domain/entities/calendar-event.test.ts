import { describe, it, expect } from 'vitest'
import type { CalendarEvent } from './calendar-event'
import { createEmail } from '../value-objects/email'

describe('CalendarEvent entity', () => {
  it('構造一致: externalId / platform / meetingUrl / start-end / autoJoin / organizerEmail を持つ', () => {
    const emailResult = createEmail('host@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const ev: CalendarEvent = {
      id: 'cal-1',
      externalId: 'gcal_abc123',
      platform: 'google_meet',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      startAt: new Date('2026-02-01T10:00:00Z'),
      endAt: new Date('2026-02-01T11:00:00Z'),
      autoJoin: true,
      organizerEmail: emailResult.value,
    }

    expect(ev.id).toBe('cal-1')
    expect(ev.externalId).toBe('gcal_abc123')
    expect(ev.platform).toBe('google_meet')
    expect(ev.meetingUrl).toContain('meet.google.com')
    expect(ev.autoJoin).toBe(true)
    expect(ev.organizerEmail.value).toBe('host@example.com')
    expect(ev.startAt.getTime()).toBeLessThan(ev.endAt.getTime())
  })

  it('autoJoin = false の event も型上 OK', () => {
    const emailResult = createEmail('manual@example.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const ev: CalendarEvent = {
      id: 'cal-2',
      externalId: 'ms_event_xyz',
      platform: 'microsoft_teams',
      meetingUrl: 'https://teams.microsoft.com/l/meetup-join/xxx',
      startAt: new Date(),
      endAt: new Date(),
      autoJoin: false,
      organizerEmail: emailResult.value,
    }

    expect(ev.autoJoin).toBe(false)
  })

  it('readonly: autoJoin mutation は型エラー', () => {
    const emailResult = createEmail('a@b.com')
    if (!emailResult.ok) throw new Error('email factory failed')

    const ev: CalendarEvent = {
      id: 'cal-3',
      externalId: 'x',
      platform: 'zoom',
      meetingUrl: 'https://zoom.us/j/1',
      startAt: new Date(),
      endAt: new Date(),
      autoJoin: false,
      organizerEmail: emailResult.value,
    }

    // @ts-expect-error - autoJoin is readonly
    ev.autoJoin = true
    expect(ev.autoJoin).toBe(true)
  })
})
