/**
 * Component Gallery — Feedback / Spinner smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Spinner card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'spinner')).toBeVisible()
  })

  test('preview renders spinner with aria-label', async ({ page }) => {
    const preview = cardByEntryId(page, 'spinner').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    // Spinner must have aria-label per component contract
    const spinner = preview.locator('[aria-label]').first()
    await expect(spinner).toBeVisible()
  })

  test('snippet references Spinner', async ({ page }) => {
    await expect(cardByEntryId(page, 'spinner').getByTestId('component-card-snippet')).toContainText('Spinner')
  })
})
