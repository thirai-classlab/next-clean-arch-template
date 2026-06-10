/**
 * Component Gallery — Feedback / Skeleton smoke spec (task-30 Step 5b).
 *
 * Skeleton is a new Chakra v3 feedback wrapper (rectangle) plus the SkeletonText
 * (multi-line) and SkeletonCircle (avatar) variants. The gallery preview mounts
 * all three; this spec asserts they render and are visible. The pulse animation
 * is applied via the Chakra `pulse` recipe variant (CSS animation, no stable
 * data-* hook), so we assert presence + visibility rather than the keyframe.
 */
import { test, expect } from '@playwright/test'
import { gotoGallery, cardByEntryId } from '../_helpers'

test.describe('Gallery — Skeleton card', () => {
  test.beforeEach(async ({ page }) => {
    await gotoGallery(page)
  })

  test('component card is visible', async ({ page }) => {
    await expect(cardByEntryId(page, 'skeleton')).toBeVisible()
  })

  test('preview renders rectangle, text and circle skeletons', async ({ page }) => {
    const preview = cardByEntryId(page, 'skeleton').getByTestId('component-card-preview')
    await preview.scrollIntoViewIfNeeded()

    // Rectangular placeholder.
    await expect(preview.getByTestId('skeleton-rect')).toBeVisible()
    // SkeletonCircle (avatar placeholder).
    await expect(preview.getByTestId('skeleton-circle')).toBeVisible()
    // SkeletonText spreads data-testid onto each generated line → assert >= 1.
    const textLines = preview.getByTestId('skeleton-text')
    expect(await textLines.count()).toBeGreaterThanOrEqual(1)
    await expect(textLines.first()).toBeVisible()
  })

  test('snippet references Skeleton variants', async ({ page }) => {
    const snippet = cardByEntryId(page, 'skeleton').getByTestId('component-card-snippet')
    await expect(snippet).toContainText('SkeletonText')
    await expect(snippet).toContainText('SkeletonCircle')
  })
})
