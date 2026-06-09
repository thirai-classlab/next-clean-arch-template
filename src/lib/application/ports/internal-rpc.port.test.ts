import { describe, it, expectTypeOf } from 'vitest'
import type { InternalRpcPort } from './internal-rpc.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('InternalRpcPort (type-level)', () => {
  it('call: <TReq,TRes>(input) => Promise<Result<TRes, ExternalServiceError>>', () => {
    expectTypeOf<InternalRpcPort['call']>().toEqualTypeOf<
      <TReq, TRes>(input: {
        service: string
        method: string
        payload: TReq
      }) => Promise<Result<TRes, ExternalServiceError>>
    >()
  })
})
