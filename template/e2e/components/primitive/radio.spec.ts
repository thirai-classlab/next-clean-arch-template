/**
 * Component Gallery — Primitive / RadioGroup smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — RadioGroup card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'radio')).toBeVisible()
  })

  test('preview renders radio group', async ({ page }) => {
    const preview = cardByEntryId(page, 'radio').getByTestId('component-card-preview')
    const group = preview.locator('[role="radiogroup"]').first()
    await group.scrollIntoViewIfNeeded()
    await expect(group).toBeVisible()
  })

  test('radio items are present', async ({ page }) => {
    const preview = cardByEntryId(page, 'radio').getByTestId('component-card-preview')
    const radios = preview.locator('[role="radio"]')
    await expect(radios).toHaveCount(2)
  })
})
