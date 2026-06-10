/**
 * Component Gallery — Primitive / Checkbox smoke spec (task-4 Step 4)
 *
 * Named card.spec.ts to align with the spec directory plan;
 * the 8th primitive is Checkbox (id="checkbox") per component-catalog.ts.
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Checkbox card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'checkbox')).toBeVisible()
  })

  test('preview renders checkbox button', async ({ page }) => {
    const card = cardByEntryId(page, 'checkbox')
    await card.scrollIntoViewIfNeeded()
    const cb = card.getByTestId('component-card-preview').locator('button[role="checkbox"]').first()
    // Checkbox may be clipped by parent overflow — use waitFor+attached like primitive.spec.ts
    await cb.waitFor({ state: 'attached' })
    await expect(cb).toHaveAttribute('role', 'checkbox')
  })

  test('checkbox renders in unchecked state by default', async ({ page }) => {
    const card = cardByEntryId(page, 'checkbox')
    await card.scrollIntoViewIfNeeded()
    const cb = card.getByTestId('component-card-preview').locator('button[role="checkbox"]').first()
    await cb.waitFor({ state: 'attached' })
    // Verify initial aria-checked is false (default uncontrolled state)
    await expect(cb).toHaveAttribute('aria-checked', 'false')
  })
})
