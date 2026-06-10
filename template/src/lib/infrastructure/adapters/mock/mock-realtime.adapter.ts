// src/lib/infrastructure/adapters/mock/mock-realtime.adapter.ts
// In-memory pub/sub fan-out keyed by channel.

import { injectable } from 'tsyringe'
import type { RealtimePort } from '../../../application/ports/realtime.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

type Handler = (payload: unknown) => void

@injectable()
export class MockRealtimeAdapter implements RealtimePort {
  private subs = new Map<string, Set<Handler>>()

  async publish<T>(
    channel: string,
    payload: T,
  ): Promise<Result<void, ExternalServiceError>> {
    const handlers = this.subs.get(channel)
    if (handlers) for (const h of handlers) h(payload)
    return ok(undefined as void)
  }

  async subscribe<T>(
    channel: string,
    handler: (payload: T) => void,
  ): Promise<Result<() => void, ExternalServiceError>> {
    const set = this.subs.get(channel) ?? new Set<Handler>()
    const wrapped: Handler = (p) => handler(p as T)
    set.add(wrapped)
    this.subs.set(channel, set)
    return ok(() => set.delete(wrapped))
  }
}
