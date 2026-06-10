import { describe, it, expectTypeOf } from 'vitest'
import type { RealtimePort } from './realtime.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('RealtimePort (type-level)', () => {
  it('publish: <T>(channel, payload) => Promise<Result<void, ExternalServiceError>>', () => {
    expectTypeOf<RealtimePort['publish']>().toEqualTypeOf<
      <T>(channel: string, payload: T) => Promise<Result<void, ExternalServiceError>>
    >()
  })

  it('subscribe: <T>(channel, handler) => Promise<Result<unsubscribe, ExternalServiceError>>', () => {
    expectTypeOf<RealtimePort['subscribe']>().toEqualTypeOf<
      <T>(
        channel: string,
        handler: (payload: T) => void,
      ) => Promise<Result<() => void, ExternalServiceError>>
    >()
  })
})
