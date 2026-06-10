// src/lib/application/use-cases/get-current-user.use-case.ts
// Draft 06 §1.4 Auth#4 — fetch User by id (current session).

import type { UserRepository } from '../repositories/user.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { User } from '@/lib/domain/entities'

export interface GetCurrentUserInput {
  readonly userId: string
}

export class GetCurrentUserUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(input: GetCurrentUserInput): Promise<Result<User, DomainError>> {
    return this.userRepo.findById(input.userId)
  }
}
