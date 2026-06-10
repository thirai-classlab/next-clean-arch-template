/**
 * Component Gallery — Primitive / Switch smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Switch card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'switch')).toBeVisible()
  })

  test('preview renders switch with role=switch', async ({ page }) => {
    const preview = cardByEntryId(page, 'switch').getByTestId('component-card-preview')
    const sw = preview.locator('button[role="switch"]').first()
    await sw.scrollIntoViewIfNeeded()
    await sw.waitFor({ state: 'attached' })
    await expect(sw).toHaveAttribute('role', 'switch')
  })

  test('switch toggles on click', async ({ page }) => {
    const sw = cardByEntryId(page, 'switch').getByTestId('component-card-preview').locator('button[role="switch"]').first()
    await sw.scrollIntoViewIfNeeded()
    await expect(sw).toHaveAttribute('data-state', 'unchecked')
    await sw.dispatchEvent('click')
    await expect(sw).toHaveAttribute('data-state', 'checked')
  })
})
