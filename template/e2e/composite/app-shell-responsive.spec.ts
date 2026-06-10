/**
 * AppShell — responsive breakpoint E2E (task-32 Step 5)
 *
 * Verifies that the AppShell layout behaves correctly at four key breakpoints:
 *   - 320px  (mobile)  : sidebar is hidden (display:none), main fills viewport,
 *                        body does not overflow horizontally
 *   - 768px  (tablet)  : sidebar is visible (md breakpoint = 48em = 768px)
 *   - 1024px (desktop) : sidebar is visible, main content is accessible
 *   - 1440px (wide)    : sidebar is visible, main content is accessible
 *
 * Implementation notes:
 *   - AppShell wraps all pages via root layout.tsx; the /bots page provides a
 *     stable target that requires mock_session=admin to pass the middleware guard.
 *   - The sidebar wrapper uses `display={{ base: 'none', md: 'flex' }}` (Chakra
 *     responsive prop). At 320px the sidebar is removed from flow via display:none.
 *   - "Topbar overflow" check: at 320px, body.scrollWidth must not exceed the
 *     viewport width (≤ 320px). Horizontal overflow is a common Topbar regression.
 *   - Chakra's "md" breakpoint is 48em = 768px. At exactly 768px the sidebar
 *     must transition from hidden to visible.
 *   - `data-shell-sidebar` is the stable anchor on the Flex wrapper rendered by
 *     Sidebar.tsx (avoids relying on role/aria which can vary by Chakra version).
 *   - `id="main-content"` is the stable anchor for the scrollable main area.
 */

import { test, expect } from '@playwright/test'

const PAGE = '/bots'

/** Cookie helper — adds mock_session so middleware passes the route. */
async function withSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// 320px — mobile: sidebar hidden, no horizontal overflow
// ─────────────────────────────────────────────────────────────────────────────

test.describe('AppShell — 320px (mobile)', () => {
  test.use({ viewport: { width: 320, height: 812 } })

  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    // Wait for Chakra hydration: the shell root grid must be in the DOM.
    await page.waitForSelector('[data-shell-root]')
  })

  test('sidebar is hidden at 320px', async ({ page }) => {
    // The Box wrapping the Sidebar has display:none at base breakpoint.
    // Chakra renders the wrapper in the DOM but hides it with display:none.
    const sidebarWrapper = page.locator('[data-shell-root] > div').first()
    // The sidebar element itself (data-shell-sidebar) should not be visible.
    // We check the computed display of the parent wrapper Box.
    const isHidden = await page.evaluate(() => {
      const shellRoot = document.querySelector('[data-shell-root]')
      if (!shellRoot) return false
      const firstChild = shellRoot.firstElementChild as HTMLElement | null
      if (!firstChild) return false
      const display = window.getComputedStyle(firstChild).display
      return display === 'none'
    })
    expect(isHidden).toBe(true)
    // Also confirm the sidebar nav element is not visible to Playwright.
    await expect(page.locator('[data-shell-sidebar]')).not.toBeVisible()
  })

  test('main content is visible at 320px', async ({ page }) => {
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('no horizontal overflow at 320px (Topbar does not push body wider)', async ({ page }) => {
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    // body.scrollWidth must not exceed the 320px viewport.
    expect(scrollWidth).toBeLessThanOrEqual(320)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 768px — tablet: sidebar becomes visible (Chakra md breakpoint = 48em)
// ─────────────────────────────────────────────────────────────────────────────

test.describe('AppShell — 768px (tablet / md breakpoint)', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-shell-root]')
  })

  test('sidebar is visible at 768px', async ({ page }) => {
    await expect(page.locator('[data-shell-sidebar]')).toBeVisible()
  })

  test('main content is visible at 768px', async ({ page }) => {
    await expect(page.locator('#main-content')).toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 1024px — desktop: sidebar visible, two-column layout
// ─────────────────────────────────────────────────────────────────────────────

test.describe('AppShell — 1024px (desktop)', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-shell-root]')
  })

  test('sidebar is visible at 1024px', async ({ page }) => {
    await expect(page.locator('[data-shell-sidebar]')).toBeVisible()
  })

  test('main content is visible at 1024px', async ({ page }) => {
    await expect(page.locator('#main-content')).toBeVisible()
  })

  test('sidebar and main content are side-by-side (two-column layout)', async ({ page }) => {
    const sidebarBox = await page.locator('[data-shell-sidebar]').boundingBox()
    const mainBox = await page.locator('#main-content').boundingBox()
    expect(sidebarBox).not.toBeNull()
    expect(mainBox).not.toBeNull()
    if (!sidebarBox || !mainBox) return
    // In a two-column layout the sidebar x-origin is to the left of the main content.
    expect(sidebarBox.x).toBeLessThan(mainBox.x)
    // Both are on the same vertical plane (top positions are close).
    expect(Math.abs(sidebarBox.y - mainBox.y)).toBeLessThan(100)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 1440px — wide desktop: sidebar visible, main content accessible
// ─────────────────────────────────────────────────────────────────────────────

test.describe('AppShell — 1440px (wide desktop)', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-shell-root]')
  })

  test('sidebar is visible at 1440px', async ({ page }) => {
    await expect(page.locator('[data-shell-sidebar]')).toBeVisible()
  })

  test('main content is visible at 1440px', async ({ page }) => {
    await expect(page.locator('#main-content')).toBeVisible()
  })
})
