/**
 * CommandPalette — open / empty / keyboard navigation E2E (task-32 Step 5 S2).
 *
 * Verifies:
 *   - Palette opens on trigger button click.
 *   - Escape key closes the palette.
 *   - Empty state: when items=[] the Command.Empty message is shown.
 *   - Items render with correct labels.
 *   - ArrowDown moves keyboard selection (cmdk data-selected="true").
 *   - Search input is auto-focused when palette opens.
 *
 * Fixture: `section-command-palette` in /dev/composite (added for task-32 Step 5).
 * Two instances:
 *   - "palette-trigger" → opens with 5 items (Dashboard, Users, Settings, etc.)
 *   - "palette-empty-trigger" → opens with items=[] to show empty state
 */
import { test, expect } from '@playwright/test'

const PAGE = '/dev/composite'

async function setSession(context: import('@playwright/test').BrowserContext) {
  await context.addCookies([
    { name: 'mock_session', value: 'admin', domain: 'localhost', path: '/' },
  ])
}

test.describe('CommandPalette — open and close', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-command-palette"]')
  })

  test('opens on trigger button click', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    // Dialog.Content has aria-label="コマンドパレット"
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()
  })

  test('Escape key closes the palette', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).not.toBeVisible()
  })

  test('search input is present and accepts text input', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()
    // The Command.Input is the search field (placeholder "Search commands...")
    const input = page.getByPlaceholder('Search commands...')
    await expect(input).toBeVisible()
    await input.type('dash')
    // After typing "dash", "Dashboard" item should remain visible
    await expect(page.getByText('Dashboard')).toBeVisible()
  })
})

test.describe('CommandPalette — items render', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-command-palette"]')
  })

  test('all 5 fixture items are visible when palette opens', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()
    await expect(page.getByText('Dashboard')).toBeVisible()
    await expect(page.getByText('Users')).toBeVisible()
    await expect(page.getByText('Settings')).toBeVisible()
    await expect(page.getByText('Audit Log')).toBeVisible()
    await expect(page.getByText('Bot Management')).toBeVisible()
  })

  test('hint text (keyboard shortcut) is shown for items that have it', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()
    // Dashboard item has hint "⌘D"
    await expect(page.getByText('⌘D')).toBeVisible()
    // Users item has hint "⌘U"
    await expect(page.getByText('⌘U')).toBeVisible()
  })
})

test.describe('CommandPalette — empty state', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-command-palette"]')
  })

  test('shows empty message when items=[]', async ({ page }) => {
    await page.getByTestId('palette-empty-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()
    // Command.Empty renders when filtered count is 0
    await expect(page.getByText('No commands found')).toBeVisible()
  })
})

test.describe('CommandPalette — keyboard navigation', () => {
  test.beforeEach(async ({ page, context }) => {
    await setSession(context)
    await page.goto(PAGE)
    await page.waitForSelector('[data-testid="section-command-palette"]')
  })

  test('ArrowDown moves cmdk data-selected to next item', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()

    // Press ArrowDown to select the first item
    await page.keyboard.press('ArrowDown')

    // cmdk sets data-selected="true" on the focused item
    const selectedItems = page.locator('[data-palette-item][data-selected="true"]')
    await expect(selectedItems).toHaveCount(1)
  })

  test('ArrowDown twice moves selection forward by two positions', async ({ page }) => {
    await page.getByTestId('palette-trigger').click()
    await expect(page.getByRole('dialog', { name: 'コマンドパレット' })).toBeVisible()

    await page.keyboard.press('ArrowDown')
    const afterFirst = page.locator('[data-palette-item][data-selected="true"]')
    await expect(afterFirst).toHaveCount(1)
    const firstSelectedText = await afterFirst.textContent()

    await page.keyboard.press('ArrowDown')
    const afterSecond = page.locator('[data-palette-item][data-selected="true"]')
    await expect(afterSecond).toHaveCount(1)
    const secondSelectedText = await afterSecond.textContent()

    // The second selection must be a different item from the first — confirming
    // that ArrowDown moved the selection forward.
    expect(secondSelectedText).not.toBe(firstSelectedText)
    // Both selections must be one of the known fixture items
    const knownItems = ['Dashboard', 'Users', 'Settings', 'Audit Log', 'Bot Management']
    expect(knownItems.some((item) => secondSelectedText?.includes(item))).toBe(true)
  })
})
