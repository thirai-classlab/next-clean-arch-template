// src/lib/application/repositories/allowed-user.repository.ts
// AllowedUserRepository — persistence boundary for AllowedUser entities (draft 06 §1.4).

import type { AllowedUser } from '@/lib/domain/entities'
import type { Email } from '@/lib/domain/value-objects/email'
import type {
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'
import type { Result } from '../result'

export interface AllowedUserRepository {
  findByEmail(email: Email): Promise<Result<AllowedUser, NotFoundError>>
  findAll(): Promise<ReadonlyArray<AllowedUser>>
  save(
    allowedUser: AllowedUser,
  ): Promise<Result<AllowedUser, ConflictError | ExternalServiceError>>
  delete(id: string): Promise<Result<void, NotFoundError>>
}
