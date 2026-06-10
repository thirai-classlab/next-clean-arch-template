// src/lib/infrastructure/adapters/mock/mock-webhook-verifier.adapter.spec.ts
import 'reflect-metadata'
import { describe, it, expect, beforeEach } from 'vitest'
import { MockWebhookVerifierAdapter } from './mock-webhook-verifier.adapter'
import { AuthorizationError } from '../../../domain/errors'

describe('MockWebhookVerifierAdapter', () => {
  let adapter: MockWebhookVerifierAdapter

  beforeEach(() => {
    adapter = new MockWebhookVerifierAdapter()
  })

  it('verify returns ok when signature equals "mock-valid"', () => {
    const r = adapter.verify({ rawBody: 'b', signature: 'mock-valid', secret: 's' })
    expect(r.ok).toBe(true)
  })

  it('verify returns AuthorizationError for any other signature', () => {
    const r = adapter.verify({ rawBody: 'b', signature: 'bad', secret: 's' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toBeInstanceOf(AuthorizationError)
  })
})
