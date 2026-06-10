/**
 * Component Gallery — Composite / Table smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

// task-4 Step 5 iter 2-F (test-automator M-02): axe-core scan は
// `components/axe-core.spec.ts` に集約 (重複削除)。

test.describe('Gallery — Table card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'table')).toBeVisible()
  })

  test('preview renders a table element', async ({ page }) => {
    const preview = cardByEntryId(page, 'table').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('table').first()).toBeVisible()
  })

  test('table preview shows demo rows', async ({ page }) => {
    const preview = cardByEntryId(page, 'table').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('Alice')
    await expect(preview).toContainText('Bob')
  })

})
