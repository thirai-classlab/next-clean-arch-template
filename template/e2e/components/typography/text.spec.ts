/**
 * Component Gallery — Typography / Text smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Text card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'text')).toBeVisible()
  })

  test('preview renders text content', async ({ page }) => {
    const preview = cardByEntryId(page, 'text').getByTestId('component-card-preview')
    await expect(preview).toBeVisible()
    await expect(preview).toContainText('quick brown fox')
  })

  test('snippet references Text component', async ({ page }) => {
    const snippet = cardByEntryId(page, 'text').getByTestId('component-card-snippet')
    await expect(snippet).toContainText('Text')
  })
})
