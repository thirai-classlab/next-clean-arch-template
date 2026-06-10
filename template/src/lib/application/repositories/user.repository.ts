// src/lib/application/repositories/user.repository.ts
// UserRepository — persistence boundary for the User aggregate root (draft 06 §1.4).
// Implementations live in the Infrastructure layer.

import type { User } from '@/lib/domain/entities'
import type { Email } from '@/lib/domain/value-objects/email'
import type {
  NotFoundError,
  ConflictError,
  ExternalServiceError,
} from '@/lib/domain/errors'
import type { Result } from '../result'

export interface UserRepository {
  findById(id: string): Promise<Result<User, NotFoundError>>
  findByEmail(email: Email): Promise<Result<User, NotFoundError>>
  findAll(): Promise<ReadonlyArray<User>>
  findPending(): Promise<ReadonlyArray<User>>
  save(user: User): Promise<Result<User, ConflictError | ExternalServiceError>>
  delete(id: string): Promise<Result<void, NotFoundError>>
}
