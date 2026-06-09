// apps/web/e2e/auth-rate-limit.spec.ts
// task #36 Step 5 + task #37 Step 6 — E2E for auth rate-limit (OWASP A07-1).
//
// task #37 Step 6 made MockRateLimiterAdapter count per key using the caller's
// env-resolved RateLimitOptions (RATE_LIMIT_MAX_ATTEMPTS) and anchored the
// counter Map on globalThis, so it survives Next.js 14 module isolation and dev
// HMR. The previous version auto-skipped because (a) the runtime never calls the
// setThreshold test seam, so the mock stayed "always allowed", and (b) the
// counter lived on a per-instance field that reset between requests. Both are now
// fixed, so this E2E truly drives a 429.
//
// Runs against playwright.auth.config.ts which starts the dev server with:
//   LOGIN_STRATEGY=email-pass, RATE_LIMIT_ENABLED=true, RATE_LIMIT_MAX_ATTEMPTS=2
// → 2 invalid submissions are allowed, the 3rd is rate-limited with a
//   "Too many attempts. Retry in Ns." error (signInWithPasswordAction L169).
//
// OWASP A07-1 is also verified at the integration layer (vitest, no HMR):
//   - apps/web/src/lib/security/owasp.spec.ts
//   - apps/web/src/lib/interfaces/actions/_shared/rate-limit.integration.spec.ts

import { test, expect } from '@playwright/test'

// playwright.auth.config.ts pins RATE_LIMIT_MAX_ATTEMPTS=2, so the 3rd attempt
// is the first to exceed the threshold.
const MAX_ATTEMPTS = 2

test.describe('auth rate-limit (OWASP A07-1)', () => {
  test.beforeEach(async ({ page }) => {
    // The MockRateLimiterAdapter counter is keyed by IP:endpoint and persists on
    // globalThis across requests (that is the behaviour under test). Local dev has
    // no x-forwarded-for, so every request collapses onto the single key
    // `unknown:signin:password` — meaning the counter carries over between tests.
    //
    // To keep each test independent we cross the threshold once and assert the
    // 429, which is the contract we care about. Clearing cookies just ensures no
    // stray session redirects interfere with reading the alert.
    await page.context().clearCookies()
  })

  test('sign-in form surfaces a 429 rate-limit error after exceeding the threshold', async ({
    page,
  }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    const emailInput = page.getByLabel(/メールアドレス/i)
    const passwordInput = page.getByLabel(/パスワード/i)
    const submitButton = page.getByRole('button', { name: /^サインイン$/ })

    // Require the email-pass form — config pins LOGIN_STRATEGY=email-pass.
    await expect(emailInput).toBeVisible()
    await expect(passwordInput).toBeVisible()

    // The error from signInWithPasswordAction renders as <Alert variant="danger">
    // (data-variant="danger"). The static seed-credential banner is also
    // role="alert" (variant="info"), so scope strictly on the danger alert.
    const dangerAlert = page.locator('[data-variant="danger"]')

    // Submit invalid credentials until the rate-limit error appears. With
    // MAX_ATTEMPTS=2 the 3rd submission is the first to be blocked; the
    // globalThis counter may already hold attempts from a prior test, so allow a
    // small budget but cap it so a genuine failure to count surfaces as a timeout.
    const maxTries = MAX_ATTEMPTS + 2
    let rateLimitSeen = false

    for (let i = 0; i < maxTries; i++) {
      await emailInput.fill(`invalid-rl-${i}@example.com`)
      await passwordInput.fill('wrongpassword')
      await submitButton.click()

      // Wait for the danger alert to render with this submission's outcome.
      await expect(dangerAlert).toBeVisible({ timeout: 12_000 })
      const alertText = (await dangerAlert.textContent()) ?? ''
      if (alertText.includes('Too many attempts') || /Retry in \d+s/.test(alertText)) {
        rateLimitSeen = true
        break
      }
      // Otherwise it is the generic invalid-credential error — loop and count up.
    }

    expect(
      rateLimitSeen,
      'expected a "Too many attempts" rate-limit error within the attempt budget',
    ).toBe(true)

    const rateLimitAlert = page.locator('[role="alert"]').filter({
      hasText: /Too many attempts|Retry in/i,
    })
    await expect(rateLimitAlert.first()).toBeVisible()
  })

  test('rate-limit error message contains Retry-After information', async ({
    page,
  }) => {
    await page.goto('/auth/sign-in', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    const emailInput = page.getByLabel(/メールアドレス/i)
    const passwordInput = page.getByLabel(/パスワード/i)
    const submitButton = page.getByRole('button', { name: /^サインイン$/ })

    await expect(emailInput).toBeVisible()

    // Drive the form to the rate-limited state, then assert the Retry-After
    // suffix is present in the surfaced message (scope on the danger alert).
    const dangerAlert = page.locator('[data-variant="danger"]')
    const maxTries = MAX_ATTEMPTS + 2
    let rateLimitSeen = false

    for (let i = 0; i < maxTries; i++) {
      await emailInput.fill(`rl-retry-${i}@example.com`)
      await passwordInput.fill('wrongpassword')
      await submitButton.click()

      await expect(dangerAlert).toBeVisible({ timeout: 12_000 })
      const alertText = (await dangerAlert.textContent()) ?? ''
      if (alertText.includes('Too many attempts') || /Retry in \d+s/.test(alertText)) {
        rateLimitSeen = true
        break
      }
    }

    expect(
      rateLimitSeen,
      'expected the rate-limit error to surface a Retry-After value',
    ).toBe(true)

    // signInWithPasswordAction formats: `Too many attempts. Retry in ${n}s.`
    const alert = page.locator('[role="alert"]').filter({
      hasText: /Retry in \d+s/i,
    })
    await expect(alert.first()).toBeVisible()
  })
})
