/**
 * Tabs (pill variant) — keyboard navigation & active-pill rendering
 *
 * Complements tabs-keyboard.spec.ts (which covers the default `underline`
 * variant). The pill variant adds a distinct active-state style: the selected
 * trigger paints `bg: accent.default` + `color: white` (vs. the underline
 * variant's bottom border). This spec asserts:
 *   1. ArrowRight moves focus to the adjacent pill and auto-activates its panel
 *      (Chakra/Ark Tabs default activationMode="automatic").
 *   2. The active pill renders the accent background token (visual signal).
 *
 * The pill tablist lives in <section data-testid="section-tabs-pill"> on the
 * /dev/composite gallery, with items pill1/pill2/pill3 (none disabled).
 */

import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

test.describe('Tabs (pill) — keyboard & active rendering', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.addCookies([
      { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
    ])
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-tabs-pill"]')
  })

  test('first pill panel is visible by default', async ({ page }) => {
    await expect(page.getByTestId('pill-panel-1')).toBeVisible()
    await expect(page.getByTestId('pill-panel-2')).not.toBeVisible()
  })

  test('ArrowRight moves focus to next pill and auto-activates its panel', async ({ page }) => {
    const section = page.getByTestId('section-tabs-pill')
    const firstPill = section.getByRole('tab', { name: 'Pill One' })
    await firstPill.click()
    await expect(firstPill).toBeFocused()

    await page.keyboard.press('ArrowRight')

    const secondPill = section.getByRole('tab', { name: 'Pill Two' })
    await expect(secondPill).toBeFocused()
    // automatic activation: focusing the tab also activates its panel.
    await expect(page.getByTestId('pill-panel-2')).toBeVisible()
    await expect(page.getByTestId('pill-panel-1')).not.toBeVisible()
  })

  test('active pill renders the accent background token', async ({ page }) => {
    const section = page.getByTestId('section-tabs-pill')
    const firstPill = section.getByRole('tab', { name: 'Pill One' })
    await firstPill.click()

    // Selected pill carries Ark's data-selected attribute and the accent bg /
    // white text active styling. We assert the active pill's background differs
    // from an inactive sibling's, confirming the _selected accent token applied.
    const secondPill = section.getByRole('tab', { name: 'Pill Two' })

    // NOTE: Playwright (real browser) only — getComputedStyle().backgroundColor
    // resolves CSS custom properties (e.g. --chakra-colors-accent-default) to
    // actual RGB values in a headed/headless Chromium context.
    // In vitest/jsdom, CSS variables are NOT resolved; getComputedStyle() returns
    // the literal variable string or an empty string, making this comparison
    // meaningless.  Do NOT run this assertion in a jsdom environment.
    const activeBg = await firstPill.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    )
    const inactiveBg = await secondPill.evaluate(
      (el) => getComputedStyle(el).backgroundColor,
    )

    // data-selected is the Ark convention for the active trigger.
    await expect(firstPill).toHaveAttribute('data-selected', '')
    // The active pill must have a non-transparent accent background distinct
    // from the inactive pill (which is transparent / track-colored).
    expect(activeBg).not.toBe(inactiveBg)
    expect(activeBg).not.toBe('rgba(0, 0, 0, 0)')
    expect(activeBg).not.toBe('transparent')
  })

  test('ArrowRight from last pill wraps to first', async ({ page }) => {
    const section = page.getByTestId('section-tabs-pill')
    const thirdPill = section.getByRole('tab', { name: 'Pill Three' })
    await thirdPill.click()
    await expect(thirdPill).toBeFocused()

    await page.keyboard.press('ArrowRight')
    const firstPill = section.getByRole('tab', { name: 'Pill One' })
    await expect(firstPill).toBeFocused()
    await expect(page.getByTestId('pill-panel-1')).toBeVisible()
  })
})
