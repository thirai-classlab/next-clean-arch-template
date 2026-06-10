/**
 * Drawer — keyboard & focus E2E
 *
 * Resolves HIGH finding from Step 4b-1 test-design review:
 * "keyboard/focus behavior の E2E 欠落 (Drawer)"
 *
 * Current Drawer component (Drawer.tsx) structure:
 *   ChakraDrawer.Root > Portal > ChakraDrawer.Content
 *     > ChakraDrawer.Header (title text, non-focusable)
 *     > ChakraDrawer.Body (children, non-interactive <p> text in the fixture)
 *
 * The fixture page renders two Drawers:
 *   - Left  (data-testid="drawer-left-trigger"  / "drawer-left-content")
 *   - Right (data-testid="drawer-right-trigger" / "drawer-right-content")
 *
 * NOTE on Tab wrap-around:
 *   Chakra/Ark Drawer delegates focus-trap to @zag-js/dialog.  The Drawer
 *   component now renders a `Drawer.CloseTrigger` (data-testid="drawer-close")
 *   in its header, so every drawer panel exposes at least one focusable control
 *   in addition to the panel itself.  Zag's focus-trap therefore cycles focus
 *   between those focusable elements and never escapes the panel — Tab from the
 *   last focusable wraps back to the first.  The wrap-around test below asserts
 *   that Tab keeps focus inside the drawer (it never lands on the page trigger
 *   that opened it, which lives outside the panel).
 */

import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

/** Add mock_session cookie so the middleware passes the /dev/* route. */
async function withSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Left Drawer
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Drawer (left) — keyboard & focus', () => {
  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    // Wait for the composite page to fully hydrate before interacting.
    // Chakra v3 Portal components need the React tree to be hydrated before
    // the Drawer.Root can respond to trigger clicks.
    await page.waitForSelector('[data-testid="composite-page"]')
    await page.waitForSelector('[data-testid="drawer-left-trigger"]')
  })

  test('opens on trigger click and shows content', async ({ page }) => {
    await page.getByTestId('drawer-left-trigger').click()
    await expect(page.getByTestId('drawer-left-content')).toBeVisible()
  })

  test('Escape closes the drawer', async ({ page }) => {
    const trigger = page.getByTestId('drawer-left-trigger')
    await trigger.click()
    // Chakra v3 Portal Drawer animates in; wait for content to be visible
    await expect(page.getByTestId('drawer-left-content')).toBeVisible({ timeout: 8000 })

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('drawer-left-content')).not.toBeVisible()
  })

  test('trigger receives focus after Escape closes drawer', async ({ page }) => {
    const trigger = page.getByTestId('drawer-left-trigger')
    await trigger.click()
    await expect(page.getByTestId('drawer-left-content')).toBeVisible({ timeout: 8000 })

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('drawer-left-content')).not.toBeVisible()

    // Chakra/Ark (Zag) Dialog returns focus to the element that opened the
    // dialog when it is dismissed via Escape.
    await expect(trigger).toBeFocused()
  })

  test('drawer has dialog role and aria-modal attribute', async ({ page }) => {
    await page.getByTestId('drawer-left-trigger').click()
    await expect(page.getByTestId('drawer-left-content')).toBeVisible({ timeout: 8000 })

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  // ── Tab wrap-around (focus trap) ─────────────────────────────────────────
  // The Drawer now renders a Drawer.CloseTrigger (data-testid="drawer-close"),
  // so the panel has a focusable dismiss control. Zag's focus-trap keeps focus
  // inside the panel: pressing Tab repeatedly never moves focus to the page
  // trigger that opened the drawer (which lives outside the panel).
  test('Tab key wraps focus within drawer (focus trap)', async ({ page }) => {
    const trigger = page.getByTestId('drawer-left-trigger')
    await trigger.click()
    await expect(page.getByTestId('drawer-left-content')).toBeVisible({ timeout: 8000 })

    const closeBtn = page.getByTestId('drawer-close')
    await expect(closeBtn).toBeVisible()

    // Focus the close button explicitly, then Tab forward several times. Zag's
    // focus-trap must keep focus inside the drawer panel the whole time — it
    // must never land on the page trigger (outside the panel).
    //
    // NOTE: the /dev/composite gallery also renders Tooltip/Popover, which
    // mount their own `[role="dialog"]` (data-scope="popover") nodes. We target
    // the Drawer's panel specifically via data-scope="dialog" data-part="content"
    // so the containment check is not confused by the popover dialog node.
    //
    // Containment check uses a two-selector strategy to guard against Ark version
    // upgrades silently changing internal data-scope/data-part attributes:
    //   Primary:   data-scope="dialog" data-part="content"  (Ark internal — containment)
    //   Secondary: data-testid="drawer-close" visibility  (project-owned stable anchor)
    //
    // Note: data-testid="drawer-left-content" is on the <p> body text element
    // inside ChakraDrawer.Body, NOT on the ChakraDrawer.Content panel container,
    // so it cannot be used for contains(activeElement) containment checks.
    // The close-button testid is the stable project-owned anchor: if Ark renames
    // data-scope/data-part, the close button becomes invisible and this test fails
    // loudly rather than silently passing.
    const DRAWER_PANEL = '[data-scope="dialog"][data-part="content"]'

    await closeBtn.focus()
    await expect(closeBtn).toBeFocused()

    for (let i = 0; i < 4; i++) {
      await page.keyboard.press('Tab')
      // Focus must stay inside the open drawer panel, never escaping to the
      // trigger that opened it.
      await expect(trigger).not.toBeFocused()
      // Primary: activeElement must be inside the Ark dialog panel container.
      const focusedInPanel = await page.evaluate((sel) => {
        const panel = document.querySelector(sel)
        return panel?.contains(document.activeElement) ?? false
      }, DRAWER_PANEL)
      expect(focusedInPanel).toBe(true)
      // Secondary guard: close button (stable project-owned testid) must still be
      // visible, confirming the panel is rendered and the scope selector is valid.
      await expect(closeBtn).toBeVisible()
    }

    // Shift+Tab (reverse) also stays trapped within the panel.
    await page.keyboard.press('Shift+Tab')
    await expect(trigger).not.toBeFocused()
    const stillTrapped = await page.evaluate((sel) => {
      const panel = document.querySelector(sel)
      return panel?.contains(document.activeElement) ?? false
    }, DRAWER_PANEL)
    expect(stillTrapped).toBe(true)
    await expect(closeBtn).toBeVisible()
  })

  test('close button dismisses the drawer', async ({ page }) => {
    const trigger = page.getByTestId('drawer-left-trigger')
    await trigger.click()
    await expect(page.getByTestId('drawer-left-content')).toBeVisible({ timeout: 8000 })

    await page.getByTestId('drawer-close').click()
    await expect(page.getByTestId('drawer-left-content')).not.toBeVisible()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Right Drawer
// ─────────────────────────────────────────────────────────────────────────────

test.describe('Drawer (right) — keyboard & focus', () => {
  test.beforeEach(async ({ page, context }) => {
    await withSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="composite-page"]')
    await page.waitForSelector('[data-testid="drawer-right-trigger"]')
  })

  test('opens on trigger click and shows content', async ({ page }) => {
    await page.getByTestId('drawer-right-trigger').click()
    await expect(page.getByTestId('drawer-right-content')).toBeVisible()
  })

  test('Escape closes the right drawer', async ({ page }) => {
    const trigger = page.getByTestId('drawer-right-trigger')
    await trigger.click()
    await expect(page.getByTestId('drawer-right-content')).toBeVisible({ timeout: 8000 })

    await page.keyboard.press('Escape')

    await expect(page.getByTestId('drawer-right-content')).not.toBeVisible()
  })

  test('trigger receives focus after Escape closes right drawer', async ({ page }) => {
    const trigger = page.getByTestId('drawer-right-trigger')
    await trigger.click()
    await expect(page.getByTestId('drawer-right-content')).toBeVisible({ timeout: 8000 })

    await page.keyboard.press('Escape')
    await expect(page.getByTestId('drawer-right-content')).not.toBeVisible()

    await expect(trigger).toBeFocused()
  })
})
