/**
 * Component Gallery — Typography / Heading smoke spec (task-4 Step 4)
 *
 * Verifies the Heading component card is present in the gallery and
 * that the preview area renders visible content.
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

// task-4 Step 5 iter 2-F (test-automator M-02): axe-core scan は
// `components/axe-core.spec.ts` に集約 (重複削除)。

test.describe('Gallery — Heading card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    const card = cardByEntryId(page, 'heading')
    await expect(card).toBeVisible()
  })

  test('preview area renders content', async ({ page }) => {
    const preview = cardByEntryId(page, 'heading').getByTestId('component-card-preview')
    await expect(preview).toBeVisible()
    await expect(preview).not.toBeEmpty()
  })

  test('snippet area is present', async ({ page }) => {
    const snippet = cardByEntryId(page, 'heading').getByTestId('component-card-snippet')
    await expect(snippet).toBeVisible()
    await expect(snippet).toContainText('Heading')
  })

})
