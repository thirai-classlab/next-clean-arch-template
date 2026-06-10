// src/lib/application/ports/auth.port.ts
// AuthPort — abstracts sign-in / token verification / session retrieval.
// Implementations: SupabaseAuthAdapter (real) / MockAuthAdapter (POC).

import type { Result } from '../result'
import type { Role } from '../../domain/value-objects/role'
import type {
  AuthorizationError,
  ExternalServiceError,
} from '../../domain/errors'

export interface AuthPort {
  verifyToken(
    token: string,
  ): Promise<Result<{ userId: string; role: Role }, AuthorizationError>>
  // Verifies email/password credentials and resolves the caller's role.
  // Returns the session payload only — session establishment (cookie set) is the
  // responsibility of the Step 3 Server Action, not the adapter (M-R3-3).
  // Credential mismatch → AuthorizationError; provider outage → ExternalServiceError (H-2).
  signInWithPassword(
    email: string,
    password: string,
  ): Promise<
    Result<{ userId: string; role: Role }, AuthorizationError | ExternalServiceError>
  >
  signInWithGoogle(): Promise<Result<{ redirectUrl: string }, ExternalServiceError>>
  signOut(userId: string): Promise<Result<void, ExternalServiceError>>
  getSession(): Promise<
    Result<{ userId: string; role: Role } | null, ExternalServiceError>
  >
}
