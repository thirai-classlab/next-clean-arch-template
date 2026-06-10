/**
 * Component Gallery — Typography / Code smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Code card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'code')).toBeVisible()
  })

  test('preview renders code element', async ({ page }) => {
    const preview = cardByEntryId(page, 'code').getByTestId('component-card-preview')
    await expect(preview).toBeVisible()
    // The Code component renders a <code> element
    await expect(preview.locator('code').first()).toBeVisible()
  })

  test('snippet references Code component', async ({ page }) => {
    const snippet = cardByEntryId(page, 'code').getByTestId('component-card-snippet')
    await expect(snippet).toContainText('Code')
  })
})
