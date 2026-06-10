// src/lib/application/repositories/webhook-event.repository.ts
// WebhookEventRepository — persistence boundary for WebhookEvent entities (draft 06 §1.4).
// `findByIdempotencyKey` powers safe retries; `markProcessed` finalises a consumed event.

import type { WebhookEvent } from '@/lib/domain/entities'
import type {
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'
import type { Result } from '../result'

export interface WebhookEventRepository {
  findByIdempotencyKey(key: string): Promise<Result<WebhookEvent, NotFoundError>>
  save(
    event: WebhookEvent,
  ): Promise<Result<WebhookEvent, ConflictError | ExternalServiceError>>
  markProcessed(id: string): Promise<Result<void, NotFoundError>>
}
