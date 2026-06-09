// src/lib/application/use-cases/handle-oauth-callback.use-case.ts
// Draft 06 §1.4 Auth#2 — exchange OAuth code, ensure user exists + domain-allowed.
//
// @deprecated DEAD CODE — intentionally unused (auth-login-strategy §Step 3,
// design decision H-5 / M-R2-3). The real OAuth callback (`app/auth/callback/
// route.ts`) calls the Supabase SDK directly (`exchangeCodeForSession`) rather
// than routing through this UseCase, so this class is NOT wired into a factory
// and NOT resolved via DI. It is retained (not deleted) pending a separate
// decision; do not add it to use-case-factories.ts or container.ts.

import type { AuthPort } from '../ports/auth.port'
import type { UserRepository } from '../repositories/user.repository'
import type { AllowedUserRepository } from '../repositories/allowed-user.repository'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'
import type { Role } from '@/lib/domain/value-objects/role'
import { err } from '../result'
import { ExternalServiceError } from '@/lib/domain/errors'

export interface HandleOAuthCallbackInput {
  readonly code: string
  readonly state: string
}

export interface HandleOAuthCallbackOutput {
  readonly userId: string
  readonly role: Role
}

export class HandleOAuthCallbackUseCase {
  constructor(
    private readonly authPort: AuthPort,
    private readonly userRepo: UserRepository,
    private readonly allowedUserRepo: AllowedUserRepository,
  ) {}

  async execute(
    input: HandleOAuthCallbackInput,
  ): Promise<Result<HandleOAuthCallbackOutput, DomainError>> {
    return err(new ExternalServiceError('not implemented: Step 3', null))
  }
}
