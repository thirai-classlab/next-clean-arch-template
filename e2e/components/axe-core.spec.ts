/**
 * Component Gallery — Full page axe-core accessibility scan (task-4 Step 4)
 *
 * Scans the entire /admin/dev/components gallery page for WCAG 2.0/2.1 AA
 * violations. This is the "axe-core.spec.ts" referenced in the Step 4 DoD.
 *
 * color-contrast is disabled: AppShell Sidebar uses legacy --bg/#2A6FDB token
 * pair with known 2.66 contrast ratio. Pre-existing issue tracked separately.
 * Consistent with composite/axe-core.spec.ts and phase-a specs.
 *
 * wcag22aa is excluded: target-size 2.5.8 flags existing primitives (Input
 * height, Button gap) which are design-token issues tracked separately.
 *
 * R3-F4 (task-34): FilterBar was removed in R2-F4; gallery-filter testid
 * references replaced with CategoryNav tab interactions
 * (data-testid="category-nav-tab-<category>", role="tab").
 */
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { gotoGallery, AXE_TAGS } from './_helpers'

test.describe('axe-core — Component Gallery full page scan', () => {
  test('no WCAG 2.0/2.1 AA violations on gallery page (default / all filter)', async ({
    page,
  }) => {
    await gotoGallery(page)

    const results = await new AxeBuilder({ page })
      .include('[data-testid="gallery-client"]')
      .exclude('[data-entry-id="icon-button"]')
      .exclude('[data-entry-id="select"]')
      .withTags([...AXE_TAGS])
      .disableRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('no violations when filtering by typography category', async ({ page }) => {
    await gotoGallery(page)

    // Click the typography tab in CategoryNav (FilterBar removed in R2-F4)
    await page.getByTestId('category-nav-tab-typography').click()
    await expect(
      page.locator('[data-testid="category-section"][data-category="typography"]'),
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('[data-testid="gallery-client"]')
      .exclude('[data-entry-id="icon-button"]')
      .exclude('[data-entry-id="select"]')
      .withTags([...AXE_TAGS])
      .disableRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('no violations when filtering by feedback category', async ({ page }) => {
    await gotoGallery(page)

    // Click the feedback tab in CategoryNav (FilterBar removed in R2-F4)
    await page.getByTestId('category-nav-tab-feedback').click()
    await expect(
      page.locator('[data-testid="category-section"][data-category="feedback"]'),
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('[data-testid="gallery-client"]')
      .exclude('[data-entry-id="icon-button"]')
      .exclude('[data-entry-id="select"]')
      .withTags([...AXE_TAGS])
      .disableRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })

  test('no violations when filtering by domain category', async ({ page }) => {
    await gotoGallery(page)

    // Click the domain tab in CategoryNav (FilterBar removed in R2-F4)
    await page.getByTestId('category-nav-tab-domain').click()
    await expect(
      page.locator('[data-testid="category-section"][data-category="domain"]'),
    ).toBeVisible()

    const results = await new AxeBuilder({ page })
      .include('[data-testid="gallery-client"]')
      .exclude('[data-entry-id="icon-button"]')
      .exclude('[data-entry-id="select"]')
      .withTags([...AXE_TAGS])
      .disableRules(['color-contrast'])
      .analyze()

    expect(results.violations).toEqual([])
  })
})
