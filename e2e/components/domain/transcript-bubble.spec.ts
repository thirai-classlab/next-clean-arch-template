/**
 * Component Gallery — Domain / TranscriptBubble smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — TranscriptBubble card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'transcript-bubble')).toBeVisible()
  })

  test('preview shows transcript text', async ({ page }) => {
    const preview = cardByEntryId(page, 'transcript-bubble').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('transcript segment')
  })

  test('preview shows speaker label', async ({ page }) => {
    const preview = cardByEntryId(page, 'transcript-bubble').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('Speaker A')
  })
})
