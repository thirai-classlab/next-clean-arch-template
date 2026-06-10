import { describe, it, expectTypeOf } from 'vitest'
import type { QueuePort } from './queue.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('QueuePort (type-level)', () => {
  it('enqueue: <T>(queue, payload, options?) => Promise<Result<{jobId}, ExternalServiceError>>', () => {
    expectTypeOf<QueuePort['enqueue']>().toEqualTypeOf<
      <T>(
        queue: string,
        payload: T,
        options?: { delayMs?: number; maxRetries?: number },
      ) => Promise<Result<{ jobId: string }, ExternalServiceError>>
    >()
  })
})
