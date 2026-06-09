// src/lib/application/use-cases/sign-in-with-password.use-case.ts
// auth-login-strategy §Step 3 — email + password sign-in (H-R2-2).
//
// Responsibility boundary (H-R2-2 / M-R3-3): this UseCase verifies the credential
// and resolves the caller's role ONLY. Session establishment (the `mock_session`
// cookie / Supabase session) is performed by the Step 3 Server Action in the
// Interfaces layer, never here and never inside the adapter.
//
// The password is passed straight through to AuthPort.signInWithPassword and is
// not retained, logged, or serialised by this UseCase (H-4).

import type { AuthPort } from '../ports/auth.port'
import type { Result } from '../result'
import type { Role } from '@/lib/domain/value-objects/role'
import type {
  AuthorizationError,
  ExternalServiceError,
} from '@/lib/domain/errors'

export interface SignInWithPasswordInput {
  readonly email: string
  readonly password: string
}

export interface SignInWithPasswordOutput {
  readonly userId: string
  readonly role: Role
}

export class SignInWithPasswordUseCase {
  constructor(private readonly authPort: AuthPort) {}

  async execute(
    input: SignInWithPasswordInput,
  ): Promise<
    Result<SignInWithPasswordOutput, AuthorizationError | ExternalServiceError>
  > {
    return this.authPort.signInWithPassword(input.email, input.password)
  }
}
