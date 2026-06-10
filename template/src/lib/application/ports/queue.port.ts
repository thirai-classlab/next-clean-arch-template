// src/lib/application/ports/queue.port.ts
// QueuePort — abstracts background-job enqueue (Vercel Queue / BullMQ).
// Workers consume jobs out of band; this port only enqueues.

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

export interface QueuePort {
  enqueue<T>(
    queue: string,
    payload: T,
    options?: { delayMs?: number; maxRetries?: number },
  ): Promise<Result<{ jobId: string }, ExternalServiceError>>
}
