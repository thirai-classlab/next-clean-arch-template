// src/lib/domain/aggregates/meeting-session-aggregate.ts
// MeetingSessionAggregate — CalendarEvent + Bot の集約 root。
// draft 06 §1.3 L273-281 準拠。bot=null から scheduleBotJoin で Bot stub を生成。

import type { CalendarEvent } from '../entities/calendar-event'
import type { Bot } from '../entities/bot'
import type {
  DomainEvent,
  CalendarEventScheduledEvent,
} from '../events'
import { type Result, ok, err } from '@/lib/application/result'
import { ValidationError } from '../errors/validation-error'

export interface MeetingSessionAggregate {
  readonly calendarEvent: CalendarEvent
  readonly bot: Bot | null
  readonly pendingEvents: ReadonlyArray<DomainEvent>
}

export function createMeetingSessionAggregate(
  calendarEvent: CalendarEvent,
  bot: Bot | null = null,
): MeetingSessionAggregate {
  return Object.freeze({
    calendarEvent,
    bot,
    pendingEvents: Object.freeze([] as ReadonlyArray<DomainEvent>),
  })
}

function generateBotStubId(calendarEventId: string): string {
  return `bot-stub-${calendarEventId}`
}

export function scheduleBotJoin(
  agg: MeetingSessionAggregate,
): Result<MeetingSessionAggregate, ValidationError> {
  if (agg.bot !== null) {
    return err(
      new ValidationError(
        `bot already scheduled for calendarEvent ${agg.calendarEvent.id}`,
      ),
    )
  }
  if (!agg.calendarEvent.autoJoin) {
    return err(
      new ValidationError(
        `autoJoin is disabled for calendarEvent ${agg.calendarEvent.id}`,
      ),
    )
  }
  const now = new Date()
  if (now >= agg.calendarEvent.startAt) {
    return err(
      new ValidationError(
        `cannot schedule bot for past or already-started meeting ${agg.calendarEvent.id}`,
      ),
    )
  }
  const botStub: Bot = {
    id: generateBotStubId(agg.calendarEvent.id),
    meetingUrl: agg.calendarEvent.meetingUrl,
    platform: agg.calendarEvent.platform,
    status: 'ready',
    region: 'us-east-1',
    createdAt: now,
    statusUpdatedAt: now,
  }
  const event: CalendarEventScheduledEvent = {
    eventType: 'CalendarEventScheduled',
    occurredAt: now,
    payload: {
      calendarEventId: agg.calendarEvent.id,
      platform: agg.calendarEvent.platform,
      startAt: agg.calendarEvent.startAt,
    },
  }
  return ok(
    Object.freeze({
      ...agg,
      bot: botStub,
      pendingEvents: Object.freeze([...agg.pendingEvents, event]),
    }),
  )
}

export function cancelBotJoin(
  agg: MeetingSessionAggregate,
): Result<MeetingSessionAggregate, ValidationError> {
  if (agg.bot === null) {
    return err(
      new ValidationError(
        `no bot scheduled for calendarEvent ${agg.calendarEvent.id}`,
      ),
    )
  }
  return ok(
    Object.freeze({
      ...agg,
      bot: null,
    }),
  )
}
