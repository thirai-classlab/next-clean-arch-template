/**
 * Component Gallery — Primitive / Select smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Select card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'select')).toBeVisible()
  })

  test('preview renders select trigger button', async ({ page }) => {
    const preview = cardByEntryId(page, 'select').getByTestId('component-card-preview')
    const trigger = preview.locator('button[role="combobox"]').first()
    await trigger.scrollIntoViewIfNeeded()
    await expect(trigger).toBeVisible()
  })

  test('opens select dropdown and shows options', async ({ page }) => {
    const preview = cardByEntryId(page, 'select').getByTestId('component-card-preview')
    const trigger = preview.locator('button[role="combobox"]').first()
    await trigger.scrollIntoViewIfNeeded()
    await trigger.click()
    const option = page.locator('[role="option"]', { hasText: 'Alpha' })
    await expect(option).toBeVisible()
    // Close by pressing Escape
    await page.keyboard.press('Escape')
  })
})
