/**
 * Component Gallery — Composite / Form smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Form card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'form')).toBeVisible()
  })

  test('preview renders a form element', async ({ page }) => {
    const preview = cardByEntryId(page, 'form').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('form').first()).toBeVisible()
  })

  test('form preview contains an input', async ({ page }) => {
    const preview = cardByEntryId(page, 'form').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('input').first()).toBeVisible()
  })
})
