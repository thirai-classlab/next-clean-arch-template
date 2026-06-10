import { describe, it, expectTypeOf } from 'vitest'
import type { StoragePort } from './storage.port'
import type { Result } from '../result'
import type { ExternalServiceError, NotFoundError } from '../../domain/errors'

describe('StoragePort (type-level)', () => {
  it('upload: (bucket, key, data) => Promise<Result<{key}, ExternalServiceError>>', () => {
    expectTypeOf<StoragePort['upload']>().toEqualTypeOf<
      (
        bucket: string,
        key: string,
        data: Uint8Array,
      ) => Promise<Result<{ key: string }, ExternalServiceError>>
    >()
  })

  it('getSignedUrl: (bucket, key, expiresInSec) => Promise<Result<{url,expiresAt}, NotFoundError|ExternalServiceError>>', () => {
    expectTypeOf<StoragePort['getSignedUrl']>().toEqualTypeOf<
      (
        bucket: string,
        key: string,
        expiresInSec: number,
      ) => Promise<
        Result<{ url: string; expiresAt: Date }, NotFoundError | ExternalServiceError>
      >
    >()
  })

  it('delete: (bucket, key) => Promise<Result<void, NotFoundError|ExternalServiceError>>', () => {
    expectTypeOf<StoragePort['delete']>().toEqualTypeOf<
      (
        bucket: string,
        key: string,
      ) => Promise<Result<void, NotFoundError | ExternalServiceError>>
    >()
  })
})
