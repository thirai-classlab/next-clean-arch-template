// src/lib/infrastructure/repositories/in-memory/index.ts
// Barrel for the 8 in-memory Repository implementations (Wave 5-I, draft 06 §3
// minimal Profile = in-memory persistence).
export { InMemoryRepositoryBase } from './in-memory-base'
export { InMemoryUserRepository } from './in-memory-user.repository'
export { InMemoryAllowedUserRepository } from './in-memory-allowed-user.repository'
export { InMemoryBotRepository } from './in-memory-bot.repository'
export { InMemoryRecordingRepository } from './in-memory-recording.repository'
export { InMemoryTranscriptRepository } from './in-memory-transcript.repository'
export { InMemoryCalendarEventRepository } from './in-memory-calendar-event.repository'
export { InMemoryWebhookEventRepository } from './in-memory-webhook-event.repository'
export { InMemoryAuditLogRepository } from './in-memory-audit-log.repository'
