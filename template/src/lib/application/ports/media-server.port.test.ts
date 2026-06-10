import { describe, it, expectTypeOf } from 'vitest'
import type { MediaServerPort } from './media-server.port'
import type { Result } from '../result'
import type { ExternalServiceError, NotFoundError } from '../../domain/errors'

describe('MediaServerPort (type-level)', () => {
  it('createRoom: (input) => Promise<Result<{roomId,joinUrl}, ExternalServiceError>>', () => {
    expectTypeOf<MediaServerPort['createRoom']>().toEqualTypeOf<
      (input: { name: string }) => Promise<
        Result<{ roomId: string; joinUrl: string }, ExternalServiceError>
      >
    >()
  })

  it('closeRoom: (roomId) => Promise<Result<void, NotFoundError|ExternalServiceError>>', () => {
    expectTypeOf<MediaServerPort['closeRoom']>().toEqualTypeOf<
      (
        roomId: string,
      ) => Promise<Result<void, NotFoundError | ExternalServiceError>>
    >()
  })
})
