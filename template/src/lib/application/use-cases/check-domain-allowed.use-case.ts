// src/lib/application/use-cases/check-domain-allowed.use-case.ts
// Draft 06 §1.4 Auth#5 — verify e-mail (or domain) is in AllowedUser list.

import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface CheckDomainAllowedInput {
  readonly email: string
}

export class CheckDomainAllowedUseCase {
  constructor(private readonly allowedUserRepo: AllowedUserRepository) {}

  async execute(
    input: CheckDomainAllowedInput,
  ): Promise<Result<boolean, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
