// src/lib/application/use-cases/list-users.use-case.ts
// Draft 06 §1.4 Admin#1 — paginated User listing.

import type { UserRepository } from '../repositories/user.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { User } from '@/lib/domain/entities'
import { ok } from '../result'

export interface ListUsersInput {
  readonly page: number
  readonly limit: number
}

export interface ListUsersOutput {
  readonly users: ReadonlyArray<User>
  readonly total: number
}

export class ListUsersUseCase {
  constructor(private readonly userRepo: UserRepository) {}

  async execute(
    input: ListUsersInput,
  ): Promise<Result<ListUsersOutput, DomainError>> {
    const all = await this.userRepo.findAll()
    const total = all.length
    const start = (input.page - 1) * input.limit
    const users = all.slice(start, start + input.limit)
    return ok({ users, total })
  }
}
