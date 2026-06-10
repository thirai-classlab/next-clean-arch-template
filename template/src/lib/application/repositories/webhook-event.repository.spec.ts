// src/lib/application/repositories/webhook-event.repository.spec.ts
// Type-level test for WebhookEventRepository interface shape (draft 06 §1.4 L502-507).

import { describe, it, expectTypeOf } from 'vitest'
import type { WebhookEventRepository } from './webhook-event.repository'
import type { WebhookEvent } from '@/lib/domain/entities'
import type { Result } from '../result'
import type {
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('WebhookEventRepository (interface shape)', () => {
  it('exposes findByIdempotencyKey(key) -> Promise<Result<WebhookEvent, NotFoundError>>', () => {
    expectTypeOf<WebhookEventRepository['findByIdempotencyKey']>().toEqualTypeOf<
      (key: string) => Promise<Result<WebhookEvent, NotFoundError>>
    >()
  })

  it('exposes save(event) -> Promise<Result<WebhookEvent, ConflictError | ExternalServiceError>>', () => {
    expectTypeOf<WebhookEventRepository['save']>().toEqualTypeOf<
      (
        event: WebhookEvent,
      ) => Promise<Result<WebhookEvent, ConflictError | ExternalServiceError>>
    >()
  })

  it('exposes markProcessed(id) -> Promise<Result<void, NotFoundError>>', () => {
    expectTypeOf<WebhookEventRepository['markProcessed']>().toEqualTypeOf<
      (id: string) => Promise<Result<void, NotFoundError>>
    >()
  })
})
