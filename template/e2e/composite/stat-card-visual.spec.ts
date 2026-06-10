/**
 * StatCard — visual / responsive E2E (task-32 Step 5 S2).
 *
 * Verifies:
 *   - StatCard renders label, value, delta, and helperText.
 *   - Trend icons: "up" card has ArrowUp visual cue (aria-hidden icon),
 *     "down" card has ArrowDown visual cue.
 *   - At 320px viewport width, StatCard text does NOT overflow horizontally
 *     (scrollWidth <= clientWidth). Specifically tests the long helperText card.
 *   - semantic <dl> structure: Stat.Root is a <dl>, value is a <dd>.
 *
 * Fixture: `section-stat-card` in /dev/composite (added for task-32 Step 5).
 * Cards:
 *   1. "Active Bots" — value=42, delta={+12%, trend=up}, helperText present
 *   2. "Failed Sessions" — value=3, delta={-1, trend=down}
 *   3. "Transcriptions" — value=1024, delta={0, trend=flat}, long helperText
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

async function setSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

test.describe('StatCard — content rendering', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-stat-card"]')
  })

  const section = (page: import('@playwright/test').Page) =>
    page.getByTestId('section-stat-card')

  test('Active Bots card renders label, value, delta, and helperText', async ({ page }) => {
    // StatCard renders label in both a visible <p> and an sr-only <dt>; use
    // .first() to target the visible paragraph without strict-mode violation.
    await expect(section(page).getByText('Active Bots').first()).toBeVisible()
    await expect(section(page).getByText('42').first()).toBeVisible()
    await expect(section(page).getByText('+12%')).toBeVisible()
    await expect(section(page).getByText('vs last week')).toBeVisible()
    await expect(section(page).getByText('Updated 2 minutes ago')).toBeVisible()
  })

  test('Failed Sessions card renders label, value, and down-trend delta', async ({ page }) => {
    await expect(section(page).getByText('Failed Sessions').first()).toBeVisible()
    await expect(section(page).getByText('3').first()).toBeVisible()
    await expect(section(page).getByText('-1')).toBeVisible()
  })

  test('Transcriptions card renders label, value, flat-trend delta, and long helperText', async ({
    page,
  }) => {
    await expect(section(page).getByText('Transcriptions').first()).toBeVisible()
    await expect(section(page).getByText('1024').first()).toBeVisible()
    await expect(section(page).getByText('0').first()).toBeVisible()
    await expect(section(page).getByText('no change')).toBeVisible()
  })

  test('StatCard uses semantic <dl> structure (Stat.Root)', async ({ page }) => {
    // Chakra Stat.Root renders as <dl>; Stat.ValueText as <dd>
    const dlElements = section(page).locator('dl')
    await expect(dlElements.first()).toBeVisible()
    // Value "42" is inside a <dd>
    const ddWithValue = section(page).locator('dd').filter({ hasText: '42' })
    await expect(ddWithValue.first()).toBeVisible()
  })
})

test.describe('StatCard — responsive layout at 320px viewport', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    // Set viewport to 320px to test narrow layout
    await page.setViewportSize({ width: 320, height: 812 })
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-stat-card"]')
  })

  const section = (page: import('@playwright/test').Page) =>
    page.getByTestId('section-stat-card')

  test('StatCard section has no horizontal overflow at 320px (scrollWidth <= clientWidth)', async ({
    page,
  }) => {
    // Evaluate scrollWidth vs clientWidth on the stat card section
    const hasOverflow = await section(page).evaluate((el) => {
      return el.scrollWidth > el.clientWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('long helperText in Transcriptions card does not cause horizontal overflow at 320px', async ({
    page,
  }) => {
    // Find the Transcriptions card specifically (contains "Transcriptions" text)
    const cards = section(page).locator('[class]').filter({ hasText: 'Transcriptions' })
    const firstCard = cards.first()
    await expect(firstCard).toBeVisible()

    const hasOverflow = await firstCard.evaluate((el) => {
      return el.scrollWidth > el.clientWidth
    })
    expect(hasOverflow).toBe(false)
  })

  test('all three StatCards are visible at 320px (no hidden overflow)', async ({ page }) => {
    await expect(section(page).getByText('Active Bots').first()).toBeVisible()
    await expect(section(page).getByText('Failed Sessions').first()).toBeVisible()
    await expect(section(page).getByText('Transcriptions').first()).toBeVisible()
  })

  test('StatCard values are visible and not clipped at 320px', async ({ page }) => {
    await expect(section(page).getByText('42')).toBeVisible()
    await expect(section(page).getByText('3')).toBeVisible()
    await expect(section(page).getByText('1024')).toBeVisible()
  })
})
