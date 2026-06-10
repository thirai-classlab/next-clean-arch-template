/**
 * Component Gallery — Primitive / Input smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Input card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'input')).toBeVisible()
  })

  test('preview renders an input element', async ({ page }) => {
    const preview = cardByEntryId(page, 'input').getByTestId('component-card-preview')
    const input = preview.locator('input').first()
    await input.scrollIntoViewIfNeeded()
    await expect(input).toBeVisible()
  })

  test('input accepts typed text', async ({ page }) => {
    const input = cardByEntryId(page, 'input').getByTestId('component-card-preview').locator('input').first()
    await input.scrollIntoViewIfNeeded()
    await input.fill('test value')
    await expect(input).toHaveValue('test value')
  })
})
