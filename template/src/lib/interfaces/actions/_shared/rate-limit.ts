// src/lib/interfaces/actions/_shared/rate-limit.ts
// task #36 Step 2 — shared rate-limit gate for auth Server Actions.
//
// Wraps RateLimiterPort.check() so every auth entry (signInWithGoogle now,
// signInWithPassword in task #37) applies the same fixed-window gate before
// credential verification, and clears the counter on success.
//
// Behaviour (draft §Step 2):
//   - key = `IP:endpoint` ONLY — email is intentionally excluded to avoid user
//     enumeration (an email-keyed limit reveals which addresses exist).
//   - !allowed  → return { allowed:false, retryAfterSec } (caller returns 429).
//   - check() Result.err (backend down) → FAIL-OPEN: proceed + WARN log.
//   - clearRateLimit() is called only after a successful sign-in (Result.ok);
//     reset() Result.err is ignored (fail-open, WARN log, never roll back).

import { randomBytes } from 'node:crypto'
import { container, ensureContainer } from '@/lib/infrastructure/container'
import type { RateLimiterPort } from '@/lib/application/ports/rate-limiter.port'
import type { ExternalServiceError } from '@/lib/domain/errors'
import { logger } from '@/lib/infrastructure/logger'

/**
 * Endpoint labels used as the rate-limit key suffix (`IP:endpoint`).
 * Centralised here so every auth action imports the same string constants and
 * task-37 (`signin:password`) can reuse the same DRY pattern without risk of
 * silent typo divergence.
 */
export const RATE_LIMIT_ENDPOINT = {
  SIGNIN_GOOGLE: 'signin:google',
  SIGNIN_PASSWORD: 'signin:password',
} as const

/** Default fixed-window thresholds — overridden by RATE_LIMIT_* env. */
const DEFAULT_MAX_ATTEMPTS = 5
const DEFAULT_WINDOW_SEC = 900 // 15 minutes

/** Resolve rate-limit thresholds from env, falling back to documented defaults. */
function getRateLimitOptions(): { maxAttempts: number; windowSec: number } {
  const maxAttempts = Number(process.env.RATE_LIMIT_MAX_ATTEMPTS)
  const windowSec = Number(process.env.RATE_LIMIT_WINDOW_SEC)
  return {
    maxAttempts:
      Number.isInteger(maxAttempts) && maxAttempts > 0
        ? maxAttempts
        : DEFAULT_MAX_ATTEMPTS,
    windowSec:
      Number.isInteger(windowSec) && windowSec > 0
        ? windowSec
        : DEFAULT_WINDOW_SEC,
  }
}

/** Structured WARN log for fail-open events (draft §Step 2: 4 required fields). */
function warnFailOpen(
  phase: 'check' | 'reset',
  key: string,
  error: ExternalServiceError,
): void {
  // request_id: best-effort trace id. No per-request id is plumbed through the
  // POC, so we emit a 16-char hex correlation id for log grepping. Uses
  // crypto.randomBytes (not Math.random) so the id is unpredictable — an
  // attacker cannot forge or guess the correlation id of a fail-open event they
  // deliberately induced to bypass rate-limiting (draft §Step 2, SEC-1 MEDIUM).
  const requestId = randomBytes(8).toString('hex')
  logger.warn(
    {
      component: 'rate-limit',
      event: 'fail-open',
      phase,
      errorType: error.constructor.name,
      key,
      request_id: requestId,
    },
    `[rate-limit][fail-open] phase=${phase} errorType=${error.constructor.name} key=${key} request_id=${requestId}`,
  )
}

export interface RateLimitGateResult {
  /** Whether the request may proceed to credential verification. */
  readonly allowed: boolean
  /** Seconds until the window resets — only meaningful when !allowed. */
  readonly retryAfterSec: number
}

/**
 * Apply the rate-limit gate for `endpoint` keyed by `ip`. Fail-open on backend
 * error so a rate-limiter outage never blocks legitimate sign-ins.
 *
 * Honors the `RATE_LIMIT_ENABLED` env field at runtime: when it is anything
 * other than the string `'true'` (including the schema default `'false'`), the
 * rate-limit check is skipped and the request is treated as allowed WITHOUT
 * counting up. The *mechanical enforcement* of `RATE_LIMIT_ENABLED=true`
 * whenever email+password sign-in is active (i.e. the startup superRefine guard
 * that fails the boot when `LOGIN_STRATEGY !== 'sso' && RATE_LIMIT_ENABLED !==
 * 'true'`) lives in the login task #37 Step 4. This implementation only respects
 * the field's value at runtime; it does not enforce that the field is `'true'`.
 */
export async function applyRateLimit(
  ip: string,
  endpoint: string,
): Promise<RateLimitGateResult> {
  // Disabled / not-yet-enabled (default 'false'): skip the check entirely and do
  // not increment any counter, so a disabled rate-limiter is a true no-op.
  if (process.env.RATE_LIMIT_ENABLED !== 'true') {
    return { allowed: true, retryAfterSec: 0 }
  }

  await ensureContainer()
  const limiter = container.resolve<RateLimiterPort>('RateLimiterPort')
  const key = `${ip}:${endpoint}`

  const result = await limiter.check(key, getRateLimitOptions())
  if (!result.ok) {
    // Backend (e.g. Upstash) failure — fail-open + WARN so a rate-limiter
    // outage cannot DoS legitimate users by blocking every sign-in.
    warnFailOpen('check', key, result.error)
    return { allowed: true, retryAfterSec: 0 }
  }

  return {
    allowed: result.value.allowed,
    retryAfterSec: result.value.retryAfterSec,
  }
}

/**
 * Clear the failure counter after a successful sign-in. Called ONLY after a
 * Result.ok credential check. A reset() Result.err is ignored (fail-open, WARN
 * log only) — a reset failure must not roll back a successful sign-in.
 */
export async function clearRateLimit(
  ip: string,
  endpoint: string,
): Promise<void> {
  await ensureContainer()
  const limiter = container.resolve<RateLimiterPort>('RateLimiterPort')
  const key = `${ip}:${endpoint}`

  const result = await limiter.reset(key)
  if (!result.ok) {
    warnFailOpen('reset', key, result.error)
  }
}
