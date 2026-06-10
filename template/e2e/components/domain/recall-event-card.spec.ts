/**
 * Component Gallery — Domain / RecallEventCard smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — RecallEventCard card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'recall-event-card')).toBeVisible()
  })

  test('preview renders event card content', async ({ page }) => {
    const preview = cardByEntryId(page, 'recall-event-card').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toBeVisible()
    await expect(preview).not.toBeEmpty()
  })

  test('snippet references RecallEventCard', async ({ page }) => {
    await expect(cardByEntryId(page, 'recall-event-card').getByTestId('component-card-snippet')).toContainText('RecallEventCard')
  })
})
