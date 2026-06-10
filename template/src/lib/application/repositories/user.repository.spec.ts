// src/lib/application/repositories/user.repository.spec.ts
// Type-level test for UserRepository interface shape (draft 06 §1.4 L464-471).

import { describe, it, expectTypeOf } from 'vitest'
import type { UserRepository } from './user.repository'
import type { User } from '@/lib/domain/entities'
import type { Email } from '@/lib/domain/value-objects/email'
import type { Result } from '../result'
import type {
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'

describe('UserRepository (interface shape)', () => {
  it('exposes findById(id) -> Promise<Result<User, NotFoundError>>', () => {
    expectTypeOf<UserRepository['findById']>().toEqualTypeOf<
      (id: string) => Promise<Result<User, NotFoundError>>
    >()
  })

  it('exposes findByEmail(email) -> Promise<Result<User, NotFoundError>>', () => {
    expectTypeOf<UserRepository['findByEmail']>().toEqualTypeOf<
      (email: Email) => Promise<Result<User, NotFoundError>>
    >()
  })

  it('exposes findAll() -> Promise<ReadonlyArray<User>>', () => {
    expectTypeOf<UserRepository['findAll']>().toEqualTypeOf<
      () => Promise<ReadonlyArray<User>>
    >()
  })

  it('exposes findPending() -> Promise<ReadonlyArray<User>>', () => {
    expectTypeOf<UserRepository['findPending']>().toEqualTypeOf<
      () => Promise<ReadonlyArray<User>>
    >()
  })

  it('exposes save(user) -> Promise<Result<User, ConflictError | ExternalServiceError>>', () => {
    expectTypeOf<UserRepository['save']>().toEqualTypeOf<
      (user: User) => Promise<Result<User, ConflictError | ExternalServiceError>>
    >()
  })

  it('exposes delete(id) -> Promise<Result<void, NotFoundError>>', () => {
    expectTypeOf<UserRepository['delete']>().toEqualTypeOf<
      (id: string) => Promise<Result<void, NotFoundError>>
    >()
  })
})
