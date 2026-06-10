/**
 * Component Gallery — Composite / Tooltip smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Tooltip card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'tooltip')).toBeVisible()
  })

  test('preview renders the trigger button', async ({ page }) => {
    const preview = cardByEntryId(page, 'tooltip').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('button', { hasText: 'Hover me' })).toBeVisible()
  })

  test('hovering trigger shows tooltip content', async ({ page }) => {
    const preview = cardByEntryId(page, 'tooltip').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    const trigger = preview.locator('button', { hasText: 'Hover me' })
    await trigger.hover()
    // Tooltip content has role="tooltip"
    const tooltip = page.locator('[role="tooltip"]').first()
    await tooltip.waitFor({ state: 'visible', timeout: 3000 })
    await expect(tooltip).toContainText('Save')
  })
})
