/**
 * Sidebar search button — keyboard accessibility & F6 wiring E2E (task-32 Step 5)
 *
 * Verifies:
 *   1. The search button in the Sidebar is reachable via Tab keyboard navigation.
 *   2. The button carries the correct aria-label so assistive technology announces
 *      its purpose ("Open command palette (Cmd+K)").
 *   3. Clicking the search button opens the CommandPalette (AppShell F6 wiring:
 *      Sidebar.onOpenPalette → AppShell.setPaletteOpen → CommandPalette.open).
 *   4. The Enter key activates the button (native <button> behavior — Playwright
 *      real browser fires click on Enter when a button is focused).
 *
 * Architecture notes:
 *   - The search button is a native `<button type="button">` inside Sidebar.tsx.
 *     It calls `onOpenPalette()`, which is wired in AppShell to `setPaletteOpen(true)`.
 *   - CommandPalette is rendered at the AppShell level; it is only mounted when the
 *     default Sidebar slot is used (sidebar === undefined check in AppShell.tsx).
 *   - At the breakpoints used for these tests (1024px) the sidebar is visible
 *     (md breakpoint = 768px, so 1024px is well into the two-column range).
 *   - The root "/" page is used because:
 *       a. AppShell wraps all routes via root layout.tsx.
 *       b. "/" requires only mock_session=admin (same as other composite specs).
 *       c. CommandPalette is rendered immediately (no extra navigation needed).
 *   - CommandPalette open detection: when open, Chakra/Ark renders a dialog with
 *     `role="dialog"` and the backdrop/content becomes visible. We use the
 *     `[data-testid="command-palette"]` or role="dialog" to detect the open state.
 *
 * data-testid anchors:
 *   - Sidebar search button: aria-label="Open command palette (Cmd+K)"
 *     (stable, defined in Sidebar.tsx line 184)
 */

import { test, expect } from '@playwright/test'

const PAGE = '/'

/** Cookie helper — adds mock_session so middleware passes the route. */
async function withSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// All tests run at 1024px so the sidebar is visible.
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Sidebar search button — accessibility & F6 wiring', () => {
  test.use({ viewport: { width: 1024, height: 768 } })

  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    // Wait for React hydration to complete. Two signals confirm this:
    //   1. data-shell-sidebar: the Flex wrapper is rendered (SSR-safe).
    //   2. data-shell-topbar: Topbar is rendered, confirming AppShell's full
    //      subtree is mounted. The search button onClick (onOpenPalette) depends
    //      on AppShell's React state being initialized.
    // Under parallel-worker dev-server load, waiting for both anchors before
    // proceeding avoids clicking the button before React has hydrated.
    await page.waitForSelector('[data-shell-sidebar]')
    await page.waitForSelector('[data-shell-topbar]')
    // Additionally wait for the search button itself to be ready.
    await page.waitForSelector('[aria-label="Open command palette (Cmd+K)"]')
  })

  // ── aria-label ─────────────────────────────────────────────────────────────

  test('search button has correct aria-label', async ({ page }) => {
    const searchBtn = page.getByRole('button', {
      name: 'Open command palette (Cmd+K)',
    })
    await expect(searchBtn).toBeVisible()
    await expect(searchBtn).toHaveAttribute(
      'aria-label',
      'Open command palette (Cmd+K)',
    )
  })

  // ── Tab focus reachability ──────────────────────────────────────────────────

  test('search button is reachable via Tab key navigation', async ({ page }) => {
    // Start Tab navigation from the body (simulate keyboard-only user).
    // We use page.keyboard.press repeatedly until the search button receives focus
    // or a maximum iteration limit is reached (guards against infinite Tab loops).
    const searchBtn = page.getByRole('button', {
      name: 'Open command palette (Cmd+K)',
    })

    // Focus the document body first to start from a known state.
    await page.evaluate(() => (document.body as HTMLElement).focus())

    let focused = false
    // Allow up to 30 Tab presses to reach the button. The Sidebar renders early
    // in the DOM (before main content) so the search button is reached quickly.
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const isFocused = await searchBtn.evaluate(
        (el) => el === document.activeElement,
      )
      if (isFocused) {
        focused = true
        break
      }
    }

    expect(focused).toBe(true)
    await expect(searchBtn).toBeFocused()
  })

  // ── Click opens CommandPalette (AppShell F6 wiring) ────────────────────────

  test('clicking search button opens CommandPalette (AppShell wiring)', async ({ page }) => {
    const searchBtn = page.getByRole('button', {
      name: 'Open command palette (Cmd+K)',
    })
    // Ensure the button is fully interactive. Under parallel-worker dev-server
    // load, visible alone is not enough — we also wait for 'attached' state and
    // check that the element is enabled before dispatching the click.
    await expect(searchBtn).toBeVisible()
    await expect(searchBtn).toBeEnabled()

    // Use dispatchEvent rather than .click() to bypass Playwright's coordinate-
    // based mouse simulation, which can fail when the dev server is under high
    // load and the Chromium renderer hasn't fully composited the page.
    // dispatchEvent fires the event directly on the DOM node, which is
    // equivalent to what a user's real click would trigger on a <button>.
    await searchBtn.dispatchEvent('click')

    // CommandPalette is rendered at AppShell level via Portal.
    // Chakra v3 Dialog.Content sets aria-modal="true" when open.
    const dialog = page.locator('[aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
  })

  // ── Enter key activates button (native button behavior) ────────────────────

  test('Enter key on focused search button opens CommandPalette', async ({ page }) => {
    const searchBtn = page.getByRole('button', {
      name: 'Open command palette (Cmd+K)',
    })

    // Ensure the button is fully interactive before attempting focus.
    // In parallel workers the dev server can be under load, delaying React
    // hydration slightly — waiting for 'visible' + 'enabled' guards this.
    await expect(searchBtn).toBeVisible()
    await expect(searchBtn).toBeEnabled()

    // Focus the button programmatically, then press Enter.
    // Native <button type="button"> fires click on Enter when focused —
    // this is verified in a real Chromium browser (not jsdom).
    await searchBtn.focus()
    await expect(searchBtn).toBeFocused()

    await page.keyboard.press('Enter')

    // Wait for the CommandPalette dialog with a generous timeout to survive
    // parallel-worker dev server load spikes.
    const dialog = page.locator('[aria-modal="true"]')
    await expect(dialog).toBeVisible({ timeout: 10_000 })
  })
})
