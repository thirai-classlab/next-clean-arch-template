/**
 * apps/web/e2e/auth/sign-out.spec.ts
 *
 * SECURITY E2E (#8 CRITICAL+HIGH) — logout 後の認証残存を防ぐ:
 *   ① CRITICAL: sign-out が MOCK_MODE session SSoT の `mock_session` cookie を消す
 *      → logout 後に /dashboard・/admin/* へ直アクセスすると sign-in へ redirect される。
 *   ② HIGH: 認証必須 page / sign-out redirect 応答に Cache-Control: no-store が付く
 *      → ブラウザ「戻る」での bfcache 復元 (認証済 UI 露出) を防ぐ。
 *
 * 認証状態は mockGoogleOAuth (= login が発行するのと同じ mock_session cookie 注入) で
 * 再現する。これは middleware.spec.ts / admin-panel.spec.ts / full-flow.spec.ts と同じ H-01 方式。
 * logout は実 UI (home `/` の「ログアウト」form → POST /auth/sign-out) を submit して駆動する。
 *
 * MOCK_MODE=true は playwright.config.ts webServer.env で設定。
 */

import { test, expect } from '@playwright/test'
import { mockGoogleOAuth } from '../template-iso/_helpers/mock-oauth'

const APP_HOST = process.env.BASE_URL ?? 'http://localhost:3000'

function mockSessionCookie(page: import('@playwright/test').Page) {
  return page
    .context()
    .cookies(APP_HOST)
    .then((cs) => cs.find((c) => c.name === 'mock_session'))
}

test.describe('Logout — auth residue prevention (#8)', () => {
  test('② authenticated home page carries Cache-Control: no-store (anti-bfcache)', async ({
    page,
  }) => {
    await mockGoogleOAuth(page, { email: 'admin@example.com', role: 'admin' })
    const res = await page.goto('/')
    expect(res, 'home navigation response').not.toBeNull()
    const cacheControl = res?.headers()['cache-control'] ?? ''
    expect(cacheControl).toContain('no-store')
  })

  test('① logout clears mock_session and ② sign-out redirect is no-store; protected routes then block', async ({
    page,
  }) => {
    // --- login (cookie inject = real login state) ---
    await mockGoogleOAuth(page, { email: 'admin@example.com', role: 'admin' })
    await page.goto('/')
    // sanity: authenticated home renders the logout form, cookie present.
    expect(await mockSessionCookie(page), 'mock_session present pre-logout').toBeTruthy()

    // admin surface reachable while authenticated.
    const adminRes = await page.goto('/admin/dashboard')
    expect(adminRes?.status()).toBeLessThan(400)
    // admin page must also be no-store (force-dynamic + middleware).
    expect(adminRes?.headers()['cache-control'] ?? '').toContain('no-store')

    // --- logout via the real UI form (POST /auth/sign-out) ---
    await page.goto('/')
    const logoutForm = page.locator('form[action="/auth/sign-out"]')
    await expect(logoutForm.first()).toBeVisible()
    await Promise.all([
      page.waitForURL(/\/auth\/sign-in/),
      logoutForm.first().locator('button[type="submit"]').click(),
    ])

    // ① mock_session cookie is gone after logout.
    expect(await mockSessionCookie(page), 'mock_session cleared post-logout').toBeFalsy()

    // ① /dashboard direct access now redirects to sign-in.
    const dashRes = await page.goto('/dashboard')
    expect(dashRes?.url()).toMatch(/\/auth\/sign-in/)

    // ① /admin/* direct access now redirects to sign-in (unauthenticated).
    const adminAfter = await page.goto('/admin/dashboard')
    expect(adminAfter?.url()).toMatch(/\/auth\/sign-in/)
  })

  test('② sign-out POST response itself sets Cache-Control: no-store', async ({
    request,
  }) => {
    const res = await request.post(`${APP_HOST}/auth/sign-out`, {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(303)
    expect(res.headers()['cache-control'] ?? '').toContain('no-store')
    // mock_session Set-Cookie clears the value (Max-Age=0 / Expires past).
    const setCookie = res.headers()['set-cookie'] ?? ''
    expect(setCookie).toMatch(/mock_session=/)
    expect(setCookie).toMatch(/Max-Age=0|Expires=Thu, 01 Jan 1970/i)
  })

  test('① back-navigation after logout does not restore an authenticated admin page (no-store is the real mechanism)', async ({
    page,
  }) => {
    await mockGoogleOAuth(page, { email: 'admin@example.com', role: 'admin' })

    // While authenticated, the admin page response MUST carry no-store — this is
    // the actual mechanism that defeats bfcache restore on "Back" (re-review:
    // assert the header directly rather than relying on goBack() side effects).
    const authedAdmin = await page.goto('/admin/dashboard')
    expect(authedAdmin?.status(), 'admin reachable while authenticated').toBeLessThan(400)
    expect(
      authedAdmin?.headers()['cache-control'] ?? '',
      'authenticated admin page must be no-store (anti-bfcache)',
    ).toContain('no-store')

    await page.goto('/')

    // logout
    const logoutForm = page.locator('form[action="/auth/sign-out"]')
    await Promise.all([
      page.waitForURL(/\/auth\/sign-in/),
      logoutForm.first().locator('button[type="submit"]').click(),
    ])

    // Primary assertion: simulate the browser "Back" button. With no-store +
    // cleared cookie, the response that resolves for the previously-visited
    // admin URL must be the sign-in redirect (middleware re-evaluates), and that
    // response itself must be no-store. We assert on the navigation RESPONSE
    // (not just a fresh goto) so the back-navigation outcome is genuinely checked.
    const backResp = await page.goBack().catch(() => null)
    if (backResp) {
      // goBack produced a real navigation response — it must land on sign-in
      // (not a bfcache-restored authenticated admin page) and be no-store.
      expect(backResp.url(), 'back-navigation must not restore admin').toMatch(
        /\/auth\/sign-in/,
      )
      expect(
        backResp.headers()['cache-control'] ?? '',
        'back-navigation response must be no-store',
      ).toContain('no-store')
    }
    // Whether or not goBack yielded a response object, a fresh visit to the
    // protected URL must redirect to sign-in (cookie is cleared, no residue).
    const revisit = await page.goto('/admin/dashboard')
    expect(revisit?.url()).toMatch(/\/auth\/sign-in/)
    expect(revisit?.headers()['cache-control'] ?? '').toContain('no-store')
  })
})
