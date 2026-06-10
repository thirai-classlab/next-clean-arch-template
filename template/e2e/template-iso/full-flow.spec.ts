/**
 * apps/web/e2e/template-iso/full-flow.spec.ts
 *
 * Task-7 Step 4 — Template Isolated Test: Full lifecycle E2E (real assertions)
 * R1 re-scope: apps/web is treated as the template surface (in-repo).
 *
 * task-35 fix verified: MOCK_MODE admin operations (invite/audit) now work.
 *   - addAllowList server action: ensureContainer() registers InMemoryAllowedUserRepository
 *     + InMemoryAuditLogRepository as Singletons; getAuthenticatedSession() reads
 *     mock_session cookie (auth-helper cookie fallback, task-35 f95b3c3).
 *   - Modal open + close are real assertions (test 1b) — no defensive branch.
 *
 * task-35 Step 2d fix (globalThis store + token resolution):
 *   test 1d now asserts rowCount >= 1 because:
 *   (1) InMemoryAuditLogRepository uses globalThis.__recall_poc_auditLogStore__
 *       so the Map is shared across Next.js App Router module contexts in the
 *       same Node.js process (Prisma dev singleton pattern).
 *   (2) admin-data.ts now uses REPOSITORY_TOKENS from @/lib/infrastructure/container
 *       (string keys: 'AuditLogRepository') instead of @/lib/application/repositories/tokens
 *       (Symbol keys: Symbol.for('recall_poc.AuditLogRepository')), so
 *       container.resolve() finds the registered InMemoryAuditLogRepository Singleton.
 *
 * Coverage scope (template-iso smoke):
 *   This file covers core admin lifecycle smoke + auth block checks only.
 *   Full role × page access matrix (35-case) is delegated to admin-panel.spec.ts.
 *   Full matrix is intentionally NOT duplicated here to keep this file focused.
 *
 * Tests:
 *   Suite 1 — admin lifecycle (serial order, test.describe.serial)
 *     test 1a — admin → /admin/dashboard visible
 *     test 1b — admin → allow-list add: modal open (real assert) → submit → modal close (real assert)
 *     test 1c — admin → /admin/users visible
 *     test 1d — admin → /admin/audit-log: cross-context audit row visible (rowCount >= 1, real assert)
 *   Suite 2 — admin page coverage: additional pages + role block smoke
 *     test 2a — admin → /admin/settings visible
 *     test 2b — admin → /admin/pending-approvals visible
 *     test 2c — admin → /admin/users/mock-user-id visible
 *     test 2d — member accessing /admin/* → 307 redirect to /dashboard
 *     test 2e — viewer accessing /admin/* → 307 redirect to /dashboard
 *   Suite 3 — unauthenticated user block (M-04)
 *     test 3a — anon → /admin/* 307 to /auth/sign-in
 *     test 3b — member → /admin/* 307 to /dashboard
 *
 * Auth model (H-01 decision):
 *   mockGoogleOAuth wraps page.context().addCookies([{ name:'mock_session', value: role }]).
 *   This matches the pattern used in admin-panel.spec.ts and middleware.spec.ts.
 *
 * Divergence from draft sketch (template-isolated-test.md §Step 2):
 *   - Draft used getByLabel('Email') + getByRole('button', { name: 'Add' })
 *     for allow-list form. Actual implementation uses:
 *       getByRole('button', { name: 'Allow list に追加' }) to open modal
 *       + data-testid="allow-list-email-input" for the email field
 *       + data-testid="allow-list-add-button" to submit
 *     (verified from AllowListManager.tsx + admin-panel.spec.ts Step 2)
 *   - Draft expected /auth/access-denied for blocked user. Actual:
 *       unauthenticated user → 307 redirect to /auth/sign-in (auth-guard.ts Rule 1)
 *       'member' role → 307 redirect to /dashboard (auth-guard.ts Rule 2)
 *       There is no /auth/access-denied route in the codebase.
 *   - AllowListManager success: setOpen(false) closes modal → dialog becomes hidden.
 *     Verified from AllowListManager.tsx onAdd() line 38 (setOpen(false) on success).
 *
 * MOCK_MODE=true is set by playwright.config.ts webServer.env.
 * Role enforcement always applies via the mock_session cookie.
 */

import { test, expect, request } from '@playwright/test'
import { mockGoogleOAuth } from './_helpers/mock-oauth'
import { openAllowListModal } from './_helpers/open-allow-list-modal'

const APP_HOST = process.env.BASE_URL ?? 'http://localhost:3000'

/**
 * Pre-compile Next.js 14 App Router pages by fetching them before any test runs.
 * Dev server compiles pages lazily on first request; without warm-up, the first
 * Playwright test to hit an uncompiled page may time out (h1 not yet rendered).
 *
 * This is especially important when running against a clean MOCK server (no .next
 * cache) as required by task-35 Step 2d validation.
 */
test.beforeAll(async ({ }, testInfo) => {
  if (testInfo.workerIndex !== 0) return // only worker 0 needs to warm up
  const adminPages = [
    '/admin/dashboard',
    '/admin/allow-list',
    '/admin/users',
    '/admin/audit-log',
    '/admin/settings',
    '/admin/pending-approvals',
    '/admin/users/mock-user-id',
  ]
  const ctx = await request.newContext({ baseURL: APP_HOST })
  for (const path of adminPages) {
    await ctx.get(path, {
      headers: { Cookie: 'mock_session=admin' },
      timeout: 20000,
      maxRedirects: 0,
    }).catch(() => { /* ignore redirect / error — just trigger compilation */ })
  }
  await ctx.dispose()
  // Wait for server-side compilation to settle before first test runs.
  await new Promise((resolve) => setTimeout(resolve, 3000))
})

// ─── Suite 1: Admin lifecycle (serial — ordered lifecycle flow) ──────────────
//
// test.describe.serial ensures 1a → 1b → 1c → 1d run in order within one worker.
// Serial is intentional: 1d asserts audit rowCount >= 1 after 1b writes the
// allow_list.add audit entry via the globalThis-backed InMemoryAuditLogRepository
// (task-35 Step 2d fix).

test.describe.serial('Template full flow: admin lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
  })

  test('1a — admin login → /admin/dashboard renders h1', async ({ page }) => {
    await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()
  })

  test('1b — admin → allow-list add flow: modal open → fill → submit → modal close', async ({ page }) => {
    // Real assertion: task-35 (f95b3c3) wired MOCK_MODE cookie fallback in
    // getAuthenticatedSession() and registered InMemoryAllowedUserRepository in the
    // DI container. addAllowList server action now succeeds in MOCK_MODE.
    //
    // Diagnosed (task-35 E2E run 2026-06-01):
    //   Warm server: Server Action POST returns HTTP 200. addAllowList returns
    //   { success: true }. toast.success('Allow list に追加しました') fires.
    //   However modal does NOT close within 8 s.
    //   Root cause (app code, not DI): Next.js 14 App Router auto router.refresh()
    //   after the Server Action interacts with AllowListManager's React state.
    //   AllowListManager uses startTransition(async () => {...}) — React 18 does
    //   not support async callbacks in startTransition; the state updates
    //   (setEmail/setOpen) may execute outside the transition, racing with the
    //   RSC re-render that Next.js triggers automatically post-Server-Action.
    //   Fix required in AllowListManager.tsx (not in this E2E spec).
    //
    // Expected flow:
    //   1. Click "Allow list に追加" → dialog opens (real assert, no defensive branch)
    //   2. Fill email input → click submit button
    //   3. AllowListManager.onAdd() calls addAllowList(email) → { success: true }
    //   4. setOpen(false) → dialog becomes hidden (real assert)
    //   5. InMemoryAuditLogRepository receives allow_list.add entry (verified in 1d)
    await page.goto('/admin/allow-list', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()

    // Wait for React hydration: Next.js 14 App Router RSC + Client Component
    // hydration must complete before the modal button onClick is attached.
    await page.waitForLoadState('networkidle')

    // Open modal — retry click loop is encapsulated in openAllowListModal helper.
    // Handles Chakra Portal async mount and hydration lag in Next.js 14 dev server.
    await openAllowListModal(page)

    const emailInput = page.getByTestId('allow-list-email-input')
    await emailInput.fill('test-user@example.com')

    const addButton = page.getByTestId('allow-list-add-button')
    await expect(addButton).toBeEnabled()

    // Intercept the Server Action POST to confirm HTTP 200 before asserting modal close.
    // This pattern mirrors test 4a: ensures the action bundle is compiled and DI resolved.
    // If the POST returns 500 (cold-start bundle compilation), the test fails correctly
    // rather than entering a retry loop that would send a duplicate email and trigger
    // ConflictError on second submit (causing modal to never close).
    const serverActionResponse = page.waitForResponse(
      (resp) => resp.request().method() === 'POST' && resp.url().includes('/admin/allow-list'),
      { timeout: 20000 }
    )
    await addButton.click()
    const resp = await serverActionResponse
    expect(resp.status()).toBe(200)

    // Real assertion: email input (and thus the modal) must be hidden after success.
    // task-35 complete (2026-06-01): AllowListManager.onAdd() calls setOpen(false)
    // then router.refresh(). Modal close confirmed working in real Chrome
    // (commits fdd5750 + fb1f2fe). This assertion must pass.
    // Timeout 20 s: router.refresh() in dev server triggers RSC re-fetch + DI
    // container bootstrap; the full cycle can take 5-10 s in headless Playwright.
    await expect(page.getByTestId('allow-list-email-input')).toBeHidden({ timeout: 20000 })
  })

  test('1c — admin → /admin/users renders h1', async ({ page }) => {
    await page.goto('/admin/users', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()
  })

  test('1d — admin → /admin/audit-log: cross-context audit row visible after allow-list add (task-35 Step 2d)', async ({ page }) => {
    // task-35 Step 2d fix:
    //   InMemoryAuditLogRepository now uses a globalThis-backed Map, so the entry
    //   written by the Server Action (test 1b: addAllowList → withAudit →
    //   InMemoryAuditLogRepository.save) is visible from the Server Component
    //   (loadAuditLogs → GetAuditLogsUseCase → InMemoryAuditLogRepository.findSince)
    //   in the same Node.js process.
    //
    //   Additionally, admin-data.ts now uses REPOSITORY_TOKENS from
    //   @/lib/infrastructure/container (string keys) instead of
    //   @/lib/application/repositories/tokens (Symbol keys), so container.resolve()
    //   finds the registered InMemoryAuditLogRepository Singleton correctly.
    //
    // Cross-context real assertion:
    //   After test 1b submitted the allow-list add form, an audit entry was written.
    //   Navigating to /admin/audit-log should show at least 1 audit row.
    await page.goto('/admin/audit-log', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()

    // Real assertion: audit log row must exist (cross-context globalThis store).
    // If rowCount === 0 here, the globalThis store fix or token-resolution fix did
    // not work — report as a real failure, not a tautology.
    const rowLocator = page.locator('[data-testid="audit-log-row"]')
    await expect(rowLocator.first()).toBeVisible({ timeout: 10000 })
    const rowCount = await rowLocator.count()
    expect(rowCount).toBeGreaterThanOrEqual(1)

    // Verify column headers are rendered (confirms table structure, not just row count)
    await expect(
      page.getByRole('columnheader', { name: /actor|action|Actor|Action/i }).first()
    ).toBeVisible()
  })
})

// ─── Suite 2: Additional admin page coverage + role block smoke ───────────────

test.describe('Template full flow: admin page coverage + role block', () => {
  // H6: cover 3 pages missing from Suite 1 (/admin/settings, /admin/pending-approvals, /admin/users/[id])
  // + member/viewer block smoke (1-2 tests each, pattern from admin-panel.spec.ts).

  test('2a — admin → /admin/settings renders h1', async ({ page }) => {
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
    await page.goto('/admin/settings', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()
  })

  test('2b — admin → /admin/pending-approvals renders h1', async ({ page }) => {
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
    await page.goto('/admin/pending-approvals', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()
  })

  test('2c — admin → /admin/users/mock-user-id renders h1', async ({ page }) => {
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })
    await page.goto('/admin/users/mock-user-id', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()
  })

  test('2d — member accessing /admin/dashboard → 307 redirect to /dashboard', async ({ browser }) => {
    // Pattern from admin-panel.spec.ts: HTTP-level maxRedirects:0 + location check.
    const ctx = await browser.newContext()
    await ctx.addCookies([{ name: 'mock_session', value: 'member', url: APP_HOST }])
    const res = await ctx.request.get(`${APP_HOST}/admin/dashboard`, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/dashboard/)
    await ctx.close()
  })

  test('2e — viewer accessing /admin/dashboard → 307 redirect to /dashboard', async ({ browser }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies([{ name: 'mock_session', value: 'viewer', url: APP_HOST }])
    const res = await ctx.request.get(`${APP_HOST}/admin/dashboard`, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/dashboard/)
    await ctx.close()
  })
})

// ─── Suite 3: Unauthenticated user block (M-04) ──────────────────────────────

test.describe('Non-allowed-list user signin → block (M-04)', () => {
  test('3a — unauthenticated request to /admin/* is redirected to /auth/sign-in', async ({ browser }) => {
    // M-04 decision: verify that a user without mock_session cookie (anon)
    // cannot access admin pages.
    //
    // Divergence from draft: draft expected /auth/access-denied route.
    // Actual: auth-guard.ts Rule 1 redirects unauthenticated access to
    // /auth/sign-in with HTTP 307. There is no /auth/access-denied route.
    // Verification uses HTTP-level redirect check (same pattern as admin-panel.spec.ts).
    const ctx = await browser.newContext()
    const res = await ctx.request.get(`${APP_HOST}/admin/dashboard`, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/auth\/sign-in/)
    await ctx.close()
  })

  test('3b — non-admin authenticated user (member) accessing /admin/* is redirected to /dashboard', async ({ browser }) => {
    // A user who is authenticated but has 'member' role (not in admin allow-list
    // for admin panel) hits Rule 2 in auth-guard.ts and is redirected to /dashboard.
    const ctx = await browser.newContext()
    await ctx.addCookies([{ name: 'mock_session', value: 'member', url: APP_HOST }])
    const res = await ctx.request.get(`${APP_HOST}/admin/dashboard`, { maxRedirects: 0 })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/dashboard/)
    await ctx.close()
  })
})

// ─── Suite 4: Server Action + audit-log cross-context verification (independent) ─
//
// This suite is intentionally independent of Suite 1 (not serial-dependent).
// It verifies the DI runtime fix by:
//   (a) submitting the allow-list Server Action directly via UI
//   (b) checking that an audit entry appears on /admin/audit-log
//
// The modal-close bug in AllowListManager (startTransition async + Next.js
// router.refresh() race) does NOT affect this suite because:
//   - We wait for the Server Action POST response (HTTP 200) rather than
//     waiting for the modal to close.
//   - After the Server Action succeeds, we navigate directly to audit-log.
//
// This is the definitive proof that the DI container (task-35 literal-path fix)
// works end-to-end: Server Action → DI resolve → InMemoryAuditLogRepository.save
// → globalThis store → GET /admin/audit-log renders the row.

test.describe('Suite 4: Server Action DI proof — audit-log cross-context', () => {
  test('4a — allow-list add Server Action succeeds (HTTP 200) and audit row appears', async ({ page }) => {
    await mockGoogleOAuth(page, { email: 'admin@classlab.co.jp', role: 'admin' })

    // Step 1: Navigate to allow-list, wait for hydration.
    await page.goto('/admin/allow-list', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()
    await page.waitForLoadState('networkidle')

    // Step 2: Open modal — retry click loop is encapsulated in openAllowListModal helper.
    await openAllowListModal(page)
    await page.getByTestId('allow-list-email-input').fill('suite4-test@example.com')

    // Step 3: Click add and wait for the Server Action POST to complete.
    // We intercept the POST response (HTTP 200 = action bundle compiled + DI resolved).
    // If it times out the action bundle was not compiled — test fails correctly.
    const serverActionResponse = page.waitForResponse(
      (resp) => resp.request().method() === 'POST' && resp.url().includes('/admin/allow-list'),
      { timeout: 20000 }
    )

    const addBtn = page.getByTestId('allow-list-add-button')
    await expect(addBtn).toBeEnabled()
    await addBtn.click()

    const resp = await serverActionResponse
    // Positive assertion 1: Server Action returned HTTP 200 (not 500).
    // HTTP 200 means: ensureContainer() ran, MockAuthAdapter resolved,
    // mock_session cookie read, AddAllowedUserUseCase executed, AuditLogRepository.save called.
    expect(resp.status()).toBe(200)

    // Step 4: Navigate to audit-log and verify at least 1 row exists.
    // The InMemoryAuditLogRepository uses globalThis-backed Map (task-35 Step 2d fix),
    // so the entry written by the Server Action is visible across module contexts.
    await page.goto('/admin/audit-log', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1, [data-admin-page-title]')).toBeVisible()

    // Positive assertion 2: audit row visible in cross-context read.
    const rowLocator = page.locator('[data-testid="audit-log-row"]')
    await expect(rowLocator.first()).toBeVisible({ timeout: 10000 })
    const rowCount = await rowLocator.count()
    expect(rowCount).toBeGreaterThanOrEqual(1)

    // Positive assertion 3: column headers confirm table structure.
    await expect(
      page.getByRole('columnheader', { name: /actor|action|Actor|Action/i }).first()
    ).toBeVisible()
  })
})
