// src/lib/infrastructure/adapters/mock/mock-webhook-verifier.adapter.ts
// Accepts only the literal signature `mock-valid`.

import { injectable } from 'tsyringe'
import type { WebhookVerifierPort } from '../../../application/ports/webhook-verifier.port'
import { ok, err, type Result } from '../../../application/result'
import { AuthorizationError } from '../../../domain/errors'

@injectable()
export class MockWebhookVerifierAdapter implements WebhookVerifierPort {
  verify(input: {
    rawBody: string
    signature: string
    secret: string
  }): Result<void, AuthorizationError> {
    if (input.signature === 'mock-valid') return ok(undefined as void)
    return err(new AuthorizationError('invalid mock signature'))
  }
}
