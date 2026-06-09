/**
 * Component Gallery — Layout / Container smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Container card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'container')).toBeVisible()
  })

  test('preview renders container content', async ({ page }) => {
    const preview = cardByEntryId(page, 'container').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('max-width sm')
  })
})
