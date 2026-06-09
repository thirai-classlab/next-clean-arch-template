// apps/web/e2e/middleware.spec.ts
// E2E for Edge Middleware auth + role guard (Wave 6-M).
//
// auth cookie は `mock_session=<role>` で表現 (Edge runtime + MOCK_MODE 妥協、
// draft 06 §4.3 + Wave 6-M 設計)。
// /dashboard と /admin/users 等 target page は Wave 6-K で実装予定なので、
// ここでは middleware の redirect response (status + location) のみ検証する。

import { test, expect } from '@playwright/test'

const APP_HOST = 'http://localhost:3000'

test.describe('Edge Middleware auth + role guard', () => {
  test('unauthenticated /dashboard → 307 redirect /auth/sign-in?next=', async ({
    request,
  }) => {
    const res = await request.get(`${APP_HOST}/dashboard`, {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(307)
    // The guard now round-trips the original path as a sanitized `?next=`
    // (URL-encoded), so the location is `/auth/sign-in?next=%2Fdashboard`.
    expect(res.headers()['location']).toMatch(
      /\/auth\/sign-in\?next=%2Fdashboard$/,
    )
  })

  test('unauthenticated general route / → 307 redirect /auth/sign-in?next=%2F', async ({
    request,
  }) => {
    // Every non-/auth route is now guarded (not just /admin). Home `/` redirects.
    const res = await request.get(`${APP_HOST}/`, {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/auth\/sign-in\?next=%2F$/)
  })

  test('unauthenticated /auth/sign-in → pass through (no redirect loop)', async ({
    request,
  }) => {
    const res = await request.get(`${APP_HOST}/auth/sign-in`, {
      maxRedirects: 0,
    })
    // Rule 3: /auth/* is always public so the sign-in target itself is reachable.
    expect(res.status()).not.toBe(307)
  })

  test('admin role accesses /admin/users → pass through (not redirected to /dashboard)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies([
      {
        name: 'mock_session',
        value: 'admin',
        url: APP_HOST,
      },
    ])
    const res = await ctx.request.get(`${APP_HOST}/admin/users`, {
      maxRedirects: 0,
    })
    // Wave 6-K がまだ無いので 404 が返るが、middleware は redirect しない (307 ではない) ことを確認
    expect(res.status()).not.toBe(307)
    await ctx.close()
  })

  test('member role accesses /admin/users → 307 redirect /dashboard', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies([
      {
        name: 'mock_session',
        value: 'member',
        url: APP_HOST,
      },
    ])
    const res = await ctx.request.get(`${APP_HOST}/admin/users`, {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/dashboard$/)
    await ctx.close()
  })

  // Round-2 追加ケース 1: viewer role が /admin/users にアクセス → 307 redirect /dashboard
  // (unit test の auth-guard.spec.ts に対称する E2E カバレッジ)
  test('viewer role accesses /admin/users → 307 redirect /dashboard', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies([
      {
        name: 'mock_session',
        value: 'viewer',
        url: APP_HOST,
      },
    ])
    const res = await ctx.request.get(`${APP_HOST}/admin/users`, {
      maxRedirects: 0,
    })
    expect(res.status()).toBe(307)
    expect(res.headers()['location']).toMatch(/\/dashboard$/)
    await ctx.close()
  })

  // Round-2 追加ケース 2: /api/** パスはミドルウェア matcher の対象外
  // middleware.ts の matcher は `api` を除外しているため (静的 asset / _next/ も除外)、
  // /api/** は middleware をパスする → 未認証でも 307 redirect が来ない
  test('unauthenticated /api/health → middleware bypass (no 307 redirect)', async ({
    request,
  }) => {
    const res = await request.get(`${APP_HOST}/api/health`, {
      maxRedirects: 0,
    })
    // middleware の redirect (307) が来ないことを確認
    // Route Handler が存在しない場合は 404 が返る — それも 307 でないので OK
    expect(res.status()).not.toBe(307)
  })

  // Round-2 追加ケース 3: 認証済 admin が /auth/sign-in にアクセス → redirect なし (現仕様)
  //
  // NOTE: 現在の decideMiddleware 実装 (auth-guard.ts) は
  // 「認証済 user が /auth/sign-in にアクセスしても /dashboard に redirect しない」仕様。
  // Rule 1: !role && !pathname.startsWith('/auth') → redirect sign-in  (未認証のみ)
  // Rule 2: pathname.startsWith('/admin') && role !== 'admin' → redirect dashboard
  // /auth/sign-in は Rule 1 / Rule 2 どちらにも該当しないため next() が返る。
  //
  // TDD RED: 認証済 admin が /auth/sign-in にアクセス時に /dashboard redirect する仕様は
  // Phase 3 で auth-guard.ts に Rule 3 として実装予定。
  // 現時点では「redirect が来ない」ことを確認する (既仕様の記録)。
  test('authenticated admin accesses /auth/sign-in → no redirect (current behavior; Phase 3 will add dashboard redirect)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext()
    await ctx.addCookies([
      {
        name: 'mock_session',
        value: 'admin',
        url: APP_HOST,
      },
    ])
    const res = await ctx.request.get(`${APP_HOST}/auth/sign-in`, {
      maxRedirects: 0,
    })
    // 現仕様: middleware は /auth/** をパスするため redirect しない
    expect(res.status()).not.toBe(307)
    await ctx.close()
  })
})
