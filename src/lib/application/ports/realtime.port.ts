// src/lib/application/ports/realtime.port.ts
// RealtimePort — abstracts realtime fan-out (WebSocket / Supabase Realtime).
// `subscribe` returns an unsubscribe function.

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export interface RealtimePort {
  publish<T>(
    channel: string,
    payload: T,
  ): Promise<Result<void, ExternalServiceError>>
  subscribe<T>(
    channel: string,
    handler: (payload: T) => void,
  ): Promise<Result<() => void, ExternalServiceError>>
}
