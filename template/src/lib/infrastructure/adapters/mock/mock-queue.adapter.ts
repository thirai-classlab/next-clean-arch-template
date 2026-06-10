// src/lib/infrastructure/adapters/mock/mock-queue.adapter.ts
// In-memory FIFO queue keyed by queue name. peek() exposes state for tests.

import { injectable } from 'tsyringe'
import type { QueuePort } from '../../../application/ports/queue.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

interface QueuedJob {
  readonly jobId: string
  readonly payload: unknown
  readonly delayMs?: number
  readonly maxRetries?: number
}

@injectable()
export class MockQueueAdapter implements QueuePort {
  private queues = new Map<string, QueuedJob[]>()
  private counter = 0

  async enqueue<T>(
    queue: string,
    payload: T,
    options?: { delayMs?: number; maxRetries?: number },
  ): Promise<Result<{ jobId: string }, ExternalServiceError>> {
    const jobId = `mock-job-${++this.counter}`
    const list = this.queues.get(queue) ?? []
    list.push({ jobId, payload, ...options })
    this.queues.set(queue, list)
    return ok({ jobId })
  }

  peek(queue: string): ReadonlyArray<QueuedJob> {
    return this.queues.get(queue) ?? []
  }
}
