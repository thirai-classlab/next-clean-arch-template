/**
 * apps/web/e2e/template-iso/_helpers/mock-oauth.ts
 *
 * H-01 decision (template-isolated-test.md §Q3):
 *   mockGoogleOAuth implements auth simulation via page.context().addCookies().
 *   The cookie value is the role string directly — not JSON-encoded.
 *
 * Rationale:
 *   - MOCK_MODE=true env has no real Google OAuth flow to intercept.
 *   - middleware.ts reads `request.cookies.get('mock_session')?.value` and
 *     passes it directly to decideMiddleware() as the role string.
 *   - JSON.stringify would break the role comparison in auth-guard.ts.
 *
 * Compatible with:
 *   - apps/web/e2e/middleware.spec.ts     (addCookies pattern)
 *   - apps/web/e2e/admin-panel.spec.ts    (contextForRole helper)
 *   - apps/web/e2e/components-phase-a/    (setMockSession helper)
 *
 * The `email` parameter is accepted for documentation/audit purposes only.
 * It is not embedded in the cookie value because middleware.ts uses the
 * value solely as a role string.
 *
 * M2: APP_HOST / cookie url resolved from BASE_URL env (set by playwright.config.ts
 * or CI env) with fallback to localhost:3000. Hard-coded 'http://localhost:3000'
 * removed to support configurable test environments.
 */

import type { Page } from '@playwright/test'

/** Base URL for cookie scoping. Resolved from BASE_URL env or default localhost. */
const APP_HOST = process.env.BASE_URL ?? 'http://localhost:3000'

export interface MockOAuthOptions {
  /** User email — used for test documentation only, not sent in cookie. */
  email: string
  /**
   * Role string injected as mock_session cookie value.
   * Valid values: 'admin' | 'member' | 'viewer' | 'pending'
   * Omit (no cookie) to simulate unauthenticated (anon) access.
   */
  role: string
}

/**
 * Simulate a Google OAuth sign-in by injecting a mock_session cookie
 * into the page context. This replicates the auth state used by
 * middleware.ts in MOCK_MODE=true without touching real OAuth endpoints.
 *
 * Call this before page.goto() to ensure the cookie is set before
 * the first navigation that triggers middleware evaluation.
 *
 * @example
 * await mockGoogleOAuth(page, { email: 'admin@example.com', role: 'admin' })
 * await page.goto('/admin/dashboard')
 */
export async function mockGoogleOAuth(
  page: Page,
  opts: MockOAuthOptions,
): Promise<void> {
  await page.context().addCookies([
    {
      name: 'mock_session',
      value: opts.role,
      url: APP_HOST,
    },
  ])
}
