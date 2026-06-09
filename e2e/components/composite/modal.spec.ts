/**
 * Component Gallery — Composite / Modal smoke spec (task-4 Step 4)
 *
 * Tests the gallery card's interactive "Open modal" button and
 * verifies the dialog opens and closes.
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Modal card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'modal')).toBeVisible()
  })

  test('open modal button is visible in preview', async ({ page }) => {
    const preview = cardByEntryId(page, 'modal').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('button', { hasText: 'Open modal' })).toBeVisible()
  })

  test('clicking open modal shows dialog', async ({ page }) => {
    const preview = cardByEntryId(page, 'modal').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await preview.locator('button', { hasText: 'Open modal' }).click()
    await expect(page.locator('[role="dialog"]').first()).toBeVisible()
    // Close
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]').first()).not.toBeVisible()
  })
})
