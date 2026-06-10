// src/lib/domain/events/index.ts
// Domain Event 一覧 — draft 06 §1.4 L301-356 準拠 (9 concrete event + AllEvents union)。
// 各 Event は DomainEvent<T, P> base type を特化し、payload を closed structural type で定義。
// Entity の id 系 field は string 型で参照 (Entity import なし、Subagent B との依存解消)。

import type { DomainEvent } from './domain-event'
import type { Role } from '@/lib/domain/value-objects/role'
import type { BotStatus } from '@/lib/domain/value-objects/bot-status'
import type { MeetingPlatform } from '@/lib/domain/value-objects/meeting-platform'
import type { Region } from '@/lib/domain/value-objects/region'

// ─── User 系 ─────────────────────────────────────────────────────────────────

export type UserApprovedEvent = DomainEvent<
  'UserApproved',
  { userId: string; approvedBy: string }
>

export type UserRoleChangedEvent = DomainEvent<
  'UserRoleChanged',
  { userId: string; oldRole: Role; newRole: Role; changedBy: string }
>

// ─── Bot / Recording / Transcript 系 ─────────────────────────────────────────

export type BotCreatedEvent = DomainEvent<
  'BotCreated',
  { botId: string; meetingUrl: string; platform: MeetingPlatform; region: Region }
>

export type BotStatusChangedEvent = DomainEvent<
  'BotStatusChanged',
  { botId: string; oldStatus: BotStatus; newStatus: BotStatus }
>

export type RecordingReadyEvent = DomainEvent<
  'RecordingReady',
  { botId: string; recordingId: string; durationSecs: number }
>

export type TranscriptArrivedEvent = DomainEvent<
  'TranscriptArrived',
  { botId: string; transcriptId: string; speakerId: string | null; wordCount: number }
>

// ─── Calendar / Webhook / Audit 系 ───────────────────────────────────────────

export type CalendarEventScheduledEvent = DomainEvent<
  'CalendarEventScheduled',
  { calendarEventId: string; platform: MeetingPlatform; startAt: Date }
>

export type WebhookReceivedEvent = DomainEvent<
  'WebhookReceived',
  { webhookEventId: string; eventType: string; idempotencyKey: string }
>

export type AuditLogCreatedEvent = DomainEvent<
  'AuditLogCreated',
  { auditLogId: string; actorId: string; action: string }
>

// ─── Discriminated union ─────────────────────────────────────────────────────

export type AllEvents =
  | UserApprovedEvent
  | UserRoleChangedEvent
  | BotCreatedEvent
  | BotStatusChangedEvent
  | RecordingReadyEvent
  | TranscriptArrivedEvent
  | CalendarEventScheduledEvent
  | WebhookReceivedEvent
  | AuditLogCreatedEvent

// ─── Runtime event-type registry ─────────────────────────────────────────────
// 9 Event の eventType 文字列を一箇所に集約。EventBus の subscriber 登録時 /
// switch 文の case 値として参照され、typo を実行時に検知できる。
export const EVENT_TYPES = Object.freeze([
  'UserApproved',
  'UserRoleChanged',
  'BotCreated',
  'BotStatusChanged',
  'RecordingReady',
  'TranscriptArrived',
  'CalendarEventScheduled',
  'WebhookReceived',
  'AuditLogCreated',
] as const)
export type EventTypeName = (typeof EVENT_TYPES)[number]

// base type も合わせて re-export (consumer の便宜)
export type { DomainEvent } from './domain-event'
