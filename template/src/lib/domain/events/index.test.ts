// src/lib/domain/events/index.test.ts
// 9 concrete Domain Event + AllEvents union の structural test。
// - 各 Event が draft 06 L301-356 の payload field を持つ
// - AllEvents の switch 文で discriminated union narrowing が動作
// - 型漏れは @ts-expect-error / exhaustive check で検出

import { describe, it, expect, expectTypeOf } from 'vitest'
import { EVENT_TYPES, type EventTypeName } from './index'
import type {
  UserApprovedEvent,
  UserRoleChangedEvent,
  BotCreatedEvent,
  BotStatusChangedEvent,
  RecordingReadyEvent,
  TranscriptArrivedEvent,
  CalendarEventScheduledEvent,
  WebhookReceivedEvent,
  AuditLogCreatedEvent,
  AllEvents,
} from './index'

const occurredAt = new Date('2026-01-01T00:00:00Z')

describe('UserApprovedEvent', () => {
  it('eventType / payload field 型整合', () => {
    const ev: UserApprovedEvent = {
      eventType: 'UserApproved',
      occurredAt,
      payload: { userId: 'user-1', approvedBy: 'admin-1' },
    }
    expect(ev.eventType).toBe('UserApproved')
    expect(ev.payload.userId).toBe('user-1')
    expect(ev.payload.approvedBy).toBe('admin-1')
  })
})

describe('UserRoleChangedEvent', () => {
  it('eventType / payload field 型整合 (Role VO 参照)', () => {
    const ev: UserRoleChangedEvent = {
      eventType: 'UserRoleChanged',
      occurredAt,
      payload: {
        userId: 'user-1',
        oldRole: 'member',
        newRole: 'admin',
        changedBy: 'admin-1',
      },
    }
    expect(ev.eventType).toBe('UserRoleChanged')
    expect(ev.payload.oldRole).toBe('member')
    expect(ev.payload.newRole).toBe('admin')
  })
})

describe('BotCreatedEvent', () => {
  it('eventType / payload field 型整合 (MeetingPlatform / Region VO 参照)', () => {
    const ev: BotCreatedEvent = {
      eventType: 'BotCreated',
      occurredAt,
      payload: {
        botId: 'bot-1',
        meetingUrl: 'https://zoom.us/j/123',
        platform: 'zoom',
        region: 'us-east-1',
      },
    }
    expect(ev.eventType).toBe('BotCreated')
    expect(ev.payload.platform).toBe('zoom')
    expect(ev.payload.region).toBe('us-east-1')
  })
})

describe('BotStatusChangedEvent', () => {
  it('eventType / payload field 型整合 (BotStatus VO 参照)', () => {
    const ev: BotStatusChangedEvent = {
      eventType: 'BotStatusChanged',
      occurredAt,
      payload: {
        botId: 'bot-1',
        oldStatus: 'in_call_recording',
        newStatus: 'call_ended',
      },
    }
    expect(ev.eventType).toBe('BotStatusChanged')
    expect(ev.payload.oldStatus).toBe('in_call_recording')
    expect(ev.payload.newStatus).toBe('call_ended')
  })
})

describe('RecordingReadyEvent', () => {
  it('eventType / payload field 型整合', () => {
    const ev: RecordingReadyEvent = {
      eventType: 'RecordingReady',
      occurredAt,
      payload: { botId: 'bot-1', recordingId: 'rec-1', durationSecs: 3600 },
    }
    expect(ev.eventType).toBe('RecordingReady')
    expect(ev.payload.durationSecs).toBe(3600)
  })
})

describe('TranscriptArrivedEvent', () => {
  it('eventType / payload field 型整合 (speakerId nullable)', () => {
    const evWithSpeaker: TranscriptArrivedEvent = {
      eventType: 'TranscriptArrived',
      occurredAt,
      payload: {
        botId: 'bot-1',
        transcriptId: 'tr-1',
        speakerId: 'sp-1',
        wordCount: 42,
      },
    }
    expect(evWithSpeaker.payload.speakerId).toBe('sp-1')

    const evWithoutSpeaker: TranscriptArrivedEvent = {
      eventType: 'TranscriptArrived',
      occurredAt,
      payload: {
        botId: 'bot-1',
        transcriptId: 'tr-2',
        speakerId: null,
        wordCount: 7,
      },
    }
    expect(evWithoutSpeaker.payload.speakerId).toBeNull()
  })
})

describe('CalendarEventScheduledEvent', () => {
  it('eventType / payload field 型整合 (MeetingPlatform / Date)', () => {
    const startAt = new Date('2026-02-15T10:00:00Z')
    const ev: CalendarEventScheduledEvent = {
      eventType: 'CalendarEventScheduled',
      occurredAt,
      payload: {
        calendarEventId: 'cal-1',
        platform: 'google_meet',
        startAt,
      },
    }
    expect(ev.eventType).toBe('CalendarEventScheduled')
    expect(ev.payload.platform).toBe('google_meet')
    expect(ev.payload.startAt.toISOString()).toBe('2026-02-15T10:00:00.000Z')
  })
})

describe('WebhookReceivedEvent', () => {
  it('eventType / payload field 型整合', () => {
    const ev: WebhookReceivedEvent = {
      eventType: 'WebhookReceived',
      occurredAt,
      payload: {
        webhookEventId: 'wh-1',
        eventType: 'bot.status_change',
        idempotencyKey: 'idem-1',
      },
    }
    expect(ev.eventType).toBe('WebhookReceived')
    expect(ev.payload.eventType).toBe('bot.status_change')
    expect(ev.payload.idempotencyKey).toBe('idem-1')
  })
})

describe('AuditLogCreatedEvent', () => {
  it('eventType / payload field 型整合', () => {
    const ev: AuditLogCreatedEvent = {
      eventType: 'AuditLogCreated',
      occurredAt,
      payload: { auditLogId: 'audit-1', actorId: 'admin-1', action: 'user.approve' },
    }
    expect(ev.eventType).toBe('AuditLogCreated')
    expect(ev.payload.action).toBe('user.approve')
  })
})

describe('AllEvents discriminated union narrowing', () => {
  // 全 9 Event を switch 内で exhaustive に narrow できることを確認。
  // 型漏れがあれば default の `never` 代入が型エラーになる。
  function handleEvent(ev: AllEvents): string {
    switch (ev.eventType) {
      case 'UserApproved':
        return `user:${ev.payload.userId}`
      case 'UserRoleChanged':
        return `role:${ev.payload.oldRole}->${ev.payload.newRole}`
      case 'BotCreated':
        return `bot:${ev.payload.botId}@${ev.payload.platform}`
      case 'BotStatusChanged':
        return `status:${ev.payload.oldStatus}->${ev.payload.newStatus}`
      case 'RecordingReady':
        return `rec:${ev.payload.recordingId}(${ev.payload.durationSecs}s)`
      case 'TranscriptArrived':
        return `tr:${ev.payload.transcriptId}/${ev.payload.wordCount}w`
      case 'CalendarEventScheduled':
        return `cal:${ev.payload.calendarEventId}@${ev.payload.platform}`
      case 'WebhookReceived':
        return `wh:${ev.payload.idempotencyKey}`
      case 'AuditLogCreated':
        return `audit:${ev.payload.action}`
      default: {
        // exhaustive check — 新規 Event 追加忘れがあると tsc が型エラー
        const _exhaustive: never = ev
        return _exhaustive
      }
    }
  }

  it('UserApproved を narrow', () => {
    const ev: AllEvents = {
      eventType: 'UserApproved',
      occurredAt,
      payload: { userId: 'u-1', approvedBy: 'a-1' },
    }
    expect(handleEvent(ev)).toBe('user:u-1')
  })

  it('BotCreated を narrow', () => {
    const ev: AllEvents = {
      eventType: 'BotCreated',
      occurredAt,
      payload: {
        botId: 'b-1',
        meetingUrl: 'https://meet.google.com/abc',
        platform: 'google_meet',
        region: 'eu-west-1',
      },
    }
    expect(handleEvent(ev)).toBe('bot:b-1@google_meet')
  })

  it('AuditLogCreated を narrow', () => {
    const ev: AllEvents = {
      eventType: 'AuditLogCreated',
      occurredAt,
      payload: { auditLogId: 'a-1', actorId: 'admin-1', action: 'role.change' },
    }
    expect(handleEvent(ev)).toBe('audit:role.change')
  })

  it('AllEvents union covers exactly 9 event types', () => {
    type EventTypeLiteral = AllEvents['eventType']
    // 9 件 union の完全列挙を type で固定
    expectTypeOf<EventTypeLiteral>().toEqualTypeOf<
      | 'UserApproved'
      | 'UserRoleChanged'
      | 'BotCreated'
      | 'BotStatusChanged'
      | 'RecordingReady'
      | 'TranscriptArrived'
      | 'CalendarEventScheduled'
      | 'WebhookReceived'
      | 'AuditLogCreated'
    >()
  })
})

describe('EVENT_TYPES runtime registry', () => {
  it('lists all 9 event type names in draft 06 order', () => {
    expect(EVENT_TYPES).toEqual([
      'UserApproved',
      'UserRoleChanged',
      'BotCreated',
      'BotStatusChanged',
      'RecordingReady',
      'TranscriptArrived',
      'CalendarEventScheduled',
      'WebhookReceived',
      'AuditLogCreated',
    ])
  })

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(EVENT_TYPES)).toBe(true)
  })

  it('EventTypeName matches AllEvents discriminant', () => {
    const sample: EventTypeName = 'BotCreated'
    expect(EVENT_TYPES.includes(sample)).toBe(true)
    expectTypeOf<EventTypeName>().toEqualTypeOf<AllEvents['eventType']>()
  })
})
