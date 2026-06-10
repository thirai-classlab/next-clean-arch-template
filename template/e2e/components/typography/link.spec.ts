/**
 * Component Gallery — Typography / Link smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Link card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'link')).toBeVisible()
  })

  test('preview renders an anchor element', async ({ page }) => {
    const preview = cardByEntryId(page, 'link').getByTestId('component-card-preview')
    await expect(preview).toBeVisible()
    await expect(preview.locator('a').first()).toBeVisible()
  })

  test('snippet references Link component', async ({ page }) => {
    const snippet = cardByEntryId(page, 'link').getByTestId('component-card-snippet')
    await expect(snippet).toContainText('Link')
  })
})
