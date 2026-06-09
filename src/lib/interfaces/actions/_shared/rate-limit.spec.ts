// src/lib/interfaces/actions/_shared/rate-limit.spec.ts
// task #36 Step 2 / Step 5 — applyRateLimit / clearRateLimit behaviour:
//   - RATE_LIMIT_ENABLED != 'true' → skip check, allowed without counting up
//   - key = IP:endpoint (NO email)
//   - !allowed → propagated; allowed → propagated
//   - check() Result.err → fail-open (allowed:true) + WARN with 4 fields
//     (request_id is a 16-char crypto hex, not Math.random — SEC-1)
//   - reset() Result.err → ignored (fail-open) + WARN
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as loggerModule from '@/lib/infrastructure/logger'

const mockResolve = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  ensureContainer: vi.fn().mockResolvedValue(undefined),
  container: { resolve: (token: string) => mockResolve(token) },
}))

import { applyRateLimit, clearRateLimit } from './rate-limit'
import { ExternalServiceError } from '@/lib/domain/errors'

describe('applyRateLimit', () => {
  beforeEach(() => {
    mockResolve.mockReset()
    delete process.env.RATE_LIMIT_MAX_ATTEMPTS
    delete process.env.RATE_LIMIT_WINDOW_SEC
    // Most cases exercise the enabled path; the disabled-skip case overrides.
    process.env.RATE_LIMIT_ENABLED = 'true'
  })
  afterEach(() => {
    vi.restoreAllMocks()
    delete process.env.RATE_LIMIT_ENABLED
  })

  it('skips the check and allows (no count-up) when RATE_LIMIT_ENABLED is not "true"', async () => {
    // Arrange — disabled (schema default). The limiter must never be touched.
    process.env.RATE_LIMIT_ENABLED = 'false'
    const check = vi.fn()
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    // Act
    const gate = await applyRateLimit('203.0.113.7', 'signin:google')

    // Assert — allowed, and crucially check() (which counts up) is never called.
    expect(gate).toEqual({ allowed: true, retryAfterSec: 0 })
    expect(check).not.toHaveBeenCalled()
    expect(mockResolve).not.toHaveBeenCalled()
  })

  it('treats an unset RATE_LIMIT_ENABLED as disabled (skip, no count-up)', async () => {
    delete process.env.RATE_LIMIT_ENABLED
    const check = vi.fn()
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    const gate = await applyRateLimit('203.0.113.7', 'signin:google')

    expect(gate).toEqual({ allowed: true, retryAfterSec: 0 })
    expect(check).not.toHaveBeenCalled()
  })

  it('keys by IP:endpoint only (no email) and uses default thresholds', async () => {
    // Arrange
    const check = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { allowed: true, remaining: 4, retryAfterSec: 0 } })
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    // Act
    const gate = await applyRateLimit('203.0.113.7', 'signin:google')

    // Assert
    expect(gate).toEqual({ allowed: true, retryAfterSec: 0 })
    expect(check).toHaveBeenCalledWith('203.0.113.7:signin:google', {
      maxAttempts: 5,
      windowSec: 900,
    })
  })

  it('reads RATE_LIMIT_* env overrides for thresholds', async () => {
    // Arrange
    process.env.RATE_LIMIT_MAX_ATTEMPTS = '3'
    process.env.RATE_LIMIT_WINDOW_SEC = '60'
    const check = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { allowed: true, remaining: 2, retryAfterSec: 0 } })
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    // Act
    await applyRateLimit('1.2.3.4', 'signin:google')

    // Assert
    expect(check).toHaveBeenCalledWith('1.2.3.4:signin:google', {
      maxAttempts: 3,
      windowSec: 60,
    })
  })

  it('propagates !allowed with retryAfterSec', async () => {
    const check = vi
      .fn()
      .mockResolvedValue({ ok: true, value: { allowed: false, remaining: 0, retryAfterSec: 120 } })
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    const gate = await applyRateLimit('5.6.7.8', 'signin:google')

    expect(gate).toEqual({ allowed: false, retryAfterSec: 120 })
  })

  it('fail-open + WARN with 4 fields when check() returns Result.err', async () => {
    // Arrange — spy on pino logger.warn (rate-limit now uses structured logging).
    const warn = vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined)
    const check = vi
      .fn()
      .mockResolvedValue({ ok: false, error: new ExternalServiceError('upstash', null) })
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    // Act
    const gate = await applyRateLimit('9.9.9.9', 'signin:google')

    // Assert — backend down must not block the user.
    expect(gate).toEqual({ allowed: true, retryAfterSec: 0 })
    expect(warn).toHaveBeenCalledTimes(1)
    // logger.warn(obj, msg) — first arg is the structured object.
    const obj = warn.mock.calls[0][0] as Record<string, unknown>
    expect(obj).toMatchObject({
      event: 'fail-open',
      errorType: 'ExternalServiceError',
      key: '9.9.9.9:signin:google',
    })
    // request_id is a 16-char crypto hex (randomBytes(8)), not Math.random (SEC-1).
    expect(obj['request_id']).toMatch(/^[0-9a-f]{16}$/)
  })

  it('emits a fresh, unpredictable request_id per fail-open event (SEC-1)', async () => {
    // Arrange — spy on pino logger.warn.
    const warn = vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined)
    const check = vi
      .fn()
      .mockResolvedValue({ ok: false, error: new ExternalServiceError('upstash', null) })
    mockResolve.mockReturnValue({ check, reset: vi.fn() })

    // Act — two fail-open events.
    await applyRateLimit('9.9.9.9', 'signin:google')
    await applyRateLimit('9.9.9.9', 'signin:google')

    // Assert — two distinct 16-char hex ids (crypto, not a constant/seed).
    const ids = warn.mock.calls.map((c) => (c[0] as Record<string, unknown>)['request_id'] as string)
    expect(ids[0]).toMatch(/^[0-9a-f]{16}$/)
    expect(ids[1]).toMatch(/^[0-9a-f]{16}$/)
    expect(ids[0]).not.toBe(ids[1])
  })
})

describe('clearRateLimit', () => {
  beforeEach(() => {
    mockResolve.mockReset()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls reset with IP:endpoint key', async () => {
    const reset = vi.fn().mockResolvedValue({ ok: true, value: undefined })
    mockResolve.mockReturnValue({ check: vi.fn(), reset })

    await clearRateLimit('203.0.113.7', 'signin:google')

    expect(reset).toHaveBeenCalledWith('203.0.113.7:signin:google')
  })

  it('ignores reset() Result.err (fail-open, WARN only) — never throws', async () => {
    // Arrange — spy on pino logger.warn.
    const warn = vi.spyOn(loggerModule.logger, 'warn').mockImplementation(() => undefined)
    const reset = vi
      .fn()
      .mockResolvedValue({ ok: false, error: new ExternalServiceError('upstash', null) })
    mockResolve.mockReturnValue({ check: vi.fn(), reset })

    // Act + Assert — must resolve (not reject) so sign-in completes.
    await expect(clearRateLimit('1.1.1.1', 'signin:google')).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledTimes(1)
    const obj = warn.mock.calls[0][0] as Record<string, unknown>
    expect(obj['phase']).toBe('reset')
  })
})
