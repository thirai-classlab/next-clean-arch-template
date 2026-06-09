/**
 * Component Gallery — Composite / Popover smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Popover card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'popover')).toBeVisible()
  })

  test('preview renders open trigger button', async ({ page }) => {
    const preview = cardByEntryId(page, 'popover').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('button', { hasText: 'Open' })).toBeVisible()
  })

  test('clicking trigger opens popover content', async ({ page }) => {
    const preview = cardByEntryId(page, 'popover').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await preview.locator('button', { hasText: 'Open' }).click()
    // Popover content is rendered in a portal
    await expect(page.locator('[role="dialog"]').first()).toBeVisible()
    await page.keyboard.press('Escape')
  })
})
