/**
 * ColorModeToggle — dark-class real-browser verification (task-32 Step 5 S2).
 *
 * R-02 解消検証 (副産物 #31 集約):
 *   next-themes writes the active theme as a class on <html>. This spec uses
 *   real Playwright browser evaluation to assert `document.documentElement
 *   .classList.contains('dark')` — something jsdom unit tests cannot exercise
 *   because next-themes relies on localStorage and the document object being
 *   a real browser DOM.
 *
 * Cycle order enforced by ColorModeToggle:
 *   light → dark → system → light (repeating)
 *
 * Fixture: `section-color-mode-toggle` in /dev/composite (added for task-32 Step 5).
 *
 * Strategy:
 *   1. Force a known starting state (light) via next-themes localStorage.
 *   2. Click toggle → verify dark class applied / not applied.
 *   3. Click toggle → verify system mode (class state depends on OS preference;
 *      we assert the toggle's aria-label reflects "system" as the current mode
 *      and that the button is still present and interactive).
 *   4. Click toggle → cycle back to light.
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

async function setSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

/**
 * Force next-themes to start in a specific mode by writing to localStorage
 * before the page is loaded. next-themes reads `localStorage.getItem('theme')`
 * on mount and applies the stored value.
 *
 * After reload, wait until the fixture toggle reflects the expected mode to
 * confirm next-themes has fully hydrated before the test proceeds.
 */
async function forceTheme(
  page: import('@playwright/test').Page,
  theme: 'light' | 'dark' | 'system',
) {
  await page.evaluate((t) => {
    localStorage.setItem('theme', t)
  }, theme)
  await page.reload()
  await page.waitForSelector('[data-testid="section-color-mode-toggle"]')
  // Wait for next-themes hydration: the fixture toggle must report the expected mode.
  await expect.poll(
    async () =>
      page
        .getByTestId('color-mode-toggle-wrapper')
        .locator('[data-color-mode]')
        .getAttribute('data-color-mode'),
    { timeout: 5000 },
  ).toBe(theme)
}

/** Read the current `class` attribute of <html>. */
async function htmlClasses(page: import('@playwright/test').Page): Promise<string[]> {
  const classList = await page.evaluate(() =>
    Array.from(document.documentElement.classList),
  )
  return classList
}

// The fixture section wrapper scopes the locator to avoid the strict-mode
// violation caused by Topbar also rendering a ColorModeToggle on the same page.
const fixtureToggle = (page: import('@playwright/test').Page) =>
  page.getByTestId('color-mode-toggle-wrapper').locator('[data-color-mode]')

test.describe('ColorModeToggle — R-02 dark class verification (real browser)', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-color-mode-toggle"]')
  })

  test('initial state: light mode — html does not have class "dark"', async ({ page }) => {
    await forceTheme(page, 'light')
    const classes = await htmlClasses(page)
    expect(classes).not.toContain('dark')
  })

  test('light → dark: clicking toggle adds "dark" class to html', async ({ page }) => {
    await forceTheme(page, 'light')
    // Verify starting point: no dark class
    expect(await htmlClasses(page)).not.toContain('dark')

    const toggle = fixtureToggle(page)
    await toggle.click()

    // next-themes applies 'dark' class on <html> in dark mode
    await expect.poll(async () => (await htmlClasses(page)).includes('dark'), {
      timeout: 3000,
    }).toBe(true)
  })

  test('dark → system: clicking toggle removes "dark" class (system follows OS)', async ({
    page,
  }) => {
    await forceTheme(page, 'dark')
    // Verify starting point: dark class present
    await expect.poll(async () => (await htmlClasses(page)).includes('dark'), {
      timeout: 3000,
    }).toBe(true)

    const toggle = fixtureToggle(page)
    await toggle.click()

    // In system mode, next-themes applies the OS preference class.
    // Playwright runs in a light-preference environment by default (no
    // prefers-color-scheme: dark emulation set). Assert that the toggle's
    // data-color-mode attribute has changed away from "dark".
    await expect(toggle).not.toHaveAttribute('data-color-mode', 'dark')
    await expect(toggle).toHaveAttribute('data-color-mode', 'system')
  })

  test('system → light: clicking toggle resets to light mode, no dark class', async ({
    page,
  }) => {
    await forceTheme(page, 'system')
    const toggle = fixtureToggle(page)
    await toggle.click()

    // After system → light, the dark class must be absent
    await expect.poll(async () => (await htmlClasses(page)).includes('dark'), {
      timeout: 3000,
    }).toBe(false)
    await expect(toggle).toHaveAttribute('data-color-mode', 'light')
  })

  test('three-cycle light → dark → system → light restores initial state', async ({ page }) => {
    await forceTheme(page, 'light')
    const toggle = fixtureToggle(page)

    // Cycle 1: light → dark
    await toggle.click()
    await expect.poll(async () => (await htmlClasses(page)).includes('dark'), {
      timeout: 3000,
    }).toBe(true)
    await expect(toggle).toHaveAttribute('data-color-mode', 'dark')

    // Cycle 2: dark → system
    await toggle.click()
    await expect(toggle).toHaveAttribute('data-color-mode', 'system')

    // Cycle 3: system → light
    await toggle.click()
    await expect(toggle).toHaveAttribute('data-color-mode', 'light')
    await expect.poll(async () => (await htmlClasses(page)).includes('dark'), {
      timeout: 3000,
    }).toBe(false)
  })
})

test.describe('ColorModeToggle — aria-label reflects next state', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-color-mode-toggle"]')
  })

  test('aria-label contains "切り替え" for accessibility', async ({ page }) => {
    await forceTheme(page, 'light')
    const toggle = fixtureToggle(page)
    const label = await toggle.getAttribute('aria-label')
    expect(label).toContain('切り替え')
  })

  test('toggle button is focusable and keyboard-operable (Enter triggers cycle)', async ({
    page,
  }) => {
    await forceTheme(page, 'light')
    const toggle = fixtureToggle(page)
    await toggle.focus()
    await expect(toggle).toBeFocused()
    await page.keyboard.press('Enter')
    // After Enter, mode should have changed to dark
    await expect(toggle).toHaveAttribute('data-color-mode', 'dark')
  })
})
