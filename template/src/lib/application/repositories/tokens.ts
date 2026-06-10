// src/lib/application/repositories/tokens.ts
// DI tokens for Repository ports. Unique `Symbol.for(...)` identifiers so an
// Infrastructure-layer DI container (tsyringe / awilix / hand-rolled) can bind
// concrete adapters without leaking implementation imports into the Application layer.
// Token-only file — keep free of runtime logic.

export const REPOSITORY_TOKENS = Object.freeze({
  UserRepository: Symbol.for('recall_poc.UserRepository'),
  BotRepository: Symbol.for('recall_poc.BotRepository'),
  RecordingRepository: Symbol.for('recall_poc.RecordingRepository'),
  TranscriptRepository: Symbol.for('recall_poc.TranscriptRepository'),
  CalendarEventRepository: Symbol.for('recall_poc.CalendarEventRepository'),
  WebhookEventRepository: Symbol.for('recall_poc.WebhookEventRepository'),
  AuditLogRepository: Symbol.for('recall_poc.AuditLogRepository'),
  AllowedUserRepository: Symbol.for('recall_poc.AllowedUserRepository'),
} as const)

export type RepositoryToken =
  (typeof REPOSITORY_TOKENS)[keyof typeof REPOSITORY_TOKENS]
