import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createMeetingSessionAggregate,
  scheduleBotJoin,
  cancelBotJoin,
} from './meeting-session-aggregate'
import type { CalendarEvent } from '../entities/calendar-event'
import type { Bot } from '../entities/bot'
import { createEmail } from '../value-objects/email'
import { ValidationError } from '../errors/validation-error'
import type { CalendarEventScheduledEvent } from '../events'

function buildCalendarEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const emailResult = createEmail('organizer@example.com')
  if (!emailResult.ok) throw new Error('email factory failed')
  return {
    id: 'cal-1',
    externalId: 'ext-1',
    platform: 'zoom',
    meetingUrl: 'https://zoom.us/j/999',
    startAt: new Date('2099-01-01T10:00:00Z'),
    endAt: new Date('2099-01-01T11:00:00Z'),
    autoJoin: true,
    organizerEmail: emailResult.value,
    ...overrides,
  }
}

function buildBot(overrides: Partial<Bot> = {}): Bot {
  return {
    id: 'bot-1',
    meetingUrl: 'https://zoom.us/j/999',
    platform: 'zoom',
    status: 'ready',
    region: 'us-east-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    statusUpdatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('MeetingSessionAggregate factory', () => {
  it('createMeetingSessionAggregate: calendarEvent のみで生成、bot=null', () => {
    const agg = createMeetingSessionAggregate(buildCalendarEvent())
    expect(agg.calendarEvent.id).toBe('cal-1')
    expect(agg.bot).toBeNull()
    expect(agg.pendingEvents).toEqual([])
  })

  it('immutability: frozen', () => {
    const agg = createMeetingSessionAggregate(buildCalendarEvent())
    expect(Object.isFrozen(agg)).toBe(true)
  })
})

describe('scheduleBotJoin', () => {
  it('正常: bot=null ∧ autoJoin=true ∧ now<startAt で成功、Bot stub 生成 + Event 追加', () => {
    vi.useFakeTimers().setSystemTime(new Date('2099-01-01T09:00:00Z'))
    const agg = createMeetingSessionAggregate(buildCalendarEvent())
    const result = scheduleBotJoin(agg)
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error('unexpected err')
    expect(result.value.bot).not.toBeNull()
    expect(result.value.bot?.meetingUrl).toBe('https://zoom.us/j/999')
    expect(result.value.bot?.platform).toBe('zoom')
    expect(result.value.bot?.status).toBe('ready')
    const event = result.value.pendingEvents[0] as CalendarEventScheduledEvent
    expect(event.eventType).toBe('CalendarEventScheduled')
    expect(event.payload.calendarEventId).toBe('cal-1')
    expect(event.payload.platform).toBe('zoom')
  })

  it('NG: bot != null だと ValidationError', () => {
    vi.useFakeTimers().setSystemTime(new Date('2099-01-01T09:00:00Z'))
    const base = createMeetingSessionAggregate(buildCalendarEvent())
    const first = scheduleBotJoin(base)
    if (!first.ok) throw new Error('first schedule failed')
    const second = scheduleBotJoin(first.value)
    expect(second.ok).toBe(false)
    if (second.ok) throw new Error('unexpected ok')
    expect(second.error).toBeInstanceOf(ValidationError)
  })

  it('NG: autoJoin=false だと ValidationError', () => {
    vi.useFakeTimers().setSystemTime(new Date('2099-01-01T09:00:00Z'))
    const agg = createMeetingSessionAggregate(
      buildCalendarEvent({ autoJoin: false }),
    )
    const result = scheduleBotJoin(agg)
    expect(result.ok).toBe(false)
  })

  it('NG: now >= startAt (過去 meeting) だと ValidationError', () => {
    vi.useFakeTimers().setSystemTime(new Date('2099-01-01T11:00:00Z'))
    const agg = createMeetingSessionAggregate(buildCalendarEvent())
    const result = scheduleBotJoin(agg)
    expect(result.ok).toBe(false)
  })

  it('immutability: 元 aggregate 変化なし', () => {
    vi.useFakeTimers().setSystemTime(new Date('2099-01-01T09:00:00Z'))
    const agg = createMeetingSessionAggregate(buildCalendarEvent())
    scheduleBotJoin(agg)
    expect(agg.bot).toBeNull()
    expect(agg.pendingEvents).toHaveLength(0)
  })
})

describe('cancelBotJoin', () => {
  it('正常: bot != null だと cancel 成功、bot=null に戻る', () => {
    vi.useFakeTimers().setSystemTime(new Date('2099-01-01T09:00:00Z'))
    const base = createMeetingSessionAggregate(buildCalendarEvent())
    const scheduled = scheduleBotJoin(base)
    if (!scheduled.ok) throw new Error('schedule failed')
    const cancelled = cancelBotJoin(scheduled.value)
    expect(cancelled.ok).toBe(true)
    if (!cancelled.ok) throw new Error('unexpected err')
    expect(cancelled.value.bot).toBeNull()
  })

  it('NG: bot=null だと ValidationError', () => {
    const agg = createMeetingSessionAggregate(buildCalendarEvent())
    const result = cancelBotJoin(agg)
    expect(result.ok).toBe(false)
    if (result.ok) throw new Error('unexpected ok')
    expect(result.error).toBeInstanceOf(ValidationError)
  })

  it('explicit bot 注入: factory に bot を渡せる', () => {
    const agg = createMeetingSessionAggregate(buildCalendarEvent(), buildBot())
    expect(agg.bot?.id).toBe('bot-1')
    const result = cancelBotJoin(agg)
    expect(result.ok).toBe(true)
  })
})
