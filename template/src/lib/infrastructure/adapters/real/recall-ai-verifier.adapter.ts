// src/lib/infrastructure/adapters/real/recall-ai-verifier.adapter.ts
// Real WebhookVerifierPort adapter — HMAC-SHA256 constant-time signature
// verification for inbound Recall.ai webhooks. The hex-encoded signature is
// compared via `crypto.timingSafeEqual` to resist timing attacks (see Port doc).
//
// Wired by profile mapping (`PROFILE_ADAPTER_MAPPING.WebhookVerifierPort =
// 'RecallAiVerifierAdapter'`) and loaded lazily by container.ts. Without this
// file, `tryRegisterFromModule` would swallow MODULE_NOT_FOUND and Step 3
// webhook signature verification would silently bypass — see Step 7 SEC-A7-2.

import crypto from 'node:crypto'
import { injectable } from 'tsyringe'
import type { WebhookVerifierPort } from '../../../application/ports/webhook-verifier.port'
import { ok, err, type Result } from '../../../application/result'
import { AuthorizationError } from '../../../domain/errors'

const HEX_PATTERN = /^[0-9a-f]+$/i

@injectable()
export class RecallAiVerifierAdapter implements WebhookVerifierPort {
  verify(input: {
    rawBody: string
    signature: string
    secret: string
  }): Result<void, AuthorizationError> {
    const { rawBody, signature, secret } = input

    if (!secret) {
      return err(new AuthorizationError('webhook secret is required'))
    }
    if (!signature) {
      return err(new AuthorizationError('webhook signature is required'))
    }
    if (!HEX_PATTERN.test(signature)) {
      return err(new AuthorizationError('webhook signature must be hex-encoded'))
    }

    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex')

    const expectedBuf = Buffer.from(expectedHex, 'hex')
    const actualBuf = Buffer.from(signature, 'hex')

    // Length check guards against `timingSafeEqual`'s precondition that both
    // buffers share the same byte length. Returning here is still constant
    // time w.r.t. the buffer contents themselves.
    if (expectedBuf.length !== actualBuf.length) {
      return err(new AuthorizationError('webhook signature length mismatch'))
    }

    if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      return err(new AuthorizationError('webhook signature mismatch'))
    }

    return ok(undefined as void)
  }
}
