// src/lib/infrastructure/adapters/real/in-memory-rate-limiter.adapter.ts
// Fixed-window RateLimiterPort for single-instance deployments (minimal /
// unlocked profiles). OWASP A07 brute-force defense for auth endpoints.
//
// ## Intentional process-global shared state (NOT a stateless violation)
//
// Unlike auth adapters (which forbid instance state like `this.session`), a
// rate-limiter counter MUST be shared across every request to function at all:
// counting login failures only works if all requests increment the same map.
// This is a deliberate, inverse design choice. Two mechanisms guarantee
// "single counter per process":
//   1. tsyringe Singleton lifecycle (registerPort uses Lifecycle.Singleton).
//   2. globalThis-backed Map — Next.js 14 App Router gives Server Actions and
//      Server Components separate Node.js module caches, and dev HMR re-evaluates
//      modules, so a plain class field would be duplicated / lost. Anchoring the
//      Map on globalThis makes it survive module isolation and hot-reload — the
//      same pattern as InMemoryAllowedUserRepository (task-35).
//
// ## Known limitations (single-instance only)
//   - Serverless multi-instance (pro / vps profiles) needs a distributed counter
//     (UpstashRateLimiterAdapter); in-memory windows are instance-local there.
//     A production guard below throws if this adapter is wired in production.
//   - Fixed-window allows a boundary burst (up to 2N-1 attempts straddling the
//     window edge). Sliding-window is a future Upstash concern (draft §4).
//   - check() is a synchronous read-modify-write with no awaits, so it is atomic
//     on the single-threaded event loop. Upstash will use atomic INCR+EXPIRE.

import { injectable } from 'tsyringe'
import type {
  RateLimiterPort,
  RateLimitOptions,
  RateLimitResult,
} from '../../../application/ports/rate-limiter.port'
import { ok, type Result } from '../../../application/result'
import type { ExternalServiceError } from '../../../domain/errors'

interface WindowEntry {
  count: number
  /** Epoch ms when the current window started. */
  windowStart: number
  /**
   * The window length (ms) this entry was created with. Stored per-entry so the
   * lazy TTL cleanup expires each key against its *own* window, not whatever
   * windowMs the current check() happens to carry. With a single shared
   * windowSec (today) this is behavior-preserving, but it makes the store safe
   * once keys with different windowSec (e.g. signin=900s vs another endpoint=60s)
   * coexist in the same global Map — SEC-2.
   */
  windowMs: number
}

/** Process-global backing store — survives Next.js module isolation / HMR. */
const GLOBAL_KEY = '__recall_poc_rateLimiterStore__'
declare global {
  // eslint-disable-next-line no-var
  var __recall_poc_rateLimiterStore__: Map<string, WindowEntry> | undefined
}

function getGlobalStore(): Map<string, WindowEntry> {
  // Production fail-fast guard (mirrors InMemoryAllowedUserRepository L36-41):
  // in-memory rate limiting is unsafe in production multi-instance because each
  // instance keeps its own window — a misrouted profile mapping (pro/vps →
  // InMemory instead of Upstash) would silently let brute-force through. Throw
  // at startup so the misconfiguration is loud, never WARN-and-continue.
  if (process.env.NODE_ENV === 'production' && process.env.MOCK_MODE !== 'true') {
    throw new Error(
      '[SEC] InMemoryRateLimiterAdapter is forbidden in production. ' +
        'Use UpstashRateLimiterAdapter (pro/vps profile) for multi-instance ' +
        'deployments, or set MOCK_MODE=true.',
    )
  }
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = new Map<string, WindowEntry>()
  }
  return globalThis[GLOBAL_KEY] as Map<string, WindowEntry>
}

@injectable()
export class InMemoryRateLimiterAdapter implements RateLimiterPort {
  private readonly store: Map<string, WindowEntry> = getGlobalStore()

  /**
   * Reset the process-global store (for test isolation).
   * Call in beforeEach when the global store must start empty.
   */
  static resetStore(): void {
    globalThis[GLOBAL_KEY] = new Map<string, WindowEntry>()
  }

  /**
   * Lazy TTL cleanup: drop entries whose own window has fully elapsed.
   * Uses each entry's stored `windowMs` (not the caller's current windowMs) so a
   * short-window check cannot evict a still-live long-window key — SEC-2.
   */
  private cleanupExpired(now: number): void {
    for (const [k, entry] of this.store) {
      if (now - entry.windowStart >= entry.windowMs) {
        this.store.delete(k)
      }
    }
  }

  async check(
    key: string,
    opts: RateLimitOptions,
  ): Promise<Result<RateLimitResult, ExternalServiceError>> {
    const now = Date.now()
    const windowMs = opts.windowSec * 1000

    // Lazy TTL cleanup prevents unbounded key growth (memory leak).
    this.cleanupExpired(now)

    const existing = this.store.get(key)
    const windowExpired = existing === undefined || now - existing.windowStart >= windowMs

    const entry: WindowEntry = windowExpired
      ? { count: 1, windowStart: now, windowMs }
      : { count: existing.count + 1, windowStart: existing.windowStart, windowMs }
    this.store.set(key, entry)

    const allowed = entry.count <= opts.maxAttempts
    const remaining = Math.max(0, opts.maxAttempts - entry.count)
    const elapsedMs = now - entry.windowStart
    const retryAfterSec = allowed ? 0 : Math.ceil((windowMs - elapsedMs) / 1000)

    return ok({ allowed, remaining, retryAfterSec })
  }

  async reset(key: string): Promise<Result<void, ExternalServiceError>> {
    this.store.delete(key)
    return ok(undefined as void)
  }
}
