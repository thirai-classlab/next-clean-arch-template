// src/lib/domain/entities/webhook-event.ts
// WebhookEvent entity — inbound webhook received from Recall.ai.
// `processedAt` is null until the event has been consumed by a handler.
// `idempotencyKey` allows safe retries without double-processing.

export interface WebhookEvent {
  readonly id: string
  readonly eventType: string
  readonly payload: Readonly<Record<string, unknown>>
  readonly processedAt: Date | null
  readonly idempotencyKey: string
}
