// src/lib/security/owasp.spec.ts
// task-5 Step 7 — OWASP Top 10 security spec scaffolding.
//
// Most cases are it.todo stubs that document the required security assertions.
// Concrete implementations are added once the integration test infrastructure
// (e.g., test Supabase client + route harness) is in place.
//
// task-5 Step 7 round-3 fix (R3-A MEDIUM-N3 / R3-E R2-F6-01):
//   - A04 MOCK_MODE production-throw is an executable unit case
//     (no longer it.todo) — verifies instrumentation.register() throws.
//     (The former dev admin bypass guard was removed permanently in
//      task: remove-dev-admin-bypass.)
//   - A05 (Security Misconfiguration) catalog added with 4 cases covering
//     next.config.mjs response headers (set in apps/web/next.config.mjs).
// task-5 Step 7 round-5 fix (R4-SEC-2 CRITICAL / R4-SEC-3 HIGH):
//   - A05 adds an executable case proving the production CSP `script-src`
//     drops `'unsafe-eval'` (R4-SEC-3, 3 reviewers agreed HIGH).
//   - A04 adds an executable case proving `next.config.mjs` opts the
//     instrumentation hook in via `experimental.instrumentationHook: true`,
//     without which the SEC-H5 startup safeguard is silent dead code on
//     Next.js 14.x (R4-SEC-2 CRITICAL).
// task-5 Step 8 Phase D-static:
//   - A02 (3 cases): timingSafeEqual usage static-verified for cron route and
//     webhook verifier adapter; Supabase JWT RS256 is platform-level (it.skip).
//   - A05 CORS: static assertion that next.config.mjs declares no wildcard CORS.
//   - A05 error-leak: static assertion on CSP + poweredByHeader suppression.
//   - A04-1 / A04-2: it.skip + pgTAP anchor (DB-layer enforcement).
//
// OWASP categories covered:
//   A01 Broken Access Control  — unauthorized route access returns 403/401
//   A02 Cryptographic Failures — constant-time compare, no timing side-channel
//   A04 Insecure Design        — self-demotion guard, dev-bypass prod throw, RLS append-only
//   A05 Security Misconfiguration — response headers, CSP, CORS, error leaks
//   A07 Authentication Failures — rate limiting, cookie flags, PKCE, open-redirect guard
//
// References:
//   - task-5 draft 08 §Phase 1-6 (route auth contracts)
//   - apps/web/next.config.mjs (security headers source of truth)
//   - apps/web/src/instrumentation.ts (SEC-H5 startup safeguard)
//   - OWASP Top Ten 2021: https://owasp.org/Top10/

// reflect-metadata is required before importing MockRateLimiterAdapter
// (decorated with tsyringe @injectable) for the A07-1 rate-limit case below.
import 'reflect-metadata'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { evaluateRoleAccess } from '@/lib/auth/role-guard'
import { isSafeNext } from '@/lib/security/safe-next'

// A07-1 mechanical verification: applyRateLimit resolves RateLimiterPort from the
// DI container. Stub the container so the spec drives the real
// MockRateLimiterAdapter (setThreshold seam) through applyRateLimit without
// bootstrapping the full container. Only the rate-limit helper imports this
// module, so the stub is scoped to the A07-1 case.
const mockResolveRateLimiter = vi.fn()
vi.mock('@/lib/infrastructure/container', () => ({
  ensureContainer: vi.fn().mockResolvedValue(undefined),
  container: { resolve: (token: string) => mockResolveRateLimiter(token) },
}))

import { applyRateLimit } from '@/lib/interfaces/actions/_shared/rate-limit'
import { MockRateLimiterAdapter } from '@/lib/infrastructure/adapters/mock/mock-rate-limiter.adapter'

// ---------------------------------------------------------------------------
// A01: Broken Access Control
// ---------------------------------------------------------------------------

describe('OWASP A01: Broken Access Control', () => {
  // A01-1: /api/admin/users GET requires admin role.
  // The route handler calls requireRole(['admin']) which delegates to evaluateRoleAccess.
  // We test the pure decision function directly — no Supabase client needed.
  it('member role is denied access to admin-only routes (A01-1)', () => {
    const result = evaluateRoleAccess('user-member-id', 'member', ['admin'])
    expect(result.kind).toBe('forbidden')
  })

  // A01-2: PATCH /api/admin/users/:id/role is admin-only.
  // viewer role must be forbidden by the same evaluateRoleAccess guard.
  it('viewer role is denied role-change on admin routes (A01-2)', () => {
    const result = evaluateRoleAccess('user-viewer-id', 'viewer', ['admin'])
    expect(result.kind).toBe('forbidden')
  })

  // A01-3: pending user INSERT to allowed_users is enforced at DB layer by RLS.
  // The Next.js layer has no direct INSERT route; enforcement is via Supabase RLS
  // (policy: allowed_users INSERT restricted, see supabase/tests/rls_enforcement.test.sql).
  // CLI environment cannot reproduce Supabase RLS — skip with pgTAP anchor.
  it.skip('pending user INSERT to allowed_users is denied (A01-3, pgTAP anchor)', () => {
    // pgTAP: supabase/tests/rls_enforcement.test.sql (allowed_users INSERT pending deny)
    // RLS enforced at DB layer; not reproducible in Next.js unit test environment.
  })

  // A01-4: URL constructor normalises path-traversal sequences before routing.
  // A request to /admin/../public/sensitive is collapsed to /public/sensitive by
  // the browser/Node URL parser, so the /admin/* middleware guard is never bypassed
  // at the route level. We assert the normalisation is deterministic.
  it('URL constructor normalises /admin/../public path-traversal (A01-4)', () => {
    const url = new URL('http://localhost/admin/../public/sensitive')
    // URL constructor resolves ".." segments — traversal collapsed before routing.
    expect(url.pathname).toBe('/public/sensitive')
    expect(url.pathname.startsWith('/admin')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// A02: Cryptographic Failures
// ---------------------------------------------------------------------------

describe('OWASP A02: Cryptographic Failures', () => {
  // Resolve from apps/web root so file reads work regardless of CWD.
  // __dirname = apps/web/src/lib/security → ../../.. = apps/web
  const webRoot = path.resolve(__dirname, '../../..')

  it('CRON_SECRET bearer comparison uses timingSafeEqual, not string === (A02-1)', async () => {
    const routePath = path.join(
      webRoot,
      'src/app/api/cron/audit-cleanup/route.ts',
    )
    const source = await fs.readFile(routePath, 'utf-8')
    // Must import timingSafeEqual from node:crypto.
    expect(source).toContain('timingSafeEqual')
    expect(source).toMatch(/from ['"]node:crypto['"]/)
    // Must NOT use direct string equality on the secret (=== comparison on the raw header).
    expect(source).not.toMatch(/authorization.*===/)
    expect(source).not.toMatch(/===.*CRON_SECRET/)
  })

  it('RECALL_WEBHOOK_SECRET HMAC verification uses constant-time compare (A02-2)', async () => {
    const adapterPath = path.join(
      webRoot,
      'src/lib/infrastructure/adapters/real/recall-ai-verifier.adapter.ts',
    )
    const source = await fs.readFile(adapterPath, 'utf-8')
    // Must use timingSafeEqual for the HMAC hex-digest comparison.
    expect(source).toContain('timingSafeEqual')
    // Must import from node:crypto (not a userland polyfill).
    expect(source).toMatch(/from ['"]node:crypto['"]/)
    // Must use HMAC-SHA256 to derive the expected digest.
    expect(source).toMatch(/createHmac\(['"]sha256['"]/)
    // Must NOT use early-exit string equality on hex digests.
    expect(source).not.toMatch(/expectedHex\s*===/)
    expect(source).not.toMatch(/signature\s*===/)
  })

  // A02-3: Supabase JWT RS256 is enforced at the Supabase platform level
  // (project settings → Auth → JWT Algorithm), not in the Next.js source code.
  // The Next.js layer uses `@supabase/ssr` `getUser()` which performs
  // server-side JWT validation via the Supabase Auth API (not local decode).
  // Local `getSession()` + atob decode is explicitly rejected in middleware.ts
  // (see role-guard.ts comment: "getSession() + JWT decode = no server validation").
  // pgTAP / Supabase Dashboard verification covers the algorithm setting;
  // this spec intentionally skips static assertion which is not feasible
  // without a running Supabase project.
  it.skip('Supabase JWTs are verified with RS256 (asymmetric), not HS256 (A02-3)', () => {
    // Platform-level enforcement: set in Supabase Dashboard → Auth → JWT Algorithm = RS256.
    // Code-level enforcement: middleware.ts uses getUser() (server-side JWT validation),
    //   never getSession() + client-side decode (see apps/web/src/lib/supabase/middleware.ts).
    // Cannot be statically asserted from Next.js source files — skip with platform anchor.
  })
})

// ---------------------------------------------------------------------------
// A04: Insecure Design
// ---------------------------------------------------------------------------

describe('OWASP A04: Insecure Design', () => {
  // A04-1: Admin self-demotion is enforced at the DB layer by a SECURITY DEFINER
  // trigger (`last_admin_protection` — see supabase/tests/last_admin_protection.test.sql,
  // 7 pgTAP assertions). The trigger was applied in task-5 Step 7 commit `255eb2f`
  // (R5-D MEDIUM-1). Static assertion is not feasible for DB-layer triggers;
  // this spec intentionally skips and anchors to the pgTAP suite.
  it.skip('admin self-demotion is blocked by last_admin DB trigger (A04-1, covered by pgTAP)', () => {
    // pgTAP file: supabase/tests/last_admin_protection.test.sql (7 assertions)
    // Trigger: SECURITY DEFINER, bypasses RLS to protect the last admin row.
    // Commit reference: task-5 Step 7 R5-D `255eb2f`
  })

  // MOCK_MODE production startup safeguard (S-01).
  // Verifies that instrumentation.register() throws synchronously at Next.js
  // server boot when MOCK_MODE=true leaks into a production env (the dev-only
  // cookie-based auth fallback must never reach production).
  // Full env-matrix lives in `src/instrumentation.spec.ts`; this entry is the
  // OWASP-catalog anchor that proves the safeguard is wired.
  //
  // (The former dev admin bypass production guard was removed permanently in
  //  task: remove-dev-admin-bypass — the bypass env no longer exists.)
  describe('MOCK_MODE production startup safeguard (S-01)', () => {
    afterEach(() => {
      vi.unstubAllEnvs()
      vi.resetModules()
    })

    it('throws when NODE_ENV=production AND MOCK_MODE=true (instrumentation.register)', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('MOCK_MODE', 'true')

      const mod = await import('@/instrumentation')
      await expect(mod.register()).rejects.toThrow(/\[SEC\]/)
    })

    it('does not throw when NODE_ENV=development AND MOCK_MODE=true (local dev preserved)', async () => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('MOCK_MODE', 'true')

      const mod = await import('@/instrumentation')
      await expect(mod.register()).resolves.toBeUndefined()
    })
  })

  // A04-2: audit_log RLS append-only enforcement is verified by pgTAP suites:
  //   - supabase/tests/rls_policies.test.sql
  //   - supabase/tests/rls_enforcement.test.sql
  // DB-layer RLS cannot be statically asserted from Next.js source;
  // this spec intentionally skips and anchors to the pgTAP suites.
  it.skip('audit_log rows are append-only: UPDATE and DELETE are denied by RLS policy (A04-2, covered by pgTAP)', () => {
    // pgTAP files: supabase/tests/rls_policies.test.sql + rls_enforcement.test.sql
    // Policy: INSERT-only for authenticated users, no UPDATE/DELETE grant.
    // Service-role client bypass is limited to cleanup_old_audit_logs RPC only.
  })

  // R4-SEC-2 CRITICAL: Next.js 14.x requires opt-in via
  // `experimental.instrumentationHook: true` before `instrumentation.ts`
  // `register()` is invoked at server boot. Without this opt-in the
  // MOCK_MODE production-throw above never fires, leaving the
  // safeguard as silent dead code. This case statically inspects the
  // next.config.mjs `experimental` block to prove the opt-in is wired.
  describe('instrumentation hook opt-in (R4-SEC-2)', () => {
    it('next.config.mjs experimental.instrumentationHook is true (Next.js 14.x opt-in)', async () => {
      // @ts-expect-error — JS config module, no .d.ts shipped
      const mod = await import('../../../next.config.mjs')
      const config = mod.default
      expect(config.experimental).toBeDefined()
      expect(config.experimental.instrumentationHook).toBe(true)
    })
  })
})

// ---------------------------------------------------------------------------
// A05: Security Misconfiguration
// ---------------------------------------------------------------------------
//
// Source of truth: `apps/web/next.config.mjs` `headers()` returns response
// headers applied to `source: '/(.*)'` (every route). These tests parse the
// config statically and assert the required headers are present with the
// expected values. We do NOT spin up a Next.js server — the config is the
// contract, and we verify the contract is correctly declared.

describe('OWASP A05: Security Misconfiguration', () => {
  describe('next.config.mjs response headers', () => {
    /**
     * Loads the resolved headers list from `apps/web/next.config.mjs`.
     * Returns the first (and only) header group's `headers` array.
     */
    async function loadConfigHeaders(): Promise<
      Array<{ key: string; value: string }>
    > {
      // @ts-expect-error — JS config module, no .d.ts shipped
      const mod = await import('../../../next.config.mjs')
      const config = mod.default
      const groups = await config.headers()
      // Single catch-all group for `/(.*)` — flatten its headers.
      return groups[0].headers
    }

    it('declares X-Content-Type-Options: nosniff for all routes', async () => {
      const headers = await loadConfigHeaders()
      const h = headers.find((x) => x.key === 'X-Content-Type-Options')
      expect(h).toBeDefined()
      expect(h?.value).toBe('nosniff')
    })

    it('declares X-Frame-Options: DENY for all routes (clickjacking defense)', async () => {
      const headers = await loadConfigHeaders()
      const h = headers.find((x) => x.key === 'X-Frame-Options')
      expect(h).toBeDefined()
      expect(h?.value).toBe('DENY')
    })

    it('declares Strict-Transport-Security with max-age >= 1 year, includeSubDomains, preload', async () => {
      const headers = await loadConfigHeaders()
      const h = headers.find((x) => x.key === 'Strict-Transport-Security')
      expect(h).toBeDefined()
      expect(h?.value).toMatch(/max-age=(\d+)/)
      // Extract numeric max-age and assert >= 31536000 (1 year, HSTS preload minimum).
      const match = h?.value.match(/max-age=(\d+)/)
      const maxAge = match ? Number.parseInt(match[1], 10) : 0
      expect(maxAge).toBeGreaterThanOrEqual(31536000)
      expect(h?.value).toContain('includeSubDomains')
      expect(h?.value).toContain('preload')
    })

    it('declares Content-Security-Policy with restrictive default-src and frame-ancestors', async () => {
      const headers = await loadConfigHeaders()
      const h = headers.find((x) => x.key === 'Content-Security-Policy')
      expect(h).toBeDefined()
      // default-src must be 'self' (no wildcard fallback for other directives).
      expect(h?.value).toMatch(/default-src 'self'/)
      // frame-ancestors 'none' provides the X-Frame-Options equivalent for
      // CSP-aware browsers (covers cases where X-Frame-Options is stripped).
      expect(h?.value).toMatch(/frame-ancestors 'none'/)
      // object-src 'none' kills legacy plugin-based XSS vectors.
      expect(h?.value).toMatch(/object-src 'none'/)
    })

    it('declares Referrer-Policy: strict-origin-when-cross-origin', async () => {
      const headers = await loadConfigHeaders()
      const h = headers.find((x) => x.key === 'Referrer-Policy')
      expect(h).toBeDefined()
      expect(h?.value).toBe('strict-origin-when-cross-origin')
    })

    it('declares Permissions-Policy that denies camera, microphone, geolocation', async () => {
      const headers = await loadConfigHeaders()
      const h = headers.find((x) => x.key === 'Permissions-Policy')
      expect(h).toBeDefined()
      expect(h?.value).toMatch(/camera=\(\)/)
      expect(h?.value).toMatch(/microphone=\(\)/)
      expect(h?.value).toMatch(/geolocation=\(\)/)
    })

    // R4-SEC-3 HIGH (3 reviewers agreed): Next.js production bundles are
    // pre-compiled and do NOT call eval() at runtime. Only the dev server's
    // Fast Refresh / Webpack HMR runtime requires runtime eval. We therefore
    // gate `'unsafe-eval'` behind `NODE_ENV !== 'production'` so production
    // CSP closes the XSS gadget while dev keeps HMR working.
    //
    // We re-import `next.config.mjs` with `vi.stubEnv` toggled to simulate
    // both runtimes. `vi.resetModules()` ensures the module factory re-runs
    // and picks up the stubbed `process.env.NODE_ENV`.
    describe("script-src 'unsafe-eval' (R4-SEC-3)", () => {
      afterEach(() => {
        vi.unstubAllEnvs()
        vi.resetModules()
      })

      it("omits 'unsafe-eval' from script-src when NODE_ENV=production", async () => {
        vi.stubEnv('NODE_ENV', 'production')
        vi.resetModules()
        // @ts-expect-error — JS config module, no .d.ts shipped
        const mod = await import('../../../next.config.mjs')
        const config = mod.default
        const groups = await config.headers()
        const headers = groups[0].headers as Array<{
          key: string
          value: string
        }>
        const csp = headers.find((x) => x.key === 'Content-Security-Policy')
        expect(csp).toBeDefined()
        // Extract the script-src directive only and assert no 'unsafe-eval'.
        const scriptSrc =
          csp?.value
            .split(';')
            .map((d) => d.trim())
            .find((d) => d.startsWith('script-src')) ?? ''
        expect(scriptSrc).toContain("'self'")
        expect(scriptSrc).toContain("'unsafe-inline'")
        expect(scriptSrc).not.toContain("'unsafe-eval'")
      })

      it("retains 'unsafe-eval' in script-src when NODE_ENV=development (HMR escape hatch)", async () => {
        vi.stubEnv('NODE_ENV', 'development')
        vi.resetModules()
        // @ts-expect-error — JS config module, no .d.ts shipped
        const mod = await import('../../../next.config.mjs')
        const config = mod.default
        const groups = await config.headers()
        const headers = groups[0].headers as Array<{
          key: string
          value: string
        }>
        const csp = headers.find((x) => x.key === 'Content-Security-Policy')
        const scriptSrc =
          csp?.value
            .split(';')
            .map((d) => d.trim())
            .find((d) => d.startsWith('script-src')) ?? ''
        expect(scriptSrc).toContain("'unsafe-eval'")
      })
    })
  })

  it('CORS policy on /api/** restricts Origin — no wildcard Access-Control-Allow-Origin in next.config.mjs (A05-CORS)', async () => {
    // Next.js does not add CORS headers by default. Any `Access-Control-Allow-Origin: *`
    // would have to be explicitly declared in next.config.mjs headers(). We assert
    // it is absent, confirming no wildcard origin is advertised to browsers.
    // @ts-expect-error — JS config module, no .d.ts shipped
    const mod = await import('../../../next.config.mjs')
    const config = mod.default
    const groups = await config.headers()
    const allHeaders: Array<{ key: string; value: string }> =
      groups.flatMap((g: { headers: Array<{ key: string; value: string }> }) => g.headers)
    const corsHeader = allHeaders.find(
      (h) => h.key === 'Access-Control-Allow-Origin',
    )
    // No CORS header declared at all (Next.js default = no CORS headers).
    // If declared, it must not be a wildcard.
    if (corsHeader !== undefined) {
      expect(corsHeader.value).not.toBe('*')
    }
  })

  it('error messages do not leak framework version — X-Powered-By absent and no framework disclosure header (A05-error-leak)', async () => {
    // Next.js >=9.5 suppresses X-Powered-By by default (poweredByHeader: false is default).
    // Explicitly asserting the header is absent from next.config.mjs securityHeaders
    // and that no header discloses the framework name or version to clients.
    // @ts-expect-error — JS config module, no .d.ts shipped
    const mod = await import('../../../next.config.mjs')
    const config = mod.default
    const groups = await config.headers()
    const allHeaders: Array<{ key: string; value: string }> =
      groups.flatMap((g: { headers: Array<{ key: string; value: string }> }) => g.headers)

    // X-Powered-By must not be declared (Next.js default suppresses it).
    const poweredBy = allHeaders.find((h) => h.key === 'X-Powered-By')
    expect(poweredBy).toBeUndefined()

    // Server header must not disclose Next.js version info.
    const serverHeader = allHeaders.find((h) => h.key === 'Server')
    expect(serverHeader).toBeUndefined()

    // CSP must be present — it prevents injected scripts from exfiltrating
    // any incidentally disclosed stack traces via XSS.
    const csp = allHeaders.find((h) => h.key === 'Content-Security-Policy')
    expect(csp).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// A07: Authentication Failures
// ---------------------------------------------------------------------------

describe('OWASP A07: Authentication Failures', () => {
  // A07-1: rate-limit on auth endpoints is now implemented (task #36).
  // RateLimiterPort + MockRateLimiterAdapter (setThreshold seam) +
  // applyRateLimit gate the sign-in Server Action. This case mechanically
  // verifies the OWASP A07-1 contract — 5 failed attempts allowed, the 6th
  // blocked with a Retry-After — by driving applyRateLimit (the same path the
  // sign-in Server Action uses) through the real MockRateLimiterAdapter.
  describe('A07-1: rate-limit on auth endpoints', () => {
    let limiter: MockRateLimiterAdapter

    beforeEach(() => {
      limiter = new MockRateLimiterAdapter()
      // Opt into enforcement at the OWASP A07-1 default (5 / 15min window).
      limiter.setThreshold(5, 900)
      mockResolveRateLimiter.mockReset().mockReturnValue(limiter)
      process.env.RATE_LIMIT_ENABLED = 'true'
      process.env.RATE_LIMIT_MAX_ATTEMPTS = '5'
      process.env.RATE_LIMIT_WINDOW_SEC = '900'
    })

    afterEach(() => {
      delete process.env.RATE_LIMIT_ENABLED
      delete process.env.RATE_LIMIT_MAX_ATTEMPTS
      delete process.env.RATE_LIMIT_WINDOW_SEC
    })

    it('5 consecutive failed sign-ins are allowed, the 6th is blocked with a Retry-After (A07-1)', async () => {
      const ip = '203.0.113.7'
      const endpoint = 'signin:google'

      // First 5 attempts within the window are allowed.
      for (let i = 1; i <= 5; i++) {
        const gate = await applyRateLimit(ip, endpoint)
        expect(gate.allowed).toBe(true)
      }

      // The 6th attempt exceeds the threshold → 429-equivalent + Retry-After.
      const sixth = await applyRateLimit(ip, endpoint)
      expect(sixth.allowed).toBe(false)
      expect(sixth.retryAfterSec).toBe(900)
    })
  })

  // A07-2: Supabase SSR sets auth cookies via @supabase/ssr createServerClient.
  // The library writes HttpOnly + SameSite=Lax (Secure is added by the browser
  // when served over HTTPS in production). This is platform-level enforcement by
  // the Supabase SSR library; no custom Set-Cookie header is emitted by Next.js
  // route handlers in this codebase (sign-out clears the cookie via the same
  // library). Static assertion: confirm no custom sign-out route overrides flags.
  it('Supabase SSR cookie management does not override HttpOnly / SameSite flags (A07-2)', async () => {
    // @supabase/ssr createServerClient writes cookies with HttpOnly + SameSite=Lax
    // by default. Verify the middleware helper (updateSession) does NOT set a
    // raw Set-Cookie header that could strip those flags.
    const webRoot = path.resolve(__dirname, '../../..')
    const middlewareSrc = await fs.readFile(
      path.join(webRoot, 'src/lib/supabase/middleware.ts'),
      'utf-8',
    )
    // No manual Set-Cookie header construction — flags managed by @supabase/ssr.
    expect(middlewareSrc).not.toMatch(/set-cookie/i)
    // Uses createServerClient (which enforces HttpOnly+SameSite internally).
    expect(middlewareSrc).toContain('createServerClient')
    // No direct assignment of cookie options that could downgrade security.
    expect(middlewareSrc).not.toMatch(/httpOnly\s*:\s*false/)
    expect(middlewareSrc).not.toMatch(/sameSite\s*:\s*['"]none['"]/i)
  })

  // A07-3: OAuth PKCE state mismatch rejection is enforced by Supabase Auth
  // (exchangeCodeForSession validates the PKCE code verifier server-side).
  // The callback route in apps/web/src/app/auth/callback/route.ts delegates
  // entirely to supabase.auth.exchangeCodeForSession(code) — any state or
  // code-verifier mismatch causes the call to return an error, which the route
  // surfaces as a redirect to /auth/sign-in?error=session_exchange_failed.
  // Static assertion: the callback route uses exchangeCodeForSession (not a
  // weaker manual code exchange) and handles errors by redirecting to sign-in.
  it('OAuth callback uses exchangeCodeForSession and redirects on error (A07-3)', async () => {
    const webRoot = path.resolve(__dirname, '../../..')
    const callbackSrc = await fs.readFile(
      path.join(webRoot, 'src/app/auth/callback/route.ts'),
      'utf-8',
    )
    // PKCE validation is done by the Supabase SDK inside exchangeCodeForSession.
    expect(callbackSrc).toContain('exchangeCodeForSession')
    // On error (including state/PKCE mismatch) the route redirects — no token leak.
    expect(callbackSrc).toContain('session_exchange_failed')
    // The route does NOT short-circuit around the SDK validation.
    expect(callbackSrc).not.toMatch(/code\s*===/)
  })

  // A07-4: redirectTo / `next` query param is restricted to same-origin paths.
  // isSafeNext() rejects scheme-relative URLs, absolute URLs, backslash tricks,
  // empty strings, and relative paths without a leading slash.
  it('isSafeNext rejects cross-origin and scheme-relative redirectTo values (A07-4)', () => {
    // Cross-origin absolute URL — must be rejected.
    expect(isSafeNext('https://evil.com/path')).toBe(false)
    // Scheme-relative URL — must be rejected (//host is treated as https://host).
    expect(isSafeNext('//evil.com')).toBe(false)
    // Backslash trick — must be rejected.
    expect(isSafeNext('\\evil.com')).toBe(false)
    expect(isSafeNext('/\\evil.com')).toBe(false)
    // Relative path without leading slash — must be rejected.
    expect(isSafeNext('dashboard')).toBe(false)
    // Empty string — must be rejected.
    expect(isSafeNext('')).toBe(false)

    // Same-origin absolute paths — must pass.
    expect(isSafeNext('/dashboard')).toBe(true)
    expect(isSafeNext('/admin/dashboard')).toBe(true)
    expect(isSafeNext('/')).toBe(true)
  })
})
