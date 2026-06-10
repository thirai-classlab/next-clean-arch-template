// src/lib/application/use-cases/get-pending-users.use-case.ts
// Draft 06 §1.4 Auth#6 — list users with status PENDING.

import type { UserRepository } from '../repositories/user.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { User } from '@/lib/domain/entities'
import { ok } from '../result'

export class GetPendingUsersUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(): Promise<Result<ReadonlyArray<User>, DomainError>> {
    const users = await this.userRepo.findPending()
    return ok(users)
  }
}
