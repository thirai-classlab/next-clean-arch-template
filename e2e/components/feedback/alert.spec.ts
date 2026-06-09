/**
 * Component Gallery — Feedback / Alert smoke spec (task-4 Step 4,
 * extended in task-30 Step 5b for the 4-variant parallel demo).
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Alert card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'alert')).toBeVisible()
  })

  test('preview renders element with role=alert', async ({ page }) => {
    const preview = cardByEntryId(page, 'alert').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('[role="alert"]').first()).toBeVisible()
  })

  test('renders all four semantic variants in parallel', async ({ page }) => {
    const preview = cardByEntryId(page, 'alert').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    // Each variant carries data-variant for deterministic targeting.
    for (const variant of ['info', 'success', 'warning', 'danger'] as const) {
      await expect(preview.locator(`[role="alert"][data-variant="${variant}"]`)).toHaveCount(1)
    }
  })

  test('maps aria-live per urgency (polite vs assertive)', async ({ page }) => {
    const preview = cardByEntryId(page, 'alert').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    // info / success are non-urgent → polite; warning / danger → assertive.
    await expect(preview.locator('[data-variant="info"]')).toHaveAttribute('aria-live', 'polite')
    await expect(preview.locator('[data-variant="success"]')).toHaveAttribute('aria-live', 'polite')
    await expect(preview.locator('[data-variant="warning"]')).toHaveAttribute('aria-live', 'assertive')
    await expect(preview.locator('[data-variant="danger"]')).toHaveAttribute('aria-live', 'assertive')
  })

  test('alert preview shows title text', async ({ page }) => {
    const preview = cardByEntryId(page, 'alert').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview).toContainText('Heads up')
  })
})
