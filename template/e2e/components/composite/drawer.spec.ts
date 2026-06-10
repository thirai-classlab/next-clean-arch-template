/**
 * Component Gallery — Composite / Drawer smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Drawer card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'drawer')).toBeVisible()
  })

  test('open drawer button is visible in preview', async ({ page }) => {
    const preview = cardByEntryId(page, 'drawer').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('button', { hasText: 'Open drawer' })).toBeVisible()
  })

  test('clicking open drawer shows dialog', async ({ page }) => {
    const preview = cardByEntryId(page, 'drawer').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await preview.locator('button', { hasText: 'Open drawer' }).click()
    await expect(page.locator('[role="dialog"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.locator('[role="dialog"]').first()).not.toBeVisible()
  })
})
