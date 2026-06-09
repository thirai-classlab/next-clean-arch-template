/**
 * Component Gallery — Feedback / EmptyState smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — EmptyState card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'empty-state')).toBeVisible()
  })

  test('preview shows title text', async ({ page }) => {
    const preview = cardByEntryId(page, 'empty-state').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('No bots yet')
  })

  test('preview shows description text', async ({ page }) => {
    const preview = cardByEntryId(page, 'empty-state').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('Create one')
  })
})
