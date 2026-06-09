import { describe, it, expectTypeOf } from 'vitest'
import type { AuthPort } from './auth.port'
import type { Result } from '../result'
import type { Role } from '../../domain/value-objects/role'
import type {
  AuthorizationError,
  ExternalServiceError,
} from '../../domain/errors'

describe('AuthPort (type-level)', () => {
  it('verifyToken: (string) => Promise<Result<{userId,role}, AuthorizationError>>', () => {
    expectTypeOf<AuthPort['verifyToken']>().toEqualTypeOf<
      (token: string) => Promise<Result<{ userId: string; role: Role }, AuthorizationError>>
    >()
  })

  it('signInWithGoogle: () => Promise<Result<{redirectUrl}, ExternalServiceError>>', () => {
    expectTypeOf<AuthPort['signInWithGoogle']>().toEqualTypeOf<
      () => Promise<Result<{ redirectUrl: string }, ExternalServiceError>>
    >()
  })

  it('signOut: (userId) => Promise<Result<void, ExternalServiceError>>', () => {
    expectTypeOf<AuthPort['signOut']>().toEqualTypeOf<
      (userId: string) => Promise<Result<void, ExternalServiceError>>
    >()
  })

  it('getSession: () => Promise<Result<session|null, ExternalServiceError>>', () => {
    expectTypeOf<AuthPort['getSession']>().toEqualTypeOf<
      () => Promise<
        Result<{ userId: string; role: Role } | null, ExternalServiceError>
      >
    >()
  })
})
