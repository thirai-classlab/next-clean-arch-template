// src/lib/infrastructure/adapters/real/in-memory-rate-limiter.adapter.spec.ts
// Step 1 core unit tests: fixed-window basics + lazy TTL cleanup.
// (Boundary burst / Retry-After exactness / fail-open are covered in Step 5.)

import 'reflect-metadata'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { InMemoryRateLimiterAdapter } from './in-memory-rate-limiter.adapter'

const OPTS = { maxAttempts: 5, windowSec: 900 } as const

describe('InMemoryRateLimiterAdapter — fixed window', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows attempts up to maxAttempts then blocks', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const results = []
    for (let i = 0; i < 6; i++) {
      const r = await sut.check('1.2.3.4:signin', OPTS)
      expect(r.ok).toBe(true)
      if (r.ok) results.push(r.value)
    }
    // First 5 allowed, 6th blocked.
    expect(results.slice(0, 5).every((v) => v.allowed)).toBe(true)
    expect(results[5].allowed).toBe(false)
  })

  it('reports decreasing remaining and zero at the limit', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const r1 = await sut.check('k:signin', OPTS)
    const r5 = (await Promise.all([
      sut.check('k:signin', OPTS),
      sut.check('k:signin', OPTS),
      sut.check('k:signin', OPTS),
      sut.check('k:signin', OPTS),
    ]))[3]
    expect(r1.ok && r1.value.remaining).toBe(4)
    expect(r5.ok && r5.value.remaining).toBe(0)
  })

  it('returns a positive retryAfterSec once blocked', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    for (let i = 0; i < 5; i++) await sut.check('k:signin', OPTS)
    const blocked = await sut.check('k:signin', OPTS)
    expect(blocked.ok).toBe(true)
    if (blocked.ok) {
      expect(blocked.value.allowed).toBe(false)
      expect(blocked.value.retryAfterSec).toBeGreaterThan(0)
      expect(blocked.value.retryAfterSec).toBeLessThanOrEqual(OPTS.windowSec)
    }
  })

  it('resets the window after windowSec elapses', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    for (let i = 0; i < 5; i++) await sut.check('k:signin', OPTS)
    const blocked = await sut.check('k:signin', OPTS)
    expect(blocked.ok && blocked.value.allowed).toBe(false)

    // Advance past the window — next check starts a fresh window.
    vi.advanceTimersByTime(OPTS.windowSec * 1000 + 1)
    const afterReset = await sut.check('k:signin', OPTS)
    expect(afterReset.ok && afterReset.value.allowed).toBe(true)
  })

  it('keys are independent', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    for (let i = 0; i < 5; i++) await sut.check('a:signin', OPTS)
    const aBlocked = await sut.check('a:signin', OPTS)
    const bFirst = await sut.check('b:signin', OPTS)
    expect(aBlocked.ok && aBlocked.value.allowed).toBe(false)
    expect(bFirst.ok && bFirst.value.allowed).toBe(true)
  })

  it('reset() clears the counter for a key', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    for (let i = 0; i < 5; i++) await sut.check('k:signin', OPTS)
    await sut.reset('k:signin')
    const afterReset = await sut.check('k:signin', OPTS)
    expect(afterReset.ok && afterReset.value.allowed).toBe(true)
    expect(afterReset.ok && afterReset.value.remaining).toBe(4)
  })
})

describe('InMemoryRateLimiterAdapter — lazy TTL cleanup', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('drops expired entries on the next check (memory-leak guard)', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    // Seed an entry for a key that will go untouched.
    await sut.check('stale:signin', OPTS)
    // Advance past the window so the stale entry is expired.
    vi.advanceTimersByTime(OPTS.windowSec * 1000 + 1)
    // A check on a *different* key triggers cleanup of the stale one.
    await sut.check('fresh:signin', OPTS)

    const store = (
      globalThis as unknown as {
        __recall_poc_rateLimiterStore__: Map<string, unknown>
      }
    ).__recall_poc_rateLimiterStore__
    expect(store.has('stale:signin')).toBe(false)
    expect(store.has('fresh:signin')).toBe(true)
  })
})

// Step 5: boundary burst characterization (TA-4, SEC H-1 known limitation).
// Fixed-window allows up to 2N-1 attempts straddling the window edge: N at the
// tail of window 1, then N at the head of window 2, but the (N+1)th of window 1
// was already blocked, so the total *allowed* is 2N-1.
describe('InMemoryRateLimiterAdapter — boundary burst (2N-1, characterization)', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows 2N-1 attempts inside a single rolling windowMs span (N=5 → 9)', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const N = 5
    const opts = { maxAttempts: N, windowSec: 10 } as const // windowMs = 10_000
    const t0 = new Date('2026-06-01T00:00:00Z').getTime()

    // Window 1 anchors to the FIRST check. Fire N tail attempts at t0+8_000;
    // window 1 = [t0+8_000, t0+18_000). All N are allowed (1st starts window).
    vi.setSystemTime(t0 + 8_000)
    let allowedCount = 0
    for (let i = 0; i < N; i++) {
      const r = await sut.check('burst:signin', opts)
      if (r.ok && r.value.allowed) allowedCount++
    }
    expect(allowedCount).toBe(N) // all 5 allowed in window 1

    // Advance just past window 1's own edge (t0+18_000) → fresh window 2 starts.
    vi.setSystemTime(t0 + 18_001)
    // Fire N-1 more at the head of window 2: all allowed in the new window.
    for (let i = 0; i < N - 1; i++) {
      const r = await sut.check('burst:signin', opts)
      if (r.ok && r.value.allowed) allowedCount++
    }

    // 2N-1=9 attempts were allowed straddling the window edge: a true sliding
    // window would have blocked the head attempts that fall within windowMs of
    // the tail. This characterizes the documented fixed-window boundary burst
    // (draft §4; sliding-window is a future Upstash concern).
    expect(allowedCount).toBe(2 * N - 1)
  })
})

// Step 5: deterministic Retry-After (TA-5, TDD-M2). retryAfterSec must be
// ceil((windowMs - elapsedMs)/1000) measured from the window start.
describe('InMemoryRateLimiterAdapter — retryAfterSec exact value', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns ceil((windowMs - elapsed)/1000): windowSec=10, +3s elapsed → 7', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const opts = { maxAttempts: 2, windowSec: 10 } as const

    // Exhaust the limit at t0 (window starts at t0).
    await sut.check('k:signin', opts)
    await sut.check('k:signin', opts)

    // Advance 3s, then a blocked check: 10s window, 3s elapsed → 7s remaining.
    vi.advanceTimersByTime(3000)
    const blocked = await sut.check('k:signin', opts)
    expect(blocked.ok).toBe(true)
    if (blocked.ok) {
      expect(blocked.value.allowed).toBe(false)
      expect(blocked.value.retryAfterSec).toBe(7)
    }
  })

  it('rounds up fractional remaining seconds (windowSec=10, +2.5s → 8)', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const opts = { maxAttempts: 1, windowSec: 10 } as const

    await sut.check('k:signin', opts)
    vi.advanceTimersByTime(2500)
    const blocked = await sut.check('k:signin', opts)
    expect(blocked.ok).toBe(true)
    // remaining = 10000 - 2500 = 7500ms → ceil(7.5) = 8.
    if (blocked.ok) expect(blocked.value.retryAfterSec).toBe(8)
  })

  it('reports retryAfterSec=0 on allowed checks', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const r = await sut.check('k:signin', OPTS)
    expect(r.ok && r.value.allowed).toBe(true)
    expect(r.ok && r.value.retryAfterSec).toBe(0)
  })
})

// Step 5: production fail-fast guard (CODE-R3-2, SEC-R3-2). The global store
// constructor throws in production unless MOCK_MODE=true, so a misrouted
// in-memory rate limiter cannot silently let brute-force through.
describe('InMemoryRateLimiterAdapter — production guard', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('throws when constructed in production without MOCK_MODE', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_MODE', '')
    // getGlobalStore() runs in the field initializer, so construction throws.
    expect(() => new InMemoryRateLimiterAdapter()).toThrow(/forbidden in production/)
  })

  it('does NOT throw in production when MOCK_MODE=true', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MOCK_MODE', 'true')
    expect(() => new InMemoryRateLimiterAdapter()).not.toThrow()
  })

  it('does NOT throw in development', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('MOCK_MODE', '')
    expect(() => new InMemoryRateLimiterAdapter()).not.toThrow()
  })
})

// Step 5: only failed attempts increment the counter (TDD-M1). The adapter
// counts every check() call; the *caller* only calls check() on failures and
// reset() on success. This verifies the contract from the adapter's side:
// each check() is one unit, and reset() clears the count entirely.
describe('InMemoryRateLimiterAdapter — count semantics', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('each check() increments by exactly one (remaining decreases by 1)', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const r1 = await sut.check('k:signin', OPTS)
    const r2 = await sut.check('k:signin', OPTS)
    expect(r1.ok && r1.value.remaining).toBe(OPTS.maxAttempts - 1)
    expect(r2.ok && r2.value.remaining).toBe(OPTS.maxAttempts - 2)
  })

  it('reset() (success-path simulation) restores full budget', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    // 3 failed attempts...
    for (let i = 0; i < 3; i++) await sut.check('k:signin', OPTS)
    // ...then a success calls reset(), clearing the fail count.
    await sut.reset('k:signin')
    const after = await sut.check('k:signin', OPTS)
    expect(after.ok && after.value.allowed).toBe(true)
    expect(after.ok && after.value.remaining).toBe(OPTS.maxAttempts - 1)
  })
})

// Step 5: SEC-2 regression. With per-entry windowMs, a cleanup triggered by a
// short-window key (60s) must NOT evict a still-live long-window key (900s).
describe('InMemoryRateLimiterAdapter — SEC-2 mixed-window cleanup', () => {
  beforeEach(() => {
    InMemoryRateLimiterAdapter.resetStore()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-01T00:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not evict a 900s key during a 60s key cleanup after 60s elapse', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const longOpts = { maxAttempts: 5, windowSec: 900 } as const
    const shortOpts = { maxAttempts: 5, windowSec: 60 } as const

    // Seed a long-window key and a short-window key at t0.
    await sut.check('long:signin', longOpts)
    await sut.check('short:other', shortOpts)

    // Advance past the short window (60s) but well within the long window (900s).
    vi.advanceTimersByTime(61_000)

    // Any check triggers cleanupExpired: the short key expires, the long stays.
    await sut.check('trigger:signin', longOpts)

    const store = (
      globalThis as unknown as {
        __recall_poc_rateLimiterStore__: Map<string, { count: number }>
      }
    ).__recall_poc_rateLimiterStore__

    expect(store.has('long:signin')).toBe(true) // SEC-2: NOT over-deleted
    expect(store.has('short:other')).toBe(false) // its own window elapsed
    expect(store.has('trigger:signin')).toBe(true)
  })

  it('preserves the long-window count (no silent reset) after short cleanup', async () => {
    const sut = new InMemoryRateLimiterAdapter()
    const longOpts = { maxAttempts: 5, windowSec: 900 } as const
    const shortOpts = { maxAttempts: 5, windowSec: 60 } as const

    // 4 failures on the long-window key (1 budget left).
    for (let i = 0; i < 4; i++) await sut.check('long:signin', longOpts)
    await sut.check('short:other', shortOpts)

    vi.advanceTimersByTime(61_000)

    // The long key must keep its count: 5th check is the last allowed, 6th blocks.
    const fifth = await sut.check('long:signin', longOpts)
    const sixth = await sut.check('long:signin', longOpts)
    expect(fifth.ok && fifth.value.allowed).toBe(true)
    expect(fifth.ok && fifth.value.remaining).toBe(0)
    expect(sixth.ok && sixth.value.allowed).toBe(false)
  })
})
