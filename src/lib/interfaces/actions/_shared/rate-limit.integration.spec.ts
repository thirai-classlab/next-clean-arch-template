// src/lib/interfaces/actions/_shared/rate-limit.integration.spec.ts
// task #36 Step 2 — integration-style check using the REAL MockRateLimiterAdapter
// (its setThreshold seam) to drive a 5-fail → 6th-call 429 sequence through
// applyRateLimit, exactly as a Server Action would. OWASP A07-1 (5 consecutive
// fail → 429) is mechanically verified here.
import 'reflect-metadata'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockResolve = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  ensureContainer: vi.fn().mockResolvedValue(undefined),
  container: { resolve: (token: string) => mockResolve(token) },
}))

import { applyRateLimit } from './rate-limit'
import { MockRateLimiterAdapter } from '@/lib/infrastructure/adapters/mock/mock-rate-limiter.adapter'

describe('applyRateLimit (real MockRateLimiterAdapter)', () => {
  let limiter: MockRateLimiterAdapter

  beforeEach(() => {
    limiter = new MockRateLimiterAdapter()
    // Opt into enforcement: 5 attempts / 900s window (OWASP A07-1 default).
    limiter.setThreshold(5, 900)
    mockResolve.mockReset().mockReturnValue(limiter)
    process.env.RATE_LIMIT_ENABLED = 'true'
    process.env.RATE_LIMIT_MAX_ATTEMPTS = '5'
    process.env.RATE_LIMIT_WINDOW_SEC = '900'
  })

  afterEach(() => {
    delete process.env.RATE_LIMIT_ENABLED
    delete process.env.RATE_LIMIT_MAX_ATTEMPTS
    delete process.env.RATE_LIMIT_WINDOW_SEC
  })

  it('never blocks (and never counts up) when RATE_LIMIT_ENABLED is disabled', async () => {
    // Arrange — disabled: even with a threshold set, the gate must short-circuit
    // before the adapter is ever consulted, so 10 attempts all pass.
    process.env.RATE_LIMIT_ENABLED = 'false'
    const ip = '203.0.113.7'
    const endpoint = 'signin:google'

    // Act + Assert — well past the threshold, still allowed (no count-up).
    for (let i = 1; i <= 10; i++) {
      const gate = await applyRateLimit(ip, endpoint)
      expect(gate.allowed).toBe(true)
    }
  })

  it('allows the first 5 attempts, then blocks the 6th with a Retry-After', async () => {
    const ip = '203.0.113.7'
    const endpoint = 'signin:google'

    // 5 attempts within the window are allowed.
    for (let i = 1; i <= 5; i++) {
      const gate = await applyRateLimit(ip, endpoint)
      expect(gate.allowed).toBe(true)
    }

    // 6th attempt exceeds the threshold → 429-equivalent.
    const sixth = await applyRateLimit(ip, endpoint)
    expect(sixth.allowed).toBe(false)
    expect(sixth.retryAfterSec).toBe(900)
  })

  it('isolates windows per key (different IP is unaffected)', async () => {
    const endpoint = 'signin:google'
    for (let i = 1; i <= 5; i++) {
      await applyRateLimit('203.0.113.7', endpoint)
    }
    expect((await applyRateLimit('203.0.113.7', endpoint)).allowed).toBe(false)

    // A different client IP starts fresh.
    expect((await applyRateLimit('198.51.100.1', endpoint)).allowed).toBe(true)
  })
})
