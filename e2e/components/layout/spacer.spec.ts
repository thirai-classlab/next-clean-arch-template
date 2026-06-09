/**
 * Component Gallery — Layout / Spacer smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Spacer card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'spacer')).toBeVisible()
  })

  test('preview renders before/after labels', async ({ page }) => {
    const preview = cardByEntryId(page, 'spacer').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('before')
    await expect(preview).toContainText('after')
  })
})
