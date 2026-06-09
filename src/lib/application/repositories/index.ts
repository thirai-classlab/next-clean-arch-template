// src/lib/application/repositories/index.ts
// Barrel for the 8 Repository interfaces + DI tokens (draft 06 §1.4).

export type { UserRepository } from './user.repository'
export type { BotRepository } from './bot.repository'
export type { RecordingRepository } from './recording.repository'
export type { TranscriptRepository } from './transcript.repository'
export type { CalendarEventRepository } from './calendar-event.repository'
export type { WebhookEventRepository } from './webhook-event.repository'
export type { AuditLogRepository } from './audit-log.repository'
export type { AllowedUserRepository } from './allowed-user.repository'

export { REPOSITORY_TOKENS, type RepositoryToken } from './tokens'
