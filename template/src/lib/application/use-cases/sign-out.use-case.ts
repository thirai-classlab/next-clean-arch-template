// src/lib/application/use-cases/sign-out.use-case.ts
// Draft 06 §1.4 Auth#3 — terminate session for given userId.
//
// Clean arch: session 無効化 (AuthPort.signOut) のみを担う。HTTP cookie の失効は
// interface 層 (sign-out Route Handler / Server Action) の責務であり、ここでは行わない
// (auth.port.ts の signInWithPassword コメントと同じ責務分離方針)。

import type { AuthPort } from '../ports/auth.port'
import type { Result } from '../result'
import type { DomainError } from '@/lib/domain/errors'

export interface SignOutInput {
  readonly userId: string
}

export class SignOutUseCase {
  constructor(private readonly authPort: AuthPort) {}

  async execute(input: SignOutInput): Promise<Result<void, DomainError>> {
    // AuthPort.signOut() に session 無効化を委譲する。adapter (Supabase / Mock) が
    // ExternalServiceError を返した場合はそのまま伝播する (route 側で graceful 処理)。
    return this.authPort.signOut(input.userId)
  }
}
