/**
 * Component Gallery — Composite / Tabs smoke spec (task-4 Step 4)
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Tabs card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'tabs')).toBeVisible()
  })

  test('preview renders tablist', async ({ page }) => {
    const preview = cardByEntryId(page, 'tabs').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await expect(preview.locator('[role="tablist"]').first()).toBeVisible()
  })

  test('clicking second tab shows second panel', async ({ page }) => {
    const preview = cardByEntryId(page, 'tabs').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    await preview.getByRole('tab', { name: 'Beta' }).click()
    // Wait for Beta tabpanel to become active (data-state="active")
    const betaPanel = preview.locator('[role="tabpanel"][data-state="active"]')
    await betaPanel.waitFor({ state: 'visible' })
    await expect(betaPanel).toContainText('Beta panel')
  })
})
