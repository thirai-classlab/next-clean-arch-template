/**
 * Component Gallery — Primitive / IconButton smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — IconButton card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'icon-button')).toBeVisible()
  })

  test('preview renders button with aria-label', async ({ page }) => {
    const preview = cardByEntryId(page, 'icon-button').getByTestId('component-card-preview')
    const btn = preview.locator('button[aria-label]').first()
    await btn.scrollIntoViewIfNeeded()
    await expect(btn).toBeVisible()
    // IconButton requires aria-label for accessibility
    const label = await btn.getAttribute('aria-label')
    expect(label).toBeTruthy()
  })

  test('snippet references IconButton', async ({ page }) => {
    await expect(cardByEntryId(page, 'icon-button').getByTestId('component-card-snippet')).toContainText('IconButton')
  })
})
