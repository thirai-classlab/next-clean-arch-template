// src/lib/infrastructure/adapters/real/recall-ai-verifier.adapter.spec.ts
import 'reflect-metadata'
import crypto from 'node:crypto'
import { describe, it, expect, beforeEach } from 'vitest'
import { RecallAiVerifierAdapter } from './recall-ai-verifier.adapter'
import { AuthorizationError } from '../../../domain/errors'

const SECRET = 'whsec_test_recall_ai_signing_secret'
const PAYLOAD = '{"event":"bot.status_change","data":{"bot_id":"bot_123"}}'

const signHex = (rawBody: string, secret: string): string =>
  crypto.createHmac('sha256', secret).update(rawBody).digest('hex')

describe('RecallAiVerifierAdapter', () => {
  let adapter: RecallAiVerifierAdapter

  beforeEach(() => {
    adapter = new RecallAiVerifierAdapter()
  })

  it('returns ok for a valid HMAC-SHA256 hex signature', () => {
    const signature = signHex(PAYLOAD, SECRET)
    const result = adapter.verify({
      rawBody: PAYLOAD,
      signature,
      secret: SECRET,
    })
    expect(result.ok).toBe(true)
  })

  it('returns AuthorizationError when the payload is tampered', () => {
    const signature = signHex(PAYLOAD, SECRET)
    const tampered = PAYLOAD.replace('bot_123', 'bot_999')
    const result = adapter.verify({
      rawBody: tampered,
      signature,
      secret: SECRET,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })

  it('returns AuthorizationError when the signature was produced with a different secret', () => {
    const wrongSignature = signHex(PAYLOAD, 'whsec_wrong_secret')
    const result = adapter.verify({
      rawBody: PAYLOAD,
      signature: wrongSignature,
      secret: SECRET,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })

  it('returns AuthorizationError when the signature length differs (hex length mismatch)', () => {
    // 32 hex chars = 16 bytes, expected is 64 hex chars = 32 bytes
    const shortSignature = 'a'.repeat(32)
    const result = adapter.verify({
      rawBody: PAYLOAD,
      signature: shortSignature,
      secret: SECRET,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })

  it('returns AuthorizationError when the secret is empty', () => {
    const signature = signHex(PAYLOAD, SECRET)
    const result = adapter.verify({
      rawBody: PAYLOAD,
      signature,
      secret: '',
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })

  it('returns AuthorizationError when the signature is not hex-encoded', () => {
    const result = adapter.verify({
      rawBody: PAYLOAD,
      signature: 'not-a-hex-string!!',
      secret: SECRET,
    })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBeInstanceOf(AuthorizationError)
  })
})
