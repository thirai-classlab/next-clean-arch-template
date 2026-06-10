/**
 * Component Gallery — Nav / Shell placeholder smoke spec (task-4 Step 4)
 *
 * All 18 nav-shell components are "placeholder" status (phase="future").
 * Each card renders a 🚧 card with `data-status="placeholder"`.
 * We consolidate all 18 into one spec file to reduce maintenance overhead.
 *
 * task-4 Step 5 iter 2-F (test-automator M-01): 各 placeholder test を
 * `test.describe.parallel()` 配下で独立 test として report に表示する。
 * Playwright で `for (const id) { test(...) }` は仕様上は test 個別 filter 可能
 * (`-g "placeholder card visible: nav-sidebar"`) だが、name が動的生成のため
 * IDE / report の検索性が下がる。`test.describe.parallel(id, ...)` でグループ化し、
 * 各 placeholder の検索性を改善する。
 */
import { test, expect } from '@playwright/test'
import { gotoGallery } from './_helpers'

/**
 * All 18 nav-shell placeholder entry ids from component-catalog.ts.
 */
const NAV_SHELL_IDS = [
  'nav-sidebar',
  'nav-topbar',
  'nav-app-shell',
  'nav-breadcrumb',
  'nav-command-palette',
  'nav-menu',
  'nav-user-menu',
  'nav-account-switcher',
  'nav-notification-center',
  'nav-help-popover',
  'nav-page-header',
  'nav-section-header',
  'nav-footer',
  'nav-tab-bar-mobile',
  'nav-stepper',
  'nav-toolbar',
  'nav-overflow-menu',
  'nav-locale-switcher',
] as const

test.describe('Gallery — Nav / Shell placeholder cards', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
    // Scroll to the nav-shell category section to ensure cards are in view
    const navSection = page.locator('[data-testid="category-section"][data-category="nav-shell"]')
    await navSection.scrollIntoViewIfNeeded()
  })

  // 各 placeholder の独立 test を `describe.parallel` でグループ化。
  // `for...test` ループでも個別実行は可能だが、describe で囲むことで report の
  // ツリー表示 + filtering (`-g "nav-sidebar"`) が改善する。
  test.describe.parallel('individual placeholder cards', () => {
    for (const id of NAV_SHELL_IDS) {
      test(`placeholder card visible: ${id}`, async ({ page }) => {
        const card = page.locator(`[data-testid="component-card"][data-entry-id="${id}"]`)
        await card.scrollIntoViewIfNeeded()
        await expect(card).toBeVisible()
        // data-status must be "placeholder"
        await expect(card).toHaveAttribute('data-status', 'placeholder')
      })
    }
  })

  test('nav-shell category section contains 18 placeholder cards', async ({ page }) => {
    const navSection = page.locator('[data-testid="category-section"][data-category="nav-shell"]')
    const cards = navSection.locator('[data-testid="component-card"]')
    await expect(cards).toHaveCount(18)
  })

  test('all nav-shell cards show placeholder status badge', async ({ page }) => {
    const navSection = page.locator('[data-testid="category-section"][data-category="nav-shell"]')
    const statusBadges = navSection.locator('[data-testid="component-card-status"]')
    const count = await statusBadges.count()
    expect(count).toBe(18)
    // Each badge should contain the placeholder text
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toContainText('placeholder')
    }
  })

  test('placeholder preview shows 未実装 message', async ({ page }) => {
    // Spot-check the first placeholder card
    const firstCard = page.locator(`[data-testid="component-card"][data-entry-id="nav-sidebar"]`)
    await firstCard.scrollIntoViewIfNeeded()
    const preview = firstCard.getByTestId('component-card-preview')
    await expect(preview).toContainText('未実装')
  })
})
