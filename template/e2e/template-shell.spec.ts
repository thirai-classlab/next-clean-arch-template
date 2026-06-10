/**
 * apps/web/e2e/template-shell.spec.ts
 *
 * task-34 template-shell-usage-nav E2E spec
 *
 * Coverage:
 *   - Step 1: Home usage guide section assertions
 *   - Step 2: Sidebar nav assertions (Step 4 R2-F1 で完成)
 *   - Step 3: Component gallery assertions (Step 4 R2-F1 で gallery assertions 強化)
 *
 * TDD state:
 *   Step 1 describe: RED → GREEN (Step 1 commit で実装済み)
 *   Step 2 describe: RED → GREEN (Step 4 R2-F1 で fixme 解消)
 *   Step 3 describe: RED → GREEN (Step 4 R2-F1 で gallery assertions 強化)
 *
 * Prerequisites:
 *   pnpm --filter @recall-poc/web dev が port 3000 で起動済であること
 *   MOCK_MODE=true (playwright.config.ts 既定)
 *   baseURL = http://localhost:3000 (playwright.config.ts use.baseURL)
 */

import { test, expect } from '@playwright/test'

// ─── Step 1: Home usage guide ─────────────────────────────────────────────────

test.describe('Home usage guide', () => {
  test('usage guide section renders on home page', async ({ page }) => {
    await page.goto('/')

    // セクション全体が表示されること
    const section = page.getByTestId('usage-guide')
    await expect(section).toBeVisible()
  })

  test('usage guide heading is visible', async ({ page }) => {
    await page.goto('/')

    // "テンプレートの使い方" または Usage 系のヘッダが表示されること
    await expect(
      page.getByRole('heading', { name: /テンプレートの使い方|Usage|使い方/ }),
    ).toBeVisible()
  })

  test('all 5 guide item titles are visible', async ({ page }) => {
    await page.goto('/')

    const section = page.getByTestId('usage-guide')

    // 5 項目それぞれの見出しテキストが表示されること
    // getByRole('heading') を使って strict mode 違反を防ぐ
    // ('MOCK_MODE' は h3 見出しとコードブロック内の両方に存在するため)
    await expect(section.getByRole('heading', { name: 'Component gallery' })).toBeVisible()
    await expect(section.getByRole('heading', { name: 'Admin panel' })).toBeVisible()
    await expect(section.getByRole('heading', { name: 'MOCK_MODE' })).toBeVisible()
    await expect(section.getByRole('heading', { name: '起動コマンド' })).toBeVisible()
    await expect(section.getByRole('heading', { name: 'Clean architecture 4 層' })).toBeVisible()
  })

  test('Component gallery link points to /admin/dev/components', async ({
    page,
  }) => {
    await page.goto('/')

    const section = page.getByTestId('usage-guide')
    const galleryLink = section.getByRole('link', {
      name: /Component gallery/,
    })

    await expect(galleryLink).toBeVisible()
    await expect(galleryLink).toHaveAttribute('href', '/admin/dev/components')
  })

  test('Admin panel link points to /admin/dashboard', async ({ page }) => {
    await page.goto('/')

    const section = page.getByTestId('usage-guide')
    const adminLink = section.getByRole('link', { name: /Admin panel/ })

    await expect(adminLink).toBeVisible()
    await expect(adminLink).toHaveAttribute('href', '/admin/dashboard')
  })
})

// ─── Step 2: Sidebar nav ─────────────────────────────────────────────────────
// Step 4 R2-F1 で fixme を実 assertion に置換

test.describe('Sidebar nav', () => {
  test('renders Component 一覧 and 管理画面 links', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByTestId('primary-nav')
    await expect(nav.getByRole('link', { name: 'Component 一覧' })).toBeVisible()
    await expect(nav.getByRole('link', { name: '管理画面' })).toBeVisible()
  })

  test('does NOT contain legacy Recall.ai placeholder nav items', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByTestId('primary-nav')
    // legacy 11 routes — none should appear in the primary nav
    const legacyNames = [
      /Bots/i,
      /Transcription/i,
      /Realtime/i,
      /Breakout/i,
      /Media Output/i,
      /Recordings/i,
      /Webhooks/i,
      /Calendar/i,
      /Compliance/i,
      /Desktop SDK/i,
      /Mobile SDK/i,
    ]
    for (const name of legacyNames) {
      await expect(nav.getByRole('link', { name })).toHaveCount(0)
    }
  })

  test('Component 一覧 link navigates to /admin/dev/components', async ({ page }) => {
    await page.goto('/')
    const nav = page.getByTestId('primary-nav')
    await nav.getByRole('link', { name: 'Component 一覧' }).click()
    await page.waitForURL(/\/admin\/dev\/components/)
    await expect(page.getByRole('heading', { level: 1, name: /Component Library Gallery/i })).toBeVisible()
  })
})

// ─── Step 3: Component gallery ───────────────────────────────────────────────
// task-34 Step 3 / Step 4 R2-F1: 情報設計改善 (category grouping + descriptions + sticky nav)
// gallery assertions は F2 (CategoryNav initial active) / F4 (FilterBar 削除) / F5 (tabpanel ARIA) の
// 実装完了を前提としている。Step 5 で集中 E2E 検証を行う。

test.describe('Component gallery', () => {
  test('component gallery page renders with heading', async ({ page }) => {
    await page.goto('/admin/dev/components')

    // ページ h1 が表示されること
    await expect(page.getByRole('heading', { level: 1, name: /Component Library Gallery/ })).toBeVisible()
  })

  test('sticky category nav renders with all 7 category tabs', async ({ page }) => {
    await page.goto('/admin/dev/components')

    const nav = page.getByTestId('category-nav')
    await expect(nav).toBeVisible()

    // CATEGORY_ORDER.length === 7 (catalog SSoT) — exact count
    const tablist = nav.getByRole('tablist')
    const tabs = tablist.getByRole('tab')
    await expect(tabs).toHaveCount(7)
  })

  test('all 7 category sections render with h2 headings', async ({ page }) => {
    await page.goto('/admin/dev/components')

    // 7 つの category section h2 が全て表示されること
    const expectedCategories = [
      'Typography',
      'Primitive',
      'Composite',
      'Feedback',
      'Layout',
      'Domain',
      'Nav / Shell',
    ]

    for (const categoryLabel of expectedCategories) {
      await expect(
        page.getByRole('heading', { level: 2, name: new RegExp(categoryLabel) }),
      ).toBeVisible()
    }
  })

  test('each category section contains at least one component card', async ({ page }) => {
    await page.goto('/admin/dev/components')

    const sections = page.getByTestId('category-section')
    const count = await sections.count()
    // CATEGORY_ORDER.length === 7 (catalog SSoT)
    expect(count).toBe(7)

    // 最初の section に card が1件以上あること (Typography は implemented)
    const firstSection = sections.first()
    const cards = firstSection.getByTestId('component-card')
    await expect(cards.first()).toBeVisible()
  })

  test('category section shows description text beneath heading', async ({ page }) => {
    await page.goto('/admin/dev/components')

    // Typography section の description が表示されること
    const typographySection = page.getByTestId('category-section').filter({
      has: page.getByRole('heading', { name: /Typography/ }),
    })
    const description = typographySection.getByTestId('category-description')
    await expect(description).toBeVisible()
    // description が空でないこと + Typography の description キーワード確認 (catalog SSoT)
    await expect(description).toContainText('Heading')
  })

  test('initial active tab is typography on page load', async ({ page }) => {
    await page.goto('/admin/dev/components')

    const nav = page.getByTestId('category-nav')
    const tablist = nav.getByRole('tablist')
    // F2 実装: CATEGORY_ORDER[0] = 'typography' が初期 active
    const typographyTab = tablist.getByTestId('category-nav-tab-typography')
    await expect(typographyTab).toHaveAttribute('aria-selected', 'true')
  })

  test('clicking domain tab toggles aria-selected states', async ({ page }) => {
    await page.goto('/admin/dev/components')

    const nav = page.getByTestId('category-nav')
    const tablist = nav.getByRole('tablist')

    const typographyTab = tablist.getByTestId('category-nav-tab-typography')
    const domainTab = tablist.getByTestId('category-nav-tab-domain')

    // domain tab をクリック
    await domainTab.click()

    // domain が active になること
    await expect(domainTab).toHaveAttribute('aria-selected', 'true')
    // typography が inactive になること
    await expect(typographyTab).toHaveAttribute('aria-selected', 'false')
  })

  test('clicking a category nav tab scrolls to that section (toBeInViewport)', async ({ page }) => {
    await page.goto('/admin/dev/components')

    const nav = page.getByTestId('category-nav')
    const tablist = nav.getByRole('tablist')
    // Domain tab をクリック
    const domainTab = tablist.getByTestId('category-nav-tab-domain')
    await expect(domainTab).toBeVisible()
    await domainTab.click()

    // Domain section が viewport 内に表示されること (Playwright 1.35+)
    const domainSection = page.getByTestId('category-section').filter({
      has: page.getByRole('heading', { name: /Domain/ }),
    })
    await expect(domainSection).toBeInViewport()
  })

  test('each CategorySection has role=tabpanel with aria-labelledby pointing to its tab', async ({ page }) => {
    await page.goto('/admin/dev/components')

    // F5 実装: CategorySection に role="tabpanel" + aria-labelledby が追加される
    // CATEGORY_ORDER 7 件全てに対してアサーション
    const categories = ['typography', 'primitive', 'composite', 'feedback', 'layout', 'domain', 'nav-shell']
    for (const cat of categories) {
      const section = page.locator(`#category-section-${cat}`)
      await expect(section).toHaveAttribute('role', 'tabpanel')
      // aria-labelledby は CategoryNav の tab button id を指す (APG Tabs Pattern)
      await expect(section).toHaveAttribute('aria-labelledby', `category-nav-tab-${cat}`)
    }
  })

  test('category description content matches catalog SSoT keywords', async ({ page }) => {
    await page.goto('/admin/dev/components')

    // typography: CATEGORY_DESCRIPTIONS['typography'] に 'Heading' が含まれる
    const typographySection = page.getByTestId('category-section').filter({
      has: page.getByRole('heading', { name: /Typography/ }),
    })
    await expect(typographySection.getByTestId('category-description')).toContainText('Heading')

    // composite: CATEGORY_DESCRIPTIONS['composite'] に 'assemble' が含まれる
    const compositeSection = page.getByTestId('category-section').filter({
      has: page.getByRole('heading', { name: /Composite/ }),
    })
    await expect(compositeSection.getByTestId('category-description')).toContainText('assemble')
  })
})
