import { describe, it, expectTypeOf } from 'vitest'
import type { DbPort } from './db.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

describe('DbPort (type-level)', () => {
  it('withTransaction: <T>(fn) => Promise<Result<T, ExternalServiceError>>', () => {
    expectTypeOf<DbPort['withTransaction']>().toEqualTypeOf<
      <T>(
        fn: () => Promise<Result<T, ExternalServiceError>>,
      ) => Promise<Result<T, ExternalServiceError>>
    >()
  })
})
