// src/lib/infrastructure/adapters/mock/mock-rate-limiter.adapter.ts
// In-memory RateLimiterPort for MOCK_MODE=true.
//
// ## Default behavior — UI demo stays unblocked
//
// The UI demo runs with RATE_LIMIT_ENABLED unset/false, and applyRateLimit()
// short-circuits (returns allowed) BEFORE ever calling check() in that case (see
// _shared/rate-limit.ts L104). So the rate-limiter never blocks the demo flow,
// regardless of what check() would do. check() is only reached when the runtime
// opts into enforcement via RATE_LIMIT_ENABLED=true.
//
// ## Two enforcement modes (both fixed-window counters)
//
//   1. Env-driven (default once check() is reached): count per key using the
//      caller's RateLimitOptions (resolved from RATE_LIMIT_* env by
//      getRateLimitOptions()). This is what the live dev server / Playwright E2E
//      exercises — no test seam is invoked at runtime, so the adapter must enforce
//      using the opts it is handed.
//   2. setThreshold(maxAttempts, windowSec) seam: pin a fixed threshold that
//      overrides the caller's opts. Used by vitest integration specs
//      (rate-limit.integration.spec.ts) to drive a deterministic 5→6th 429
//      sequence in a stable Node.js module context. Pass null/omit to clear.
//
// ## globalThis-backed store — survives Next.js module isolation / dev HMR
//
// Next.js 14 App Router gives Server Actions and Server Components separate
// Node.js module caches, and dev HMR re-evaluates modules, so a plain class field
// (the previous `private counts = new Map()`) was duplicated / reset between
// requests — the E2E counter never accumulated and the test auto-skipped. Anchor
// the counter Map on globalThis so it is shared across module contexts and
// survives hot-reload — the same pattern as InMemoryRateLimiterAdapter and
// InMemoryAuditLogRepository (task-35 Step 2d).

import { injectable } from 'tsyringe'
import type {
  RateLimiterPort,
  RateLimitOptions,
  RateLimitResult,
} from '../../../application/ports/rate-limiter.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

/** Process-global backing store — survives Next.js module isolation / HMR. */
const GLOBAL_KEY = '__recall_poc_mockRateLimiterCounts__'
declare global {
  var __recall_poc_mockRateLimiterCounts__: Map<string, number> | undefined
}

function getGlobalCounts(): Map<string, number> {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Map<string, number>()
  }
  return globalThis[GLOBAL_KEY] as Map<string, number>
}

@injectable()
export class MockRateLimiterAdapter implements RateLimiterPort {
  /** When set, pins a fixed threshold that overrides the caller's opts (test seam). */
  private threshold: { maxAttempts: number; windowSec: number } | null = null
  /**
   * Per-key attempt counters, anchored on globalThis so they survive Next.js
   * module isolation and dev HMR (cross-request accumulation for the E2E 429).
   */
  private readonly counts: Map<string, number> = getGlobalCounts()

  /**
   * Test seam: pin a fixed-window threshold that overrides the caller's opts.
   * Pass `null` (or omit) to revert to env-driven (opts-based) counting.
   * Also clears the global counter so each spec starts from a clean window.
   */
  setThreshold(maxAttempts?: number, windowSec?: number): void {
    if (maxAttempts === undefined || windowSec === undefined) {
      this.threshold = null
      this.counts.clear()
      return
    }
    this.threshold = { maxAttempts, windowSec }
    this.counts.clear()
  }

  /**
   * Reset the process-global counter store (for test isolation).
   * Call in beforeEach when the global store must start empty.
   */
  static resetStore(): void {
    globalThis[GLOBAL_KEY] = new Map<string, number>()
  }

  async check(
    key: string,
    opts: RateLimitOptions,
  ): Promise<Result<RateLimitResult, ExternalServiceError>> {
    // setThreshold seam overrides opts when pinned; otherwise enforce using the
    // caller's env-resolved options.
    const maxAttempts = this.threshold?.maxAttempts ?? opts.maxAttempts
    const windowSec = this.threshold?.windowSec ?? opts.windowSec

    const next = (this.counts.get(key) ?? 0) + 1
    this.counts.set(key, next)
    const allowed = next <= maxAttempts
    const remaining = Math.max(0, maxAttempts - next)
    return ok({
      allowed,
      remaining,
      retryAfterSec: allowed ? 0 : windowSec,
    })
  }

  async reset(key: string): Promise<Result<void, ExternalServiceError>> {
    this.counts.delete(key)
    return ok(undefined as void)
  }
}
