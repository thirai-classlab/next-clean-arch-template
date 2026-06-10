/**
 * Component Gallery — Primitive / Textarea smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Textarea card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'textarea')).toBeVisible()
  })

  test('preview renders a textarea element', async ({ page }) => {
    const preview = cardByEntryId(page, 'textarea').getByTestId('component-card-preview')
    const ta = preview.locator('textarea').first()
    await ta.scrollIntoViewIfNeeded()
    await expect(ta).toBeVisible()
  })

  test('textarea accepts typed text', async ({ page }) => {
    const ta = cardByEntryId(page, 'textarea').getByTestId('component-card-preview').locator('textarea').first()
    await ta.scrollIntoViewIfNeeded()
    await ta.fill('Line one\nLine two')
    await expect(ta).toHaveValue('Line one\nLine two')
  })
})
