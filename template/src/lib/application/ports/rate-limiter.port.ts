// src/lib/application/ports/rate-limiter.port.ts
// RateLimiterPort — abstracts fixed-window rate limiting for auth endpoints
// (OWASP A07 brute-force defense). Implementations:
//   - InMemoryRateLimiterAdapter (real, single-instance POC / globalThis-backed)
//   - UpstashRateLimiterAdapter (real, serverless multi-instance — later task)
//   - MockRateLimiterAdapter (POC, default always allowed + setThreshold seam)
//
// The Server Action layer calls check() before credential verification and
// reset() after a successful sign-in (Result.ok). Backend failures surface as
// Result.err(ExternalServiceError) so callers can fail-open (see draft §Step 2).

import type { Result } from '../result'
import type { ExternalServiceError } from '../../domain/errors'

/**
 * Outcome of a single rate-limit check.
 * - `allowed`: whether the request may proceed (false → 429).
 * - `remaining`: attempts left in the current window (>= 0).
 * - `retryAfterSec`: seconds until the window resets (Retry-After header value).
 */
export interface RateLimitResult {
  readonly allowed: boolean
  readonly remaining: number
  readonly retryAfterSec: number
}

/** Options for a rate-limit check. */
export interface RateLimitOptions {
  /** Maximum attempts permitted per window. */
  readonly maxAttempts: number
  /** Window length in seconds. */
  readonly windowSec: number
}

export interface RateLimiterPort {
  /**
   * Register one attempt against `key` and report whether it is permitted.
   * `key` is `IP:endpoint` (email is intentionally excluded to avoid user
   * enumeration — see draft §Step 2). Returns Result.err on backend failure so
   * the caller can fail-open.
   */
  check(
    key: string,
    opts: RateLimitOptions,
  ): Promise<Result<RateLimitResult, ExternalServiceError>>

  /**
   * Clear the attempt counter for `key`. Called after a successful sign-in
   * (Result.ok) so legitimate users are not penalized by earlier failures.
   */
  reset(key: string): Promise<Result<void, ExternalServiceError>>
}
