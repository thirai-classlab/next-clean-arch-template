// src/lib/application/ports/webhook-verifier.port.ts
// WebhookVerifierPort — abstracts HMAC-SHA256 signature verification for
// inbound Recall.ai webhooks. `verify` must be constant-time to resist
// timing attacks (adapter responsibility).

import type { Result } from '../result'
import type { AuthorizationError } from '../../domain/errors'

export interface WebhookVerifierPort {
  verify(input: {
    rawBody: string
    signature: string
    secret: string
  }): Result<void, AuthorizationError>
}
