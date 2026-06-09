/**
 * Component Gallery — Layout / Grid smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Grid card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'grid')).toBeVisible()
  })

  test('preview renders grid cells', async ({ page }) => {
    const preview = cardByEntryId(page, 'grid').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('A')
    await expect(preview).toContainText('B')
    await expect(preview).toContainText('C')
  })
})
