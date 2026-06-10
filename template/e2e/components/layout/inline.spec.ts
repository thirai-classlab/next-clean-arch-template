/**
 * Component Gallery — Layout / Inline smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Inline card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'inline')).toBeVisible()
  })

  test('preview renders inline buttons', async ({ page }) => {
    const preview = cardByEntryId(page, 'inline').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('One')
    await expect(preview).toContainText('Two')
    await expect(preview).toContainText('Three')
  })
})
