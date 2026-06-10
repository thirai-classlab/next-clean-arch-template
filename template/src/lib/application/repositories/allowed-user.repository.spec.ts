// src/lib/application/repositories/allowed-user.repository.spec.ts
// Type-level test for AllowedUserRepository interface shape (draft 06 §1.4 L516-522).

import { describe, it, expectTypeOf } from 'vitest'
import type { AllowedUserRepository } from './allowed-user.repository'
import type { AllowedUser } from '@/lib/domain/entities'
import type { Email } from '@/lib/domain/value-objects/email'
import type { Result } from '../result'
import type {
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('AllowedUserRepository (interface shape)', () => {
  it('exposes findByEmail(email) -> Promise<Result<AllowedUser, NotFoundError>>', () => {
    expectTypeOf<AllowedUserRepository['findByEmail']>().toEqualTypeOf<
      (email: Email) => Promise<Result<AllowedUser, NotFoundError>>
    >()
  })

  it('exposes findAll() -> Promise<ReadonlyArray<AllowedUser>>', () => {
    expectTypeOf<AllowedUserRepository['findAll']>().toEqualTypeOf<
      () => Promise<ReadonlyArray<AllowedUser>>
    >()
  })

  it('exposes save(allowedUser) -> Promise<Result<AllowedUser, ConflictError | ExternalServiceError>>', () => {
    expectTypeOf<AllowedUserRepository['save']>().toEqualTypeOf<
      (
        allowedUser: AllowedUser,
      ) => Promise<Result<AllowedUser, ConflictError | ExternalServiceError>>
    >()
  })

  it('exposes delete(id) -> Promise<Result<void, NotFoundError>>', () => {
    expectTypeOf<AllowedUserRepository['delete']>().toEqualTypeOf<
      (id: string) => Promise<Result<void, NotFoundError>>
    >()
  })
})
