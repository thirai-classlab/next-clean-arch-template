// src/lib/infrastructure/repositories/in-memory/in-memory-webhook-event.repository.ts
// In-memory WebhookEventRepository — draft 06 §3 minimal Profile persistence.
// Conflict semantics: `save` returns ConflictError when a *different* event id
// already claims the same idempotencyKey (the at-least-once delivery key).
// `markProcessed` flips processedAt to now() in an immutable way.
import 'reflect-metadata'
import { injectable } from 'tsyringe'
import type { WebhookEventRepository } from '@/lib/application/repositories'
import { ok, err, type Result } from '@/lib/application/result'
import type { WebhookEvent } from '@/lib/domain/entities'
import {
  ConflictError,
  ExternalServiceError,
  NotFoundError,
} from '@/lib/domain/errors'
import { InMemoryRepositoryBase } from './in-memory-base'

@injectable()
export class InMemoryWebhookEventRepository
  extends InMemoryRepositoryBase<WebhookEvent>
  implements WebhookEventRepository
{
  async findByIdempotencyKey(
    key: string,
  ): Promise<Result<WebhookEvent, NotFoundError>> {
    for (const event of this.store.values()) {
      if (event.idempotencyKey === key) return ok(event)
    }
    return err(new NotFoundError('WebhookEvent', `idempotencyKey=${key}`))
  }

  async save(
    event: WebhookEvent,
  ): Promise<Result<WebhookEvent, ConflictError | ExternalServiceError>> {
    for (const existing of this.store.values()) {
      if (
        existing.id !== event.id &&
        existing.idempotencyKey === event.idempotencyKey
      ) {
        return err(
          new ConflictError(
            `webhook idempotencyKey ${event.idempotencyKey} already received`,
          ),
        )
      }
    }
    return ok(this.putById(event))
  }

  async markProcessed(id: string): Promise<Result<void, NotFoundError>> {
    const existing = this.getById(id)
    if (!existing) return err(new NotFoundError('WebhookEvent', id))
    const updated: WebhookEvent = { ...existing, processedAt: new Date() }
    this.putById(updated)
    return ok(undefined)
  }
}
