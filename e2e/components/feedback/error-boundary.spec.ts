/**
 * Component Gallery — Feedback / ErrorBoundary smoke spec (task-4 Step 4,
 * extended in task-30 Step 5b for the interactive throw / fallback / reset demo).
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — ErrorBoundary card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'error-boundary')).toBeVisible()
  })

  test('preview renders children without error in the healthy state', async ({ page }) => {
    const preview = cardByEntryId(page, 'error-boundary').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()
    // Healthy state: ThrowOnDemand renders the children copy, no fallback.
    await expect(preview).toContainText('Children render normally')
    await expect(preview.locator('[role="alert"]')).toHaveCount(0)
  })

  test('toggling the throw switch shows the danger fallback Alert + retry', async ({ page }) => {
    const preview = cardByEntryId(page, 'error-boundary').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()

    // Flip the "Throw render error" switch → boundary catches → danger fallback.
    await preview.getByText('Throw render error').click()

    const fallback = preview.locator('[role="alert"][data-variant="danger"]')
    await expect(fallback).toBeVisible()
    await expect(fallback).toContainText('エラーが発生しました')
    await expect(fallback.getByRole('button', { name: '再試行' })).toBeVisible()
  })

  test('toggling the switch off and clicking retry restores children', async ({ page }) => {
    const preview = cardByEntryId(page, 'error-boundary').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()

    // Throw → wait until fallback alert is visible before proceeding.
    await preview.getByText('Throw render error').click()
    await expect(preview.locator('[role="alert"][data-variant="danger"]')).toBeVisible()

    // Turn the switch back off — wait until the retry button is still present
    // (boundary is still in error state, switch toggle alone doesn't clear it).
    await preview.getByText('Throw render error').click()
    await expect(preview.getByRole('button', { name: '再試行' })).toBeVisible()

    // Click retry and deterministically wait for the children to re-appear and
    // the alert to be gone — avoids a race between setState and React re-render.
    await preview.getByRole('button', { name: '再試行' }).click()
    await expect(preview).toContainText('Children render normally')
    await expect(preview.locator('[role="alert"]')).toHaveCount(0)
  })

  test('snippet references ErrorBoundary', async ({ page }) => {
    await expect(
      cardByEntryId(page, 'error-boundary').getByTestId('component-card-snippet'),
    ).toContainText('ErrorBoundary')
  })
})
