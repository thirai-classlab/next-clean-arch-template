import { describe, it, expectTypeOf } from 'vitest'
import type { WebhookVerifierPort } from './webhook-verifier.port'
import type { Result } from '../result'
import type { AuthorizationError } from '../../domain/errors'

describe('WebhookVerifierPort (type-level)', () => {
  it('verify: (input) => Result<void, AuthorizationError> (synchronous)', () => {
    expectTypeOf<WebhookVerifierPort['verify']>().toEqualTypeOf<
      (input: {
        rawBody: string
        signature: string
        secret: string
      }) => Result<void, AuthorizationError>
    >()
  })
})
