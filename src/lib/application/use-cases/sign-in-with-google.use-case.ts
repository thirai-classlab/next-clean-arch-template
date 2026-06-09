// src/lib/application/use-cases/sign-in-with-google.use-case.ts
// Draft 06 §1.4 Auth#1 / auth-login-strategy §Step 3.
//
// Resolves the Google OAuth entry point through AuthPort. The UseCase is a thin
// pass-through to AuthPort.signInWithGoogle():
//   - real (SupabaseAuthAdapter): returns the provider OAuth URL to redirect to.
//   - MOCK (MockAuthAdapter): returns a placeholder `redirectUrl`, but the Step 3
//     Server Action ignores it for MOCK and establishes the session directly via
//     a `mock_session` cookie + redirect('/') (code-architect LOW-R3-1).
//
// Session establishment (cookie set) is NOT done here — it is the responsibility
// of the Interfaces-layer Server Action (H-1 / H-R2-2).

import type { AuthPort } from '../ports/auth.port'
import type { Result } from '../result'
import type { ExternalServiceError } from '@/lib/domain/errors'

export interface SignInWithGoogleOutput {
  readonly redirectUrl: string
}

export class SignInWithGoogleUseCase {
  constructor(private readonly authPort: AuthPort) {}

  async execute(): Promise<Result<SignInWithGoogleOutput, ExternalServiceError>> {
    return this.authPort.signInWithGoogle()
  }
}
